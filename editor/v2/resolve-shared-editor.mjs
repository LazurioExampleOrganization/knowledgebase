import { lstat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

async function realFile(targetPath) {
  return lstat(targetPath).then(
    (stat) => stat.isFile() && !stat.isSymbolicLink(),
    (error) => {
      if (error?.code === 'ENOENT') return false
      throw error
    },
  )
}

export async function resolveSharedEditorRoot(fromUrl = import.meta.url) {
  let cursor = path.dirname(fileURLToPath(fromUrl))
  while (true) {
    if (await realFile(path.join(cursor, 'launchpad.gen3.json'))) {
      const editorRoot = path.join(cursor, 'launchpad/components/editor/v2')
      if (await realFile(path.join(editorRoot, 'lib/astro-integration.ts'))) {
        return editorRoot
      }
      throw new Error(
        `Lazurio root ${cursor} does not provide launchpad/components/editor/v2. ` +
          'The Knowledgebase remains available in read-only mode.',
      )
    }
    const parent = path.dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }
  throw new Error('Cannot locate the Lazurio root from this Knowledgebase checkout.')
}

export async function resolveSharedEditorModule(relativeModule, fromUrl = import.meta.url) {
  const editorRoot = await resolveSharedEditorRoot(fromUrl)
  const modulePath = path.join(editorRoot, relativeModule)
  if (!(await realFile(modulePath))) {
    throw new Error(`Shared Knowledgebase editor module is missing: ${modulePath}`)
  }
  return pathToFileURL(modulePath).href
}
