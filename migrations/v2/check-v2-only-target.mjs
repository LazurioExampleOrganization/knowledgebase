import { execFile } from 'node:child_process'
import { lstat, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const defaultModuleRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const targetContractRelativePath = 'data/v2/v2-target.json'
const forbiddenLegacyTargets = ['app/v1', 'editor/v1']
const shellFencePattern = /```(?:bash|sh|shell|zsh)\s*\r?\n([\s\S]*?)```/gi
const legacyRuntimeCommandPattern =
  /(?:^|[ \t])(?:\.\/)?(?:knowledgebase\/)?app\/v1(?=\/|[ \t\r]|$)/m

async function statOrNull(targetPath) {
  return lstat(targetPath).catch((error) => {
    if (error?.code === 'ENOENT') return null
    throw error
  })
}

async function statWithoutSymlinkedSegments(root, relativePath) {
  let currentPath = root
  let currentStat = null
  for (const segment of relativePath.split('/')) {
    currentPath = path.join(currentPath, segment)
    currentStat = await statOrNull(currentPath)
    if (!currentStat || currentStat.isSymbolicLink()) {
      return { stat: currentStat, safe: false }
    }
  }
  return { stat: currentStat, safe: true }
}

async function canonicalV2HomePages(root, targetCorpus) {
  const { stat, safe } = await statWithoutSymlinkedSegments(root, targetCorpus)
  if (!safe || !stat?.isDirectory()) return []

  const corpusRoot = path.join(root, ...targetCorpus.split('/'))
  const indexPages = []

  async function walk(relativeDirectory = '') {
    const directoryPath = relativeDirectory
      ? path.join(corpusRoot, ...relativeDirectory.split('/'))
      : corpusRoot
    const entries = await readdir(directoryPath, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const relativeEntry = relativeDirectory
        ? path.posix.join(relativeDirectory, entry.name)
        : entry.name
      if (entry.isDirectory()) {
        await walk(relativeEntry)
      } else if (entry.isFile() && /^index\.mdx?$/i.test(entry.name)) {
        indexPages.push(relativeEntry)
      }
    }
  }

  await walk()
  if (indexPages.length === 0) return []
  const homeDepth = Math.min(...indexPages.map((relativePath) => relativePath.split('/').length))
  return indexPages
    .filter((relativePath) => relativePath.split('/').length === homeDepth)
    .map((relativePath) => path.posix.join(targetCorpus, relativePath))
}

async function validateV2HomeRuntimeCommands(root, targetContract, errors) {
  const targetCorpus = targetContract.retirement?.page_target_corpus
  if (!isSafeRelativePath(targetCorpus)) return

  try {
    for (const relativePath of await canonicalV2HomePages(root, targetCorpus)) {
      const markdown = await readFile(path.join(root, ...relativePath.split('/')), 'utf8')
      const shellBlocks = [...markdown.matchAll(shellFencePattern)].map((match) => match[1])
      if (shellBlocks.some((block) => legacyRuntimeCommandPattern.test(block))) {
        errors.push(
          `${relativePath} contains an operational shell command for removed runtime app/v1`,
        )
      }
    }
  } catch (error) {
    errors.push(`v2 home-page runtime commands could not be checked: ${error.message}`)
  }
}

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

function normalizedStringArray(value, label, errors) {
  if (!Array.isArray(value) || !value.every(isSafeRelativePath)) {
    errors.push(`${label} must contain normalized relative POSIX paths`)
    return []
  }
  if (new Set(value).size !== value.length) {
    errors.push(`${label} must not contain duplicate paths`)
  }
  return value
}

async function readTargetContract(root, errors) {
  const { stat, safe } = await statWithoutSymlinkedSegments(root, targetContractRelativePath)
  if (!safe || !stat?.isFile()) {
    errors.push(`${targetContractRelativePath} must be a real file`)
    return null
  }

  try {
    const contract = JSON.parse(
      await readFile(path.join(root, targetContractRelativePath), 'utf8'),
    )
    if (contract.schema_version !== 'lazurio.knowledgebase.v2_only_target.v1') {
      errors.push(`${targetContractRelativePath} must declare the v2-only target schema`)
    }
    if (!['authored-h1', 'frontmatter-title', 'custom'].includes(contract.content_title_mode)) {
      errors.push(
        `${targetContractRelativePath} content_title_mode must be authored-h1, frontmatter-title or custom`,
      )
    }
    if (contract.content_title_mode === 'custom' && contract.data_contract !== null) {
      errors.push(`${targetContractRelativePath} custom title mode requires a custom data contract`)
    }
    contract.required_directories = normalizedStringArray(
      contract.required_directories,
      'v2 target required_directories',
      errors,
    )
    contract.required_files = normalizedStringArray(
      contract.required_files,
      'v2 target required_files',
      errors,
    )
    for (const forbiddenPath of forbiddenLegacyTargets) {
      if (
        contract.required_directories.some(
          (candidate) => candidate === forbiddenPath || candidate.startsWith(`${forbiddenPath}/`),
        )
      ) {
        errors.push(`v2 target contract cannot require legacy path ${forbiddenPath}`)
      }
    }

    const dataContract = contract.data_contract
    if (
      dataContract !== null &&
      (!dataContract ||
        !isSafeRelativePath(dataContract.path) ||
        typeof dataContract.schema_version !== 'string' ||
        dataContract.schema_version.length === 0)
    ) {
      errors.push('v2 target data_contract must be null or declare a safe path and schema_version')
    }

    const retirement = contract.retirement
    for (const field of [
      'page_source_corpus',
      'page_target_corpus',
      'public_source_corpus',
      'public_target_corpus',
    ]) {
      if (!isSafeRelativePath(retirement?.[field])) {
        errors.push(`v2 target retirement.${field} must be a normalized relative POSIX path`)
      }
    }
    if (
      retirement?.public_target_map !== undefined &&
      !isSafeRelativePath(retirement.public_target_map)
    ) {
      errors.push('v2 target retirement.public_target_map must be a normalized relative POSIX path')
    }
    if (retirement?.public_target_map && retirement.public_target_corpus !== '.') {
      errors.push('v2 target retirement.public_target_map requires public_target_corpus to be .')
    }
    return contract
  } catch (error) {
    errors.push(`${targetContractRelativePath} is invalid: ${error.message}`)
    return null
  }
}

async function runGit(root, argumentsList) {
  const { stdout } = await execFileAsync('git', argumentsList, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  })
  return stdout
}

async function runGitBuffer(root, argumentsList) {
  const { stdout } = await execFileAsync('git', argumentsList, {
    cwd: root,
    encoding: null,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  })
  return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout)
}

async function readCanonicalTargetBytes(root, relativePath) {
  const workingTreePath = path.join(root, relativePath)
  try {
    await runGit(root, ['diff', '--quiet', '--', relativePath])
  } catch {
    return readFile(workingTreePath)
  }
  try {
    return await runGitBuffer(root, ['cat-file', 'blob', `:${relativePath}`])
  } catch {
    return readFile(workingTreePath)
  }
}

async function assertSourceRef(root, sourceRef) {
  try {
    await runGit(root, ['cat-file', '-e', `${sourceRef}^{commit}`])
  } catch {
    throw new Error(`retirement record source_ref is not an available Git commit: ${sourceRef}`)
  }
  try {
    await runGit(root, ['merge-base', '--is-ancestor', sourceRef, 'HEAD'])
  } catch {
    throw new Error(`retirement record source_ref is not an ancestor of HEAD: ${sourceRef}`)
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
      throw new Error(`retirement source file is not a regular Git file: ${repositoryPath}`)
    }
    files.push(repositoryPath.slice(prefix.length))
  }
  return files.sort((left, right) => left.localeCompare(right, 'en'))
}

function mappingArrays(mapping, label, errors) {
  const result = {}
  for (const field of [
    'identical_same_path',
    'newer_v2_same_path',
    'migrated_to_same_path',
  ]) {
    const value = mapping?.[field] ?? []
    if (!Array.isArray(value)) {
      errors.push(`${label}.${field} must be an array`)
      result[field] = []
    } else {
      result[field] = value
    }
  }
  const superseded = mapping?.superseded ?? []
  if (!Array.isArray(superseded)) {
    errors.push(`${label}.superseded must be an array`)
    result.superseded = []
  } else {
    result.superseded = superseded
  }
  return result
}

async function validateCorpusMapping({
  root,
  sourceRef,
  mapping,
  label,
  countField,
  sourceCorpus,
  targetCorpus,
  actualSources,
  errors,
}) {
  const arrays = mappingArrays(mapping, label, errors)
  const samePathSources = [
    ...arrays.identical_same_path,
    ...arrays.newer_v2_same_path,
    ...arrays.migrated_to_same_path,
  ]
  const supersededSources = arrays.superseded.map((entry) => entry?.source)
  const allSources = [...samePathSources, ...supersededSources]

  if (!allSources.every(isSafeRelativePath)) {
    errors.push(`${label} source paths must be normalized relative POSIX paths`)
  }
  if (new Set(allSources).size !== allSources.length) {
    errors.push(`${label} maps one legacy source more than once`)
  }
  if (
    !Number.isInteger(mapping?.[countField]) ||
    mapping[countField] < 0 ||
    mapping[countField] !== allSources.length
  ) {
    errors.push(`${label} ${countField} does not match its mappings`)
  }

  const missingSources = actualSources.filter((source) => !allSources.includes(source))
  const unexpectedSources = allSources.filter((source) => !actualSources.includes(source))
  if (missingSources.length > 0 || unexpectedSources.length > 0) {
    errors.push(
      `${label} must exactly cover source_ref files; missing=[${missingSources.join(', ')}] unexpected=[${unexpectedSources.join(', ')}]`,
    )
  }
  if (mapping?.[countField] !== actualSources.length) {
    errors.push(`${label} ${countField} does not match source_ref`)
  }

  const invalidSuperseded = arrays.superseded.filter(
    (entry) =>
      !entry ||
      !isSafeRelativePath(entry.source) ||
      !Array.isArray(entry.targets) ||
      entry.targets.length === 0 ||
      !entry.targets.every(isSafeRelativePath) ||
      (entry.byte_status !== undefined &&
        !['identical', 'newer-v2'].includes(entry.byte_status)),
  )
  if (invalidSuperseded.length > 0) {
    errors.push(`${label} superseded entries must declare safe v2 targets`)
  }

  const targetPaths = [
    ...samePathSources,
    ...arrays.superseded.flatMap((entry) =>
      Array.isArray(entry?.targets) ? entry.targets : [],
    ),
  ]
  const byteIdenticalSources = new Set([
    ...arrays.identical_same_path,
    ...arrays.migrated_to_same_path,
  ])
  for (const targetPath of new Set(targetPaths)) {
    if (!isSafeRelativePath(targetPath)) continue
    const { stat: target, safe } = await statWithoutSymlinkedSegments(
      root,
      path.posix.join(targetCorpus, targetPath),
    )
    if (!safe || !target?.isFile()) {
      errors.push(`${label} target is missing or unsafe: ${targetPath}`)
    } else if (byteIdenticalSources.has(targetPath)) {
      try {
        const source = await runGitBuffer(root, [
          'cat-file',
          'blob',
          `${sourceRef}:${sourceCorpus}/${targetPath}`,
        ])
        const current = await readCanonicalTargetBytes(
          root,
          path.posix.join(targetCorpus, targetPath),
        )
        if (!source.equals(current)) {
          errors.push(`${label} falsely claims byte-identical content: ${targetPath}`)
        }
      } catch (error) {
        errors.push(`${label} cannot verify byte-identical content: ${error.message}`)
      }
    }
  }

  for (const entry of arrays.superseded.filter((candidate) => candidate?.byte_status === 'identical')) {
    try {
      const source = await runGitBuffer(root, [
        'cat-file',
        'blob',
        `${sourceRef}:${sourceCorpus}/${entry.source}`,
      ])
      const targetBuffers = await Promise.all(
        entry.targets.map((targetPath) =>
          readCanonicalTargetBytes(root, path.posix.join(targetCorpus, targetPath)),
        ),
      )
      if (!targetBuffers.some((target) => source.equals(target))) {
        errors.push(`${label} falsely claims byte-identical superseded content: ${entry.source}`)
      }
    } catch (error) {
      errors.push(`${label} cannot verify superseded content: ${error.message}`)
    }
  }
}

export async function checkV2OnlyTarget({
  moduleRoot = defaultModuleRoot,
  requireRetirementRecord = false,
} = {}) {
  const root = path.resolve(moduleRoot)
  const errors = []

  for (const legacyPath of forbiddenLegacyTargets) {
    if (await statOrNull(path.join(root, legacyPath))) {
      errors.push(`${legacyPath} is still present; v2 cannot be the sole runtime target`)
    }
  }

  const targetContract = await readTargetContract(root, errors)
  if (targetContract) {
    for (const relativePath of targetContract.required_directories) {
      const { stat, safe } = await statWithoutSymlinkedSegments(root, relativePath)
      if (!safe || !stat?.isDirectory()) errors.push(`${relativePath} must be a real directory`)
    }
    for (const relativePath of targetContract.required_files) {
      const { stat, safe } = await statWithoutSymlinkedSegments(root, relativePath)
      if (!safe || !stat?.isFile()) errors.push(`${relativePath} must be a real file`)
    }

    if (targetContract.data_contract) {
      const { path: manifestPath, schema_version: schemaVersion } = targetContract.data_contract
      try {
        const manifest = JSON.parse(await readFile(path.join(root, manifestPath), 'utf8'))
        if (manifest.schema_version !== schemaVersion) {
          errors.push(`${manifestPath} must declare ${schemaVersion}`)
        }
      } catch (error) {
        errors.push(`${manifestPath} is invalid: ${error.message}`)
      }
    }

    await validateV2HomeRuntimeCommands(root, targetContract, errors)
  }

  const recordPath = 'data/v2/migration-records/v1-runtime-retirement.json'
  const { stat: recordStat, safe: recordSafe } = await statWithoutSymlinkedSegments(
    root,
    recordPath,
  )
  const recordIsRealFile = recordSafe && recordStat?.isFile()
  if (requireRetirementRecord && !recordIsRealFile) {
    errors.push(`${recordPath} is required as a real file`)
  } else if (recordStat && !recordIsRealFile) {
    errors.push(`${recordPath} must be a real file`)
  }

  if (recordIsRealFile && targetContract) {
    try {
      const record = JSON.parse(await readFile(path.join(root, recordPath), 'utf8'))
      if (record.schema_version !== 'lazurio.knowledgebase.v1_retirement.v1') {
        errors.push('retirement record must declare the v1 retirement schema')
      }
      const sourceRefIsExact = /^[0-9a-f]{40}$/.test(record.source_ref ?? '')
      if (!sourceRefIsExact) errors.push('retirement record source_ref must be an exact Git commit')
      if (record.target_version !== 'v2') errors.push('retirement record must target v2')
      if (
        record.rollback?.strategy !== 'git-source-ref' ||
        record.rollback?.source_ref !== record.source_ref ||
        typeof record.rollback?.instructions !== 'string' ||
        record.rollback.instructions.trim().length === 0
      ) {
        errors.push('retirement record must declare a git-source-ref rollback')
      }

      const retirement = targetContract.retirement
      if (record.source_corpus !== retirement.page_source_corpus) {
        errors.push(`retirement record source_corpus must be ${retirement.page_source_corpus}`)
      }
      if (record.target_corpus !== retirement.page_target_corpus) {
        errors.push(`retirement record target_corpus must be ${retirement.page_target_corpus}`)
      }

      if (sourceRefIsExact) {
        try {
          await assertSourceRef(root, record.source_ref)
          const pageSources = await sourceFilesAtCommit(
            root,
            record.source_ref,
            retirement.page_source_corpus,
            { markdownOnly: true },
          )
          await validateCorpusMapping({
            root,
            sourceRef: record.source_ref,
            mapping: record,
            label: 'retirement record pages',
            countField: 'source_page_count',
            sourceCorpus: retirement.page_source_corpus,
            targetCorpus: retirement.page_target_corpus,
            actualSources: pageSources,
            errors,
          })

          const publicSources = await sourceFilesAtCommit(
            root,
            record.source_ref,
            retirement.public_source_corpus,
          )
          const publicAssets = record.public_assets
          if (publicSources.length > 0 && !publicAssets) {
            errors.push('retirement record public_assets must cover every legacy public file')
          } else if (publicAssets) {
            if (publicAssets.source_corpus !== retirement.public_source_corpus) {
              errors.push(
                `retirement record public_assets.source_corpus must be ${retirement.public_source_corpus}`,
              )
            }
            if (publicAssets.target_corpus !== retirement.public_target_corpus) {
              errors.push(
                `retirement record public_assets.target_corpus must be ${retirement.public_target_corpus}`,
              )
            }
            await validateCorpusMapping({
              root,
              sourceRef: record.source_ref,
              mapping: publicAssets,
              label: 'retirement record public_assets',
              countField: 'source_file_count',
              sourceCorpus: retirement.public_source_corpus,
              targetCorpus: retirement.public_target_corpus,
              actualSources: publicSources,
              errors,
            })
          }
        } catch (error) {
          errors.push(error.message)
        }
      }
    } catch (error) {
      errors.push(`v1 retirement record is invalid: ${error.message}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Knowledgebase v2-only target check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`,
    )
  }
  return { moduleRoot: root, targetVersion: 'v2' }
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  try {
    const argumentsList = process.argv.slice(2)
    const unknownArgument = argumentsList.find(
      (argument) => argument !== '--require-retirement-record',
    )
    if (unknownArgument) throw new Error(`Unknown argument: ${unknownArgument}`)
    const result = await checkV2OnlyTarget({
      requireRetirementRecord: argumentsList.includes('--require-retirement-record'),
    })
    console.log(`Knowledgebase target check: PASS (${result.targetVersion} only)`)
    console.log(`Module root: ${result.moduleRoot}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
