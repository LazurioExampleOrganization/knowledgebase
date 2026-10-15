import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  DATA_MANIFEST,
  DATA_README,
  TARGET_MANIFEST,
  migrateV1ToV2,
} from './migrate-v1-to-v2.mjs'

const temporaryRoots = []

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function createV1Fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'knowledgebase-v1-migration-'))
  temporaryRoots.push(root)
  const docsRoot = path.join(root, 'app/v1/src/content/docs')
  const publicRoot = path.join(root, 'app/v1/public')
  await mkdir(path.join(docsRoot, 'cs/00-governance'), { recursive: true })
  await mkdir(path.join(publicRoot, 'downloads'), { recursive: true })
  await writeFile(path.join(docsRoot, 'cs/index.md'), '---\ntitle: Home\n---\n\n# Home\n')
  await writeFile(path.join(docsRoot, 'cs/00-governance/index.mdx'), '# Governance\n')
  await writeFile(path.join(docsRoot, 'cs/logo.bin'), Buffer.from([0, 1, 2, 255]))
  await writeFile(path.join(publicRoot, 'favicon.svg'), '<svg>Organization</svg>\n')
  await writeFile(path.join(publicRoot, 'downloads/manual.pdf'), Buffer.from([37, 80, 68, 70]))
  await writeFile(
    path.join(root, 'app/v1/src/sidebar.ts'),
    "import type { StarlightUserConfig } from '@astrojs/starlight/types'\n\nexport const sidebar: StarlightUserConfig['sidebar'] = [\n  { label: 'Home', slug: 'index' },\n]\n",
  )
  return root
}

describe('Knowledgebase v1 -> v2 data migration', () => {
  test('is dry-run by default and preserves v1 during apply', async () => {
    const moduleRoot = await createV1Fixture()
    const dryRun = await migrateV1ToV2({ moduleRoot })

    expect(dryRun.wouldCreate).toBe(9)
    expect(await readFile(path.join(moduleRoot, 'app/v1/src/content/docs/cs/index.md'), 'utf8')).toContain('# Home')
    await expect(readFile(path.join(moduleRoot, 'data/v2/docs/cs/index.md'))).rejects.toThrow()

    const applied = await migrateV1ToV2({ moduleRoot, apply: true })
    expect(applied.created).toBe(9)
    expect(await readFile(path.join(moduleRoot, 'data/v2/docs/cs/index.md'), 'utf8')).toContain('# Home')
    expect(await readFile(path.join(moduleRoot, 'data/v2/docs/cs/logo.bin'))).toEqual(
      Buffer.from([0, 1, 2, 255]),
    )
    expect(await readFile(path.join(moduleRoot, 'data/v2/sidebar.ts'), 'utf8')).toBe(
      "export const sidebar = [\n  { label: 'Home', slug: 'index' },\n]\n",
    )
    expect(await readFile(path.join(moduleRoot, 'data/v2/knowledgebase.json'), 'utf8')).toBe(
      DATA_MANIFEST,
    )
    expect(await readFile(path.join(moduleRoot, 'data/v2/README.md'), 'utf8')).toBe(DATA_README)
    expect(await readFile(path.join(moduleRoot, 'data/v2/v2-target.json'), 'utf8')).toBe(
      TARGET_MANIFEST,
    )
    expect(await readFile(path.join(moduleRoot, 'data/v2/public/favicon.svg'), 'utf8')).toBe(
      '<svg>Organization</svg>\n',
    )
    expect(await readFile(path.join(moduleRoot, 'data/v2/public/downloads/manual.pdf'))).toEqual(
      Buffer.from([37, 80, 68, 70]),
    )
    expect(await readFile(path.join(moduleRoot, 'app/v1/src/content/docs/cs/index.md'), 'utf8')).toContain('# Home')
  })

  test('is idempotent when every v2 target already matches', async () => {
    const moduleRoot = await createV1Fixture()
    await migrateV1ToV2({ moduleRoot, apply: true })
    const second = await migrateV1ToV2({ moduleRoot, apply: true })

    expect(second.created).toBe(0)
    expect(second.wouldCreate).toBe(0)
    expect(second.unchanged).toBe(9)
  })

  test('detects a frontmatter-title corpus without inventing authored H1 headings', async () => {
    const moduleRoot = await createV1Fixture()
    await writeFile(
      path.join(moduleRoot, 'app/v1/src/content/docs/cs/index.md'),
      '---\ntitle: Home\n---\n\nIntro without an authored heading.\n',
    )
    await writeFile(
      path.join(moduleRoot, 'app/v1/src/content/docs/cs/00-governance/index.mdx'),
      '---\ntitle: Governance\n---\n\nPolicy body.\n',
    )

    const result = await migrateV1ToV2({ moduleRoot })
    expect(result.contentTitleMode).toBe('frontmatter-title')
    const targetOperation = result.operations.find(({ target }) => target.endsWith('v2-target.json'))
    expect(JSON.parse(targetOperation.content.toString()).content_title_mode).toBe(
      'frontmatter-title',
    )
  })

  test('refuses to guess when a legacy corpus mixes title rendering modes', async () => {
    const moduleRoot = await createV1Fixture()
    await writeFile(
      path.join(moduleRoot, 'app/v1/src/content/docs/cs/index.md'),
      '---\ntitle: Home\n---\n\nIntro without an authored heading.\n',
    )

    await expect(migrateV1ToV2({ moduleRoot })).rejects.toThrow(
      'mix zero, one or multiple authored H1 headings',
    )
  })

  test('fails before writing any file when one destination conflicts', async () => {
    const moduleRoot = await createV1Fixture()
    await mkdir(path.join(moduleRoot, 'data/v2/docs/cs'), { recursive: true })
    await writeFile(path.join(moduleRoot, 'data/v2/docs/cs/index.md'), '# Different\n')

    await expect(migrateV1ToV2({ moduleRoot, apply: true })).rejects.toThrow(
      'stopped before writing because conflicts exist',
    )
    await expect(
      readFile(path.join(moduleRoot, 'data/v2/docs/cs/00-governance/index.mdx')),
    ).rejects.toThrow()
    expect(await readFile(path.join(moduleRoot, 'data/v2/docs/cs/index.md'), 'utf8')).toBe(
      '# Different\n',
    )
  })

  test('rejects symbolic links in the legacy corpus', async () => {
    const moduleRoot = await createV1Fixture()
    const linkedTarget = path.join(moduleRoot, 'outside-docs')
    await mkdir(linkedTarget, { recursive: true })
    await symlink(
      linkedTarget,
      path.join(moduleRoot, 'app/v1/src/content/docs/cs/linked-docs'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )

    await expect(migrateV1ToV2({ moduleRoot })).rejects.toThrow(
      'refuses symbolic links in the v1 corpus',
    )
  })

  test('rejects a destination whose data ancestor is a link', async () => {
    const moduleRoot = await createV1Fixture()
    const linkedTarget = path.join(moduleRoot, 'outside-data')
    await mkdir(linkedTarget, { recursive: true })
    await symlink(
      linkedTarget,
      path.join(moduleRoot, 'data'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )

    await expect(migrateV1ToV2({ moduleRoot, apply: true })).rejects.toThrow(
      'Migration directory must be a real directory',
    )
  })
})
