import path from 'node:path'
import { createPreviewBaseUrl } from './preview-url'
import { resolveSharedEditorModule, resolveSharedEditorRoot } from './resolve-shared-editor.mjs'
import { resolveEditorListener, resolveMainListener } from '../../runtime-listener.mjs'

const repoRoot = path.resolve(import.meta.dir, '../..')
const mainListener = resolveMainListener()
const editorListener = resolveEditorListener()

const createServerModule = await resolveSharedEditorModule('lib/create-server.ts', import.meta.url)
const { createEditorServer } = await import(createServerModule)
const sharedEditorRoot = await resolveSharedEditorRoot(import.meta.url)

createEditorServer({
  host: editorListener.host,
  port: editorListener.port,
  previewBaseUrl: createPreviewBaseUrl({
    bindHost: mainListener.host,
    previewHost: process.env.PREVIEW_HOST,
    port: mainListener.port,
  }),
  projectTitle: 'Knowledgebase',
  projectKey: 'kb',
  repoRoot,
  appRoot: path.join(repoRoot, 'app/v2'),
  authoringPaths: [
    'data/v2/docs',
    'data/v2/sidebar.ts',
  ],
  publicDir: path.join(sharedEditorRoot, 'public'),
})
