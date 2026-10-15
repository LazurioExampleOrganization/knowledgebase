import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolveSharedEditorRoot } from './resolve-shared-editor.mjs'

const temporaryRoots = []

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('shared v2 editor resolution', () => {
  test('anchors at launchpad.gen3.json instead of an Organization worktree', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'knowledgebase-editor-root-'))
    temporaryRoots.push(root)
    const appConfig = path.join(
      root,
      'organizations/Example_GEN3/.worktrees/workspace/knowledgebase/FIX-smoke/app/v2/astro.config.mjs',
    )
    const editorIntegration = path.join(
      root,
      'launchpad/components/editor/v2/lib/astro-integration.ts',
    )
    await Promise.all([
      mkdir(path.dirname(appConfig), { recursive: true }),
      mkdir(path.dirname(editorIntegration), { recursive: true }),
    ])
    await writeFile(path.join(root, 'launchpad.gen3.json'), '{}\n')
    await writeFile(editorIntegration, '// fixture\n')

    await expect(resolveSharedEditorRoot(pathToFileURL(appConfig).href)).resolves.toBe(
      path.join(root, 'launchpad/components/editor/v2'),
    )
  })

  test('fails honestly when the Lazurio root has no v2 editor', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'knowledgebase-editor-missing-'))
    temporaryRoots.push(root)
    const appConfig = path.join(root, 'organizations/Example/workspace/knowledgebase/app/v2/astro.config.mjs')
    await mkdir(path.dirname(appConfig), { recursive: true })
    await writeFile(path.join(root, 'launchpad.gen3.json'), '{}\n')

    await expect(resolveSharedEditorRoot(pathToFileURL(appConfig).href)).rejects.toThrow(
      'does not provide launchpad/components/editor/v2',
    )
  })
})
