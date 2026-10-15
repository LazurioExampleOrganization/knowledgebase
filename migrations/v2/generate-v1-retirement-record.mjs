import { execFile } from 'node:child_process'
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const defaultModuleRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const targetContractRelativePath = 'data/v2/v2-target.json'
const recordRelativePath = 'data/v2/migration-records/v1-runtime-retirement.json'

function isSafeRelativePath(relativePath) {
  return (
    typeof relativePath === 'string' &&
    relativePath.length > 0 &&
    !relativePath.includes('\\') &&
    !relativePath.includes(':') &&
    !path.posix.isAbsolute(relativePath) &&
    path.posix.normalize(relativePath) === relativePath &&
    relativePath !== '..' &&
    !relativePath.startsWith('../')
  )
}

async function statOrNull(targetPath) {
  return lstat(targetPath).catch((error) => {
    if (error?.code === 'ENOENT') return null
    throw error
  })
}

async function assertRealFile(root, relativePath) {
  let currentPath = root
  for (const segment of relativePath.split('/')) {
    currentPath = path.join(currentPath, segment)
    const currentStat = await statOrNull(currentPath)
    if (!currentStat) throw new Error(`Missing file: ${relativePath}`)
    if (currentStat.isSymbolicLink()) throw new Error(`Refusing a symlinked file: ${relativePath}`)
  }
  if (!(await lstat(currentPath)).isFile()) throw new Error(`Expected a real file: ${relativePath}`)
  return currentPath
}

function isSafePrefix(prefix, { allowEmpty = false } = {}) {
  if (allowEmpty && prefix === '') return true
  return typeof prefix === 'string' && prefix.endsWith('/') && isSafeRelativePath(prefix.slice(0, -1))
}

async function readRetirementTargetMap(root, relativePath) {
  const mapPath = await assertRealFile(root, relativePath)
  const targetMap = JSON.parse(await readFile(mapPath, 'utf8'))
  if (targetMap.schema_version !== 'lazurio.knowledgebase.retirement_target_map.v1') {
    throw new Error(`${relativePath} does not declare the retirement target map schema`)
  }
  const overrides = targetMap.overrides ?? []
  const rules = targetMap.rules ?? []
  if (!Array.isArray(overrides) || !Array.isArray(rules)) {
    throw new Error(`${relativePath} overrides and rules must be arrays`)
  }
  for (const override of overrides) {
    if (
      !override ||
      !isSafeRelativePath(override.source) ||
      !Array.isArray(override.targets) ||
      override.targets.length === 0 ||
      !override.targets.every(isSafeRelativePath)
    ) {
      throw new Error(`${relativePath} contains an invalid exact override`)
    }
  }
  if (new Set(overrides.map((override) => override.source)).size !== overrides.length) {
    throw new Error(`${relativePath} contains duplicate exact overrides`)
  }
  for (const rule of rules) {
    if (
      !rule ||
      !isSafePrefix(rule.source_prefix, { allowEmpty: true }) ||
      !isSafePrefix(rule.target_prefix)
    ) {
      throw new Error(`${relativePath} contains an invalid prefix rule`)
    }
  }
  return { overrides, rules, relativePath }
}

function targetsForMappedSource(source, targetMap) {
  const override = targetMap.overrides.find((candidate) => candidate.source === source)
  if (override) return override.targets

  const matchingRules = targetMap.rules
    .filter((rule) => source.startsWith(rule.source_prefix))
    .sort((left, right) => right.source_prefix.length - left.source_prefix.length)
  if (matchingRules.length === 0) {
    throw new Error(`${targetMap.relativePath} does not map legacy source: ${source}`)
  }
  if (
    matchingRules.length > 1 &&
    matchingRules[0].source_prefix.length === matchingRules[1].source_prefix.length
  ) {
    throw new Error(`${targetMap.relativePath} maps legacy source ambiguously: ${source}`)
  }
  const rule = matchingRules[0]
  const target = `${rule.target_prefix}${source.slice(rule.source_prefix.length)}`
  if (!isSafeRelativePath(target)) {
    throw new Error(`${targetMap.relativePath} produced an unsafe target for: ${source}`)
  }
  return [target]
}

async function runGit(root, argumentsList, { buffer = false } = {}) {
  const { stdout } = await execFileAsync('git', argumentsList, {
    cwd: root,
    encoding: buffer ? null : 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  })
  if (buffer) return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout)
  return stdout
}

async function readCanonicalTargetBytes(root, relativePath) {
  const workingTreePath = await assertRealFile(root, relativePath)
  try {
    await runGit(root, ['diff', '--quiet', '--', relativePath])
  } catch {
    return readFile(workingTreePath)
  }
  try {
    return await runGit(root, ['cat-file', 'blob', `:${relativePath}`], { buffer: true })
  } catch {
    return readFile(workingTreePath)
  }
}

async function assertExactSourceRef(root, sourceRef) {
  if (!/^[0-9a-f]{40}$/.test(sourceRef)) {
    throw new Error('--source-ref must be an exact 40-character lowercase Git commit')
  }
  let resolved
  try {
    resolved = (await runGit(root, ['rev-parse', `${sourceRef}^{commit}`])).trim()
  } catch {
    throw new Error(`Source ref is not an available Git commit: ${sourceRef}`)
  }
  if (resolved !== sourceRef) throw new Error(`Source ref did not resolve exactly: ${sourceRef}`)
  try {
    await runGit(root, ['merge-base', '--is-ancestor', sourceRef, 'HEAD'])
  } catch {
    throw new Error(`Source ref is not an ancestor of HEAD: ${sourceRef}`)
  }
}

async function sourceFilesAtCommit(root, sourceRef, sourceCorpus, { markdownOnly = false } = {}) {
  const tree = await runGit(root, ['ls-tree', '-r', '-z', sourceRef, '--', sourceCorpus])
  const prefix = `${sourceCorpus}/`
  const files = []
  for (const entry of tree.split('\0').filter(Boolean)) {
    const separator = entry.indexOf('\t')
    const [mode, objectType] = entry.slice(0, separator).split(' ')
    const repositoryPath = entry.slice(separator + 1)
    if (!repositoryPath.startsWith(prefix)) continue
    if (markdownOnly && !/\.mdx?$/i.test(repositoryPath)) continue
    if (objectType !== 'blob' || !['100644', '100755'].includes(mode)) {
      throw new Error(`Legacy corpus contains a non-regular Git file: ${repositoryPath}`)
    }
    files.push(repositoryPath.slice(prefix.length))
  }
  return files.sort((left, right) => left.localeCompare(right, 'en'))
}

async function pathExistsAtCommit(root, sourceRef, relativePath) {
  try {
    await runGit(root, ['cat-file', '-e', `${sourceRef}:${relativePath}`])
    return true
  } catch {
    return false
  }
}

async function compareCorpus({
  root,
  sourceRef,
  sourceCorpus,
  targetCorpus,
  markdownOnly,
  allowNewerTargets,
  targetMap = null,
}) {
  const sourceFiles = await sourceFilesAtCommit(root, sourceRef, sourceCorpus, { markdownOnly })
  if (targetMap) {
    const superseded = []
    const newer = []
    for (const relativePath of sourceFiles) {
      const targets = targetsForMappedSource(relativePath, targetMap)
      const sourceBytes = await runGit(
        root,
        ['cat-file', 'blob', `${sourceRef}:${sourceCorpus}/${relativePath}`],
        { buffer: true },
      )
      const targetBytes = await Promise.all(
        targets.map((target) => readCanonicalTargetBytes(root, target)),
      )
      const identical = targetBytes.some((target) => sourceBytes.equals(target))
      if (!identical) newer.push(relativePath)
      superseded.push({
        source: relativePath,
        targets,
        byte_status: identical ? 'identical' : 'newer-v2',
      })
    }
    if (newer.length > 0 && !allowNewerTargets) {
      throw new Error(
        `Mapped v2 targets differ from the rollback commit: ${newer.join(', ')}. Review them and rerun with --allow-newer-targets only when v2 is intentionally newer.`,
      )
    }
    return {
      sourceFiles,
      mapping: {
        identical_same_path: [],
        newer_v2_same_path: [],
        migrated_to_same_path: [],
        superseded,
      },
    }
  }
  const migrated = []
  const newer = []
  const missing = []

  for (const relativePath of sourceFiles) {
    const targetRelativePath = path.posix.join(targetCorpus, relativePath)
    try {
      await assertRealFile(root, targetRelativePath)
    } catch {
      missing.push(relativePath)
      continue
    }
    const [sourceBytes, targetBytes] = await Promise.all([
      runGit(root, ['cat-file', 'blob', `${sourceRef}:${sourceCorpus}/${relativePath}`], {
        buffer: true,
      }),
      readCanonicalTargetBytes(root, targetRelativePath),
    ])
    if (sourceBytes.equals(targetBytes)) migrated.push(relativePath)
    else newer.push(relativePath)
  }

  if (missing.length > 0) {
    throw new Error(
      `Retirement record cannot be generated because v2 targets are missing: ${missing.join(', ')}`,
    )
  }
  if (newer.length > 0 && !allowNewerTargets) {
    throw new Error(
      `V2 targets differ from the rollback commit: ${newer.join(', ')}. Review them and rerun with --allow-newer-targets only when v2 is intentionally newer.`,
    )
  }

  return {
    sourceFiles,
    mapping: {
      identical_same_path: [],
      newer_v2_same_path: allowNewerTargets ? newer : [],
      migrated_to_same_path: migrated,
      superseded: [],
    },
  }
}

async function readTargetContract(root) {
  const contractPath = await assertRealFile(root, targetContractRelativePath)
  const contract = JSON.parse(await readFile(contractPath, 'utf8'))
  if (contract.schema_version !== 'lazurio.knowledgebase.v2_only_target.v1') {
    throw new Error(`${targetContractRelativePath} does not declare the v2-only target schema`)
  }
  for (const field of [
    'page_source_corpus',
    'page_target_corpus',
    'public_source_corpus',
    'public_target_corpus',
  ]) {
    if (!isSafeRelativePath(contract.retirement?.[field])) {
      throw new Error(`Invalid target contract retirement.${field}`)
    }
  }
  return contract
}

export async function generateV1RetirementRecord({
  moduleRoot = defaultModuleRoot,
  sourceRef,
  reviewedAt,
  allowNewerTargets = false,
  apply = false,
} = {}) {
  const root = path.resolve(moduleRoot)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt ?? '')) {
    throw new Error('--reviewed-at must use YYYY-MM-DD')
  }
  await assertExactSourceRef(root, sourceRef)
  const contract = await readTargetContract(root)
  const retirement = contract.retirement
  const publicTargetMap = retirement.public_target_map
    ? await readRetirementTargetMap(root, retirement.public_target_map)
    : null

  const [pages, publicAssets] = await Promise.all([
    compareCorpus({
      root,
      sourceRef,
      sourceCorpus: retirement.page_source_corpus,
      targetCorpus: retirement.page_target_corpus,
      markdownOnly: true,
      allowNewerTargets,
    }),
    compareCorpus({
      root,
      sourceRef,
      sourceCorpus: retirement.public_source_corpus,
      targetCorpus: retirement.public_target_corpus,
      markdownOnly: false,
      allowNewerTargets,
      targetMap: publicTargetMap,
    }),
  ])

  const record = {
    schema_version: 'lazurio.knowledgebase.v1_retirement.v1',
    source_ref: sourceRef,
    target_version: 'v2',
    reviewed_at: reviewedAt,
    source_page_count: pages.sourceFiles.length,
    source_corpus: retirement.page_source_corpus,
    target_corpus: retirement.page_target_corpus,
    ...pages.mapping,
    public_assets: {
      source_file_count: publicAssets.sourceFiles.length,
      source_corpus: retirement.public_source_corpus,
      target_corpus: retirement.public_target_corpus,
      ...publicAssets.mapping,
    },
    removed_runtime_paths: (
      await Promise.all(
        ['app/v1', 'editor/v1'].map(async (relativePath) => [
          relativePath,
          await pathExistsAtCommit(root, sourceRef, relativePath),
        ]),
      )
    )
      .filter(([, exists]) => exists)
      .map(([relativePath]) => relativePath),
    rollback: {
      strategy: 'git-source-ref',
      source_ref: sourceRef,
      instructions:
        'Revert the cutover commit or restore the removed paths from source_ref; do not keep two active runtime targets.',
    },
  }

  const sourceSidebar = retirement.page_source_corpus.replace(/\/content\/docs$/, '/sidebar.ts')
  if (
    sourceSidebar !== retirement.page_source_corpus &&
    (await pathExistsAtCommit(root, sourceRef, sourceSidebar)) &&
    (await statOrNull(path.join(root, 'data/v2/sidebar.ts')))?.isFile()
  ) {
    record.navigation = {
      source: sourceSidebar,
      disposition: 'superseded-by-v2',
      target: 'data/v2/sidebar.ts',
    }
  }

  const serialized = `${JSON.stringify(record, null, 2)}\n`
  if (apply) {
    const recordPath = path.join(root, recordRelativePath)
    if (await statOrNull(recordPath)) {
      throw new Error(`${recordRelativePath} already exists; review or remove it explicitly`)
    }
    await mkdir(path.dirname(recordPath), { recursive: true })
    await writeFile(recordPath, serialized, { flag: 'wx' })
  }
  return { record, serialized, applied: apply, recordPath: path.join(root, recordRelativePath) }
}

function parseArguments(argumentsList) {
  const result = { apply: false, allowNewerTargets: false }
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index]
    if (argument === '--apply') result.apply = true
    else if (argument === '--allow-newer-targets') result.allowNewerTargets = true
    else if (argument === '--source-ref') result.sourceRef = argumentsList[++index]
    else if (argument === '--reviewed-at') result.reviewedAt = argumentsList[++index]
    else if (argument === '--module-root') result.moduleRoot = argumentsList[++index]
    else throw new Error(`Unknown argument: ${argument}`)
  }
  return result
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  try {
    const result = await generateV1RetirementRecord(parseArguments(process.argv.slice(2)))
    if (result.applied) console.log(`Retirement record written: ${result.recordPath}`)
    else process.stdout.write(result.serialized)
    console.error(
      `Compared ${result.record.source_page_count} pages and ${result.record.public_assets.source_file_count} public files.`,
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
