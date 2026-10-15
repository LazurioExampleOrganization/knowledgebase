import { lstat, mkdir, realpath, symlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultModuleRoot = path.resolve(scriptDirectory, '../../..')

async function statOrNull(targetPath) {
  return lstat(targetPath).catch((error) => {
    if (error?.code === 'ENOENT') return null
    throw error
  })
}

async function assertRealDirectoryPath(root, relativePath, { allowMissingLeaf = false } = {}) {
  let current = root
  const segments = relativePath.split('/')
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment)
    const currentStat = await statOrNull(current)
    const isLeaf = index === segments.length - 1
    if (!currentStat && allowMissingLeaf && isLeaf) return
    if (!currentStat) throw new Error(`Knowledgebase runtime directory is missing: ${current}`)
    if (currentStat.isSymbolicLink() || !currentStat.isDirectory()) {
      throw new Error(`Knowledgebase runtime directory must be a real directory: ${current}`)
    }
  }
}

export async function ensureKnowledgebaseDataMount({
  moduleRoot = defaultModuleRoot,
  platform = process.platform,
} = {}) {
  const resolvedModuleRoot = path.resolve(moduleRoot)
  const dataRoot = path.join(resolvedModuleRoot, 'data/v2/docs')
  const mountPath = path.join(resolvedModuleRoot, 'app/v2/src/content/docs')

  const moduleStat = await statOrNull(resolvedModuleRoot)
  if (!moduleStat?.isDirectory() || moduleStat.isSymbolicLink()) {
    throw new Error(`Knowledgebase module root must be a real directory: ${resolvedModuleRoot}`)
  }
  await assertRealDirectoryPath(resolvedModuleRoot, 'data/v2/docs')
  await assertRealDirectoryPath(resolvedModuleRoot, 'app/v2/src')
  await assertRealDirectoryPath(resolvedModuleRoot, 'app/v2/src/content', {
    allowMissingLeaf: true,
  })

  const existingMount = await statOrNull(mountPath)

  if (existingMount) {
    if (!existingMount.isSymbolicLink()) {
      throw new Error(
        `Starlight data mount exists but is not a managed link: ${mountPath}. ` +
          'Move organization content to data/v2/docs before retrying.',
      )
    }

    const [actualTarget, expectedTarget] = await Promise.all([
      realpath(mountPath),
      realpath(dataRoot),
    ])
    const normalize = (value) =>
      platform === 'win32' ? path.normalize(value).toLowerCase() : path.normalize(value)
    if (normalize(actualTarget) !== normalize(expectedTarget)) {
      throw new Error(
        `Starlight data mount points to ${actualTarget}, expected ${expectedTarget}.`,
      )
    }

    return { created: false, dataRoot, mountPath }
  }

  await mkdir(path.dirname(mountPath), { recursive: true })
  const target = platform === 'win32' ? dataRoot : path.relative(path.dirname(mountPath), dataRoot)
  try {
    await symlink(target, mountPath, platform === 'win32' ? 'junction' : 'dir')
  } catch (error) {
    if (error?.code === 'EEXIST') {
      return ensureKnowledgebaseDataMount({ moduleRoot: resolvedModuleRoot, platform })
    }
    throw error
  }

  return { created: true, dataRoot, mountPath }
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  try {
    const result = await ensureKnowledgebaseDataMount()
    console.log(
      result.created
        ? `Created Starlight data mount: ${result.mountPath} -> ${result.dataRoot}`
        : `Starlight data mount is ready: ${result.mountPath} -> ${result.dataRoot}`,
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
