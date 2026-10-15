import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import { sidebar } from './src/sidebar'
import { resolveSharedEditorModule } from '../../editor/v2/resolve-shared-editor.mjs'
import { resolveEditorListener, resolveMainListener } from '../../runtime-listener.mjs'

const mainListener = resolveMainListener()
const editorListener = resolveEditorListener()

// Editor is local-only (reads/writes repo files) — skip when Launchpad is absent.
let editorButton
try {
  const editorIntegration = await resolveSharedEditorModule(
    'lib/astro-integration.ts',
    import.meta.url,
  )
  ;({ editorButton } = await import(/* @vite-ignore */ editorIntegration))
} catch (error) {
  if (!process.env.CI) {
    console.warn(
      '[editor] Local editor button unavailable:',
      error instanceof Error ? error.message : error,
    )
  }
}

export default defineConfig({
  site: 'https://knowledgebase.agentmint.local',
  server: {
    host: mainListener.host,
    port: mainListener.port,
  },
  publicDir: fileURLToPath(new URL('../../data/v2/public', import.meta.url)),
  vite: {
    server: { strictPort: true },
    preview: { strictPort: true },
  },
  redirects: {
    '/': '/cs/',
  },
  integrations: [
    editorButton?.({
      editorServerPath: fileURLToPath(new URL('../../editor/v2/server.ts', import.meta.url)),
      editorPort: editorListener.port,
    }),
    starlight({
      title: {
        cs: 'AgentMint Knowledgebase',
        en: 'AgentMint Knowledgebase',
      },
      favicon: '/favicon.svg',
      locales: {
        cs: { label: 'Čeština', lang: 'cs' },
        en: { label: 'English', lang: 'en' },
      },
      defaultLocale: 'cs',
      sidebar,
      routeMiddleware: './src/routeData.ts',
      customCss: ['./src/styles/docs.css'],
    }),
  ].filter(Boolean),
})
