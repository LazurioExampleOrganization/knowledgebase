import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultModuleRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))

export const DATA_MANIFEST = `${JSON.stringify(
  {
    schema_version: 'companiesascode.knowledgebase.data.v2',
    version: 2,
    content_root: 'docs',
    navigation: 'sidebar.ts',
  },
  null,
  2,
)}\n`

export function targetManifestForTitleMode(contentTitleMode = 'authored-h1') {
  return `${JSON.stringify(
    {
    schema_version: 'lazurio.knowledgebase.v2_only_target.v1',
    content_title_mode: contentTitleMode,
    required_directories: [
      'app/v2',
      'editor/v2',
      'data/v2/docs',
      'data/v2/public',
    ],
    required_files: [
      'data/v2/sidebar.ts',
      'data/v2/knowledgebase.json',
      'migrations/v2/check-v2-only-target.mjs',
      'migrations/v2/generate-v1-retirement-record.mjs',
      'migrations/v2/migrate-v1-to-v2.mjs',
      'migrations/v2/v1-runtime-retirement.example.json',
    ],
    data_contract: {
      path: 'data/v2/knowledgebase.json',
      schema_version: 'companiesascode.knowledgebase.data.v2',
    },
    retirement: {
      page_source_corpus: 'app/v1/src/content/docs',
      page_target_corpus: 'data/v2/docs',
      public_source_corpus: 'app/v1/public',
      public_target_corpus: 'data/v2/public',
    },
    },
    null,
    2,
  )}\n`
}

export const TARGET_MANIFEST = targetManifestForTitleMode()

export const DATA_README = `# Knowledgebase data v2

Tahle složka je Organization-owned source of truth Knowledgebase v2.

- \`docs/\` drží kanonické Markdown/MDX stránky a případné lokální assets.
- \`public/\` drží Organization-owned soubory publikované na stabilních root URL.
- \`sidebar.ts\` drží deklarativní navigaci.
- \`knowledgebase.json\` identifikuje datový kontrakt.
- \`v2-target.json\` deklaruje kontrolovatelný cílový layout a migrační corpusy.

Aplikační runtime v \`app/v2\` data pouze čte. Při vědomém fork syncu se
\`data/v2/**\` nikdy nepřebírá z template přes vlastní obsah Organizace.
`

export function normalizeV1Sidebar(source) {
  const typeImport =
    /^\s*import\s+type\s+\{\s*StarlightUserConfig\s*\}\s+from\s+['"]@astrojs\/starlight\/types['"];?\s*\r?\n/m
  const typedExport =
    /export\s+const\s+sidebar\s*:\s*StarlightUserConfig\s*\[\s*['"]sidebar['"]\s*\]\s*=/

  let normalized = source.replace(typeImport, '')
  normalized = normalized.replace(typedExport, 'export const sidebar =')

  if (!/export\s+const\s+sidebar\s*=/.test(normalized)) {
    throw new Error(
      'Legacy sidebar is not in the supported `export const sidebar = [...]` shape. ' +
        'Migrate data/v2/sidebar.ts manually and keep the v1 source unchanged.',
    )
  }
  if (/^\s*import\b/m.test(normalized) || /\bStarlightUserConfig\b/.test(normalized)) {
    throw new Error(
      'Legacy sidebar contains application imports or an unsupported type annotation. ' +
        'Migrate data/v2/sidebar.ts manually so it remains declarative organization data.',
    )
  }

  return normalized.replace(/^\s*\r?\n/, '')
}

async function statOrNull(targetPath) {
  return lstat(targetPath).catch((error) => {
    if (error?.code === 'ENOENT') return null
    throw error
  })
}

async function assertDirectoryPathIsSafe(root, relativePath, { allowMissing = false } = {}) {
  let current = root
  for (const segment of relativePath.split('/')) {
    current = path.join(current, segment)
    const currentStat = await statOrNull(current)
    if (!currentStat && allowMissing) return
    if (!currentStat) throw new Error(`Required migration directory is missing: ${current}`)
    if (currentStat.isSymbolicLink() || !currentStat.isDirectory()) {
      throw new Error(`Migration directory must be a real directory: ${current}`)
    }
  }
}

async function collectSourceFiles(root, current = root) {
  const currentStat = await lstat(current)
  if (currentStat.isSymbolicLink()) {
    throw new Error(`Migration refuses symbolic links in the v1 corpus: ${current}`)
  }
  if (!currentStat.isDirectory()) {
    throw new Error(`Knowledgebase v1 docs source must be a directory: ${current}`)
  }

  const files = []
  const entries = await readdir(current, { withFileTypes: true })
  entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))

  for (const entry of entries) {
    const entryPath = path.join(current, entry.name)
    if (entry.isSymbolicLink()) {
      throw new Error(`Migration refuses symbolic links in the v1 corpus: ${entryPath}`)
    }
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(root, entryPath)))
      continue
    }
    if (!entry.isFile()) {
      throw new Error(`Migration refuses non-file entries in the v1 corpus: ${entryPath}`)
    }
    files.push({
      source: entryPath,
      relativePath: path.relative(root, entryPath),
      content: await readFile(entryPath),
    })
  }

  return files
}

async function assertDestinationTreeIsSafe(root) {
  const rootStat = await statOrNull(root)
  if (!rootStat) return
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error(`Knowledgebase v2 data destination must be a real directory: ${root}`)
  }

  const entries = await readdir(root, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name)
    if (entry.isSymbolicLink()) {
      throw new Error(`Migration refuses symbolic links in the v2 destination: ${entryPath}`)
    }
    if (entry.isDirectory()) await assertDestinationTreeIsSafe(entryPath)
    else if (!entry.isFile()) {
      throw new Error(`Migration refuses non-file entries in the v2 destination: ${entryPath}`)
    }
  }
}

function relativeDisplay(moduleRoot, targetPath) {
  return path.relative(moduleRoot, targetPath).split(path.sep).join('/')
}

function authoredH1Count(content) {
  const withoutFences = content
    .toString('utf8')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
  return (withoutFences.match(/^#\s+.+$/gm) ?? []).length
}

function detectContentTitleMode(docs) {
  const markdown = docs.filter(({ relativePath }) => /\.mdx?$/i.test(relativePath))
  const counts = markdown.map(({ content }) => authoredH1Count(content))
  if (counts.every((count) => count === 1)) return 'authored-h1'
  if (counts.every((count) => count === 0)) return 'frontmatter-title'
  throw new Error(
    'Legacy pages mix zero, one or multiple authored H1 headings. Normalize the corpus consciously before v2 cutover; the migrator will not guess a title rendering mode.',
  )
}

export async function planV1ToV2Migration({ moduleRoot = defaultModuleRoot } = {}) {
  const root = path.resolve(moduleRoot)
  const sourceDocs = path.join(root, 'app/v1/src/content/docs')
  const sourceSidebar = path.join(root, 'app/v1/src/sidebar.ts')
  const sourcePublic = path.join(root, 'app/v1/public')
  const targetRoot = path.join(root, 'data/v2')
  const targetDocs = path.join(targetRoot, 'docs')
  const targetPublic = path.join(targetRoot, 'public')

  const moduleStat = await statOrNull(root)
  if (!moduleStat?.isDirectory() || moduleStat.isSymbolicLink()) {
    throw new Error(`Module root does not exist or is not a real directory: ${root}`)
  }

  await assertDirectoryPathIsSafe(root, 'app/v1/src/content/docs')
  await assertDirectoryPathIsSafe(root, 'app/v1/public')
  await assertDirectoryPathIsSafe(root, 'data/v2', { allowMissing: true })

  const sidebarStat = await statOrNull(sourceSidebar)
  if (!sidebarStat?.isFile() || sidebarStat.isSymbolicLink()) {
    throw new Error(`Knowledgebase v1 sidebar is missing or unsafe: ${sourceSidebar}`)
  }

  const docs = await collectSourceFiles(sourceDocs)
  const publicFiles = await collectSourceFiles(sourcePublic)
  if (!docs.some(({ relativePath }) => /\.mdx?$/i.test(relativePath))) {
    throw new Error(`Knowledgebase v1 corpus contains no Markdown or MDX pages: ${sourceDocs}`)
  }
  await assertDestinationTreeIsSafe(targetRoot)
  const contentTitleMode = detectContentTitleMode(docs)

  const sidebar = normalizeV1Sidebar(await readFile(sourceSidebar, 'utf8'))
  const candidates = [
    ...docs.map(({ source, relativePath, content }) => ({
      source,
      target: path.join(targetDocs, relativePath),
      content,
    })),
    ...publicFiles.map(({ source, relativePath, content }) => ({
      source,
      target: path.join(targetPublic, relativePath),
      content,
    })),
    {
      source: sourceSidebar,
      target: path.join(targetRoot, 'sidebar.ts'),
      content: Buffer.from(sidebar),
    },
    {
      source: null,
      target: path.join(targetRoot, 'knowledgebase.json'),
      content: Buffer.from(DATA_MANIFEST),
    },
    {
      source: null,
      target: path.join(targetRoot, 'README.md'),
      content: Buffer.from(DATA_README),
    },
    {
      source: null,
      target: path.join(targetRoot, 'v2-target.json'),
      content: Buffer.from(targetManifestForTitleMode(contentTitleMode)),
    },
  ]

  const operations = []
  const conflicts = []
  for (const candidate of candidates) {
    const targetStat = await statOrNull(candidate.target)
    if (!targetStat) {
      operations.push({ ...candidate, status: 'create' })
      continue
    }
    if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
      conflicts.push({ ...candidate, reason: 'destination is not a regular file' })
      continue
    }
    const current = await readFile(candidate.target)
    if (current.equals(candidate.content)) {
      operations.push({ ...candidate, status: 'unchanged' })
    } else {
      conflicts.push({ ...candidate, reason: 'destination content differs' })
    }
  }

  if (conflicts.length > 0) {
    const detail = conflicts
      .map(({ target, reason }) => `- ${relativeDisplay(root, target)}: ${reason}`)
      .join('\n')
    throw new Error(
      `Knowledgebase v2 migration stopped before writing because conflicts exist:\n${detail}`,
    )
  }

  return {
    moduleRoot: root,
    sourceDocs,
    sourceSidebar,
    sourcePublic,
    targetRoot,
    contentTitleMode,
    operations,
  }
}

export async function migrateV1ToV2({ moduleRoot, apply = false } = {}) {
  const plan = await planV1ToV2Migration({ moduleRoot })
  const creates = plan.operations.filter(({ status }) => status === 'create')

  if (apply) {
    for (const operation of creates) {
      await mkdir(path.dirname(operation.target), { recursive: true })
      await writeFile(operation.target, operation.content, { flag: 'wx' })
    }
  }

  return {
    ...plan,
    apply,
    created: apply ? creates.length : 0,
    wouldCreate: creates.length,
    unchanged: plan.operations.length - creates.length,
  }
}

function parseArguments(argv) {
  const result = { apply: false, moduleRoot: defaultModuleRoot }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--apply') result.apply = true
    else if (argument === '--module-root') {
      const value = argv[index + 1]
      if (!value) throw new Error('--module-root requires a path.')
      result.moduleRoot = path.resolve(value)
      index += 1
    } else if (argument === '--help' || argument === '-h') result.help = true
    else throw new Error(`Unknown argument: ${argument}`)
  }
  return result
}

function printHelp() {
  console.log(`Knowledgebase v1 -> v2 data migration

Usage:
  bun migrations/v2/migrate-v1-to-v2.mjs [--module-root <path>] [--apply]

The default is a read-only dry-run. --apply copies app/v1/src/content/docs,
app/v1/public and the declarative sidebar into data/v2 without deleting or
changing v1.`)
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  try {
    const options = parseArguments(process.argv.slice(2))
    if (options.help) printHelp()
    else {
      const result = await migrateV1ToV2(options)
      console.log(`Knowledgebase v1 -> v2 ${result.apply ? 'apply' : 'dry-run'}`)
      console.log(`Module root: ${result.moduleRoot}`)
      for (const operation of result.operations) {
        console.log(`${operation.status === 'create' ? 'CREATE' : 'OK    '} ${relativeDisplay(result.moduleRoot, operation.target)}`)
      }
      console.log(
        result.apply
          ? `Created ${result.created} file(s); ${result.unchanged} already matched.`
          : `Would create ${result.wouldCreate} file(s); ${result.unchanged} already match. Re-run with --apply to write.`,
      )
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
