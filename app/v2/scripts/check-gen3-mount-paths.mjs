import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const moduleRoot = path.resolve(appRoot, '../..')
const astroConfig = await readFile(path.join(appRoot, 'astro.config.mjs'), 'utf8')
const packageJson = JSON.parse(await readFile(path.join(appRoot, 'package.json'), 'utf8'))
const moduleManifest = JSON.parse(
  await readFile(path.join(moduleRoot, 'lazurio.module.json'), 'utf8'),
)
const runtimeListener = await readFile(path.join(moduleRoot, 'runtime-listener.mjs'), 'utf8')
const bunLock = await readFile(path.join(appRoot, 'bun.lock'), 'utf8')
const runAstro = await readFile(path.join(appRoot, 'scripts/run-astro.mjs'), 'utf8')
const astroRunner = await readFile(path.join(appRoot, 'scripts/astro-runner.mjs'), 'utf8')
const dataMount = await readFile(path.join(appRoot, 'scripts/ensure-data-mount.mjs'), 'utf8')
const appSidebar = await readFile(path.join(appRoot, 'src/sidebar.ts'), 'utf8')
const dataSidebar = await readFile(path.join(moduleRoot, 'data/v2/sidebar.ts'), 'utf8')
const dataManifest = JSON.parse(
  await readFile(path.join(moduleRoot, 'data/v2/knowledgebase.json'), 'utf8'),
)
const targetContract = JSON.parse(
  await readFile(path.join(moduleRoot, 'data/v2/v2-target.json'), 'utf8'),
)
const editorServer = await readFile(path.join(moduleRoot, 'editor/v2/server.ts'), 'utf8')
const editorResolver = await readFile(
  path.join(moduleRoot, 'editor/v2/resolve-shared-editor.mjs'),
  'utf8',
)
const pageTitleComponent = await readFile(
  path.join(appRoot, 'src/components/ContentOwnsTitle.astro'),
  'utf8',
)
const docsCss = await readFile(path.join(appRoot, 'src/styles/docs.css'), 'utf8')
const topAnchorPlugin = await readFile(
  path.join(appRoot, 'src/content-owns-top-anchor.mjs'),
  'utf8',
)

assert.match(
  editorResolver,
  /launchpad\.gen3\.json/,
  'Shared editor resolution must anchor at the Lazurio root marker',
)
assert.match(
  editorResolver,
  /launchpad\/components\/editor\/v2/,
  'Shared editor resolution must target only the v2 component',
)
assert.doesNotMatch(
  `${astroConfig}\n${editorServer}\n${editorResolver}`,
  /components\/editor\/v1/,
  'The v2 Knowledgebase target must not depend on a v1 editor component',
)
assert.match(
  astroConfig,
  /resolveSharedEditorModule/,
  'Astro must resolve the shared editor from the real Lazurio root',
)
assert.equal(moduleManifest.schema_version, 'lazurio.module.v1')
assert.equal(moduleManifest.tcp_port_policy?.mode, 'exception')
assert.deepEqual(moduleManifest.port_leases?.map((lease) => lease.id), ['main', 'editor'])
assert.deepEqual(moduleManifest.apps, ['app/v2/package.json'])
assert.equal(moduleManifest.default_app, 'app/v2/package.json')

const lockWorkspaceName = bunLock.match(
  /"workspaces"\s*:\s*\{\s*""\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/s,
)?.[1]
assert.equal(
  lockWorkspaceName,
  packageJson.name,
  'bun.lock workspace name must match package.json name; run bun install after changing identity',
)
assert.equal(packageJson.lazurio?.runtime?.schema_version, 'lazurio.runtime.v1')
assert.equal(packageJson.lazurio?.runtime?.listeners?.[0]?.lease, 'main')
assert.match(runAstro, /resolveMainListener/, 'Astro runner must resolve the module-owned main lease')
assert.match(runAstro, /listener:\s*resolveMainListener\(\)/, 'Portable Astro runner must receive the module listener')
assert.match(astroRunner, /listener\.host/, 'Astro runner host must come from the resolved module listener')
assert.match(astroRunner, /listener\.port/, 'Astro runner port must come from the resolved module listener')
assert.match(runtimeListener, /LAZURIO_RUNTIME_LISTENER_APP_HOST/, 'Main listener must validate Launchpad injection')
assert.match(runtimeListener, /LAZURIO_RUNTIME_LISTENER_EDITOR_HOST/, 'Editor listener must validate Launchpad injection')
assert.doesNotMatch(
  `${runAstro}\n${astroRunner}\n${editorServer}`,
  /process\.env\.(?:HOST|PORT|EDITOR_PORT)\b/,
  'Generic listener variables must not control the runtime',
)
assert.doesNotMatch(`${runAstro}\n${astroRunner}`, /--strictPort/, 'Astro CLI does not support --strictPort; use Vite config')
assert.match(astroConfig, /server:\s*\{\s*strictPort:\s*true\s*\}/, 'Vite dev server must fail closed on a port collision')
assert.match(astroConfig, /data\/v2\/public/, 'Astro publicDir must use Organization-owned v2 public assets')
assert.match(astroRunner, /task === "preview"/, 'Preview must preflight its configured port')
assert.match(astroRunner, /await assertPortAvailableImpl\(host, port\)/, 'Preview port preflight must run before Astro starts')
if (targetContract.content_title_mode === 'authored-h1') {
  assert.match(
    astroConfig,
    /PageTitle:\s*['"]\.\/src\/components\/ContentOwnsTitle\.astro['"]/,
    'Starlight PageTitle must be disabled because each canonical page authors its own H1',
  )
  assert.match(astroConfig, /remarkPlugins:\s*\[contentOwnsTopAnchor\]/, 'Authored H1 must receive the Starlight top anchor')
  assert.match(topAnchorPlugin, /id:\s*["']_top["']/, 'Authored H1 plugin must provide the _top anchor')
  assert.match(pageTitleComponent, /single visible H1/, 'PageTitle override must remain an explicit empty marker')
  assert.match(pageTitleComponent, /content-owns-title-marker/, 'PageTitle override must mark its wrapper for removal')
  assert.match(docsCss, /content-panel:has\([^)]*content-owns-title-marker:only-child/, 'Only an otherwise empty PageTitle panel may be removed')
} else if (targetContract.content_title_mode === 'frontmatter-title') {
  assert.doesNotMatch(
    astroConfig,
    /PageTitle:\s*['"]\.\/src\/components\/ContentOwnsTitle\.astro['"]/,
    'Frontmatter-title pages must keep the default visible Starlight PageTitle',
  )
}
assert.equal(packageJson.version, '0.2.0', 'Knowledgebase v2 app must expose the v2 template version')
assert.match(packageJson.lazurio.runtime.id, /knowledgebase-v2$/, 'Runtime identity must target Knowledgebase v2')
assert.equal(packageJson.lazurio.runtime.company, moduleManifest.company)
assert.equal(packageJson.lazurio.runtime.module, moduleManifest.id)
assert.equal(
  dataManifest.schema_version,
  'companiesascode.knowledgebase.data.v2',
  'data/v2 must declare the Knowledgebase data contract',
)
assert.equal(dataManifest.content_root, 'docs', 'Knowledgebase data manifest must point to docs')
assert.equal(dataManifest.navigation, 'sidebar.ts', 'Knowledgebase data manifest must point to sidebar.ts')
assert.match(appSidebar, /from ['"]\.\.\/\.\.\/\.\.\/data\/v2\/sidebar['"]/, 'App code must import organization navigation from data/v2')
assert.doesNotMatch(dataSidebar, /^\s*import\b/m, 'Organization sidebar data must remain declarative')
assert.match(dataSidebar, /export\s+const\s+sidebar\s*=/, 'Organization sidebar must export sidebar data')
assert.match(dataMount, /data\/v2\/docs/, 'Starlight data mount must source canonical v2 pages')
assert.match(dataMount, /app\/v2\/src\/content\/docs/, 'Starlight data mount must target the runtime-only docs path')
assert.match(runAstro, /ensureKnowledgebaseDataMount/, 'Every Astro command must prepare the v2 data mount')
assert.match(editorServer, /resolveMainListener/, 'Editor preview must use the module-owned main lease')
assert.match(editorServer, /resolveEditorListener/, 'Editor listener must use the module-owned editor lease')
assert.match(editorServer, /port:\s*mainListener\.port/, 'Editor preview port must come from the module-owned main lease')
assert.match(editorServer, /port:\s*editorListener\.port/, 'Editor listener port must come from the module-owned editor lease')
assert.match(astroConfig, /resolveEditorListener/, 'Astro integration must use the module-owned editor lease')
assert.match(editorServer, /process\.env\.PREVIEW_HOST/, 'Editor preview must support a browser-safe host override')
assert.doesNotMatch(editorServer, /previewBaseUrl:\s*['"]http:\/\//, 'Editor preview URL must not be hardcoded')
assert.match(editorServer, /['"]data\/v2\/docs['"]/, 'Editor must author canonical v2 pages')
assert.match(editorServer, /['"]data\/v2\/sidebar\.ts['"]/, 'Editor must author canonical v2 navigation')

for (const file of await collectMarkdown(path.join(moduleRoot, 'data/v2/docs'))) {
  const markdown = await readFile(file, 'utf8')
  const withoutFences = markdown.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '')
  const h1Count = (withoutFences.match(/^#\s+.+$/gm) ?? []).length
  const expectedH1Count = targetContract.content_title_mode === 'frontmatter-title' ? 0 : 1
  assert.equal(
    h1Count,
    expectedH1Count,
    `${path.relative(appRoot, file)} does not match content_title_mode=${targetContract.content_title_mode}`,
  )
}

console.log('ok - KnowledgebaseTemplate GEN3 mount paths')

async function collectMarkdown(root) {
  const files = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...(await collectMarkdown(entryPath)))
    else if (/\.mdx?$/.test(entry.name)) files.push(entryPath)
  }
  return files.sort()
}
