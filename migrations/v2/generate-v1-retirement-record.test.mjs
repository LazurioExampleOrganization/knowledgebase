import { afterEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { generateV1RetirementRecord } from './generate-v1-retirement-record.mjs'

const temporaryRoots = []

function git(root, argumentsList) {
  return execFileSync('git', argumentsList, { cwd: root, encoding: 'utf8' }).trim()
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function createFixture({ newerTarget = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'knowledgebase-retirement-record-'))
  temporaryRoots.push(root)
  await Promise.all([
    mkdir(path.join(root, 'app/v1/src/content/docs/cs'), { recursive: true }),
    mkdir(path.join(root, 'app/v1/public/assets'), { recursive: true }),
    mkdir(path.join(root, 'data/v2/docs/cs'), { recursive: true }),
    mkdir(path.join(root, 'data/v2/public/assets'), { recursive: true }),
  ])
  await writeFile(path.join(root, 'app/v1/src/content/docs/cs/index.md'), '# Legacy\n')
  await writeFile(path.join(root, 'app/v1/src/sidebar.ts'), 'export const sidebar = []\n')
  await writeFile(path.join(root, 'app/v1/public/assets/logo.svg'), '<svg>legacy</svg>\n')
  await writeFile(path.join(root, 'data/v2/docs/cs/index.md'), newerTarget ? '# Current\n' : '# Legacy\n')
  await writeFile(path.join(root, 'data/v2/public/assets/logo.svg'), '<svg>legacy</svg>\n')
  await writeFile(path.join(root, 'data/v2/sidebar.ts'), 'export const sidebar = []\n')
  await writeFile(
    path.join(root, 'data/v2/v2-target.json'),
    `${JSON.stringify({
      schema_version: 'lazurio.knowledgebase.v2_only_target.v1',
      retirement: {
        page_source_corpus: 'app/v1/src/content/docs',
        page_target_corpus: 'data/v2/docs',
        public_source_corpus: 'app/v1/public',
        public_target_corpus: 'data/v2/public',
      },
    }, null, 2)}\n`,
  )
  git(root, ['init', '-b', 'main'])
  git(root, ['config', 'user.name', 'Knowledgebase Test'])
  git(root, ['config', 'user.email', 'knowledgebase-test@example.invalid'])
  git(root, ['add', '.'])
  git(root, ['commit', '-m', 'Pre-cutover source'])
  return { root, sourceRef: git(root, ['rev-parse', 'HEAD']) }
}

async function createMappedPublicFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'knowledgebase-retirement-map-'))
  temporaryRoots.push(root)
  await Promise.all([
    mkdir(path.join(root, 'app/v1/src/content/docs'), { recursive: true }),
    mkdir(path.join(root, 'app/v1/public/legacy'), { recursive: true }),
    mkdir(path.join(root, 'data/v2/custom-assets'), { recursive: true }),
    mkdir(path.join(root, 'migrations/v2'), { recursive: true }),
  ])
  await writeFile(path.join(root, 'app/v1/public/legacy/logo.svg'), '<svg>legacy</svg>\n')
  await writeFile(path.join(root, 'data/v2/custom-assets/logo.svg'), '<svg>legacy</svg>\n')
  await writeFile(
    path.join(root, 'migrations/v2/public-target-map.json'),
    `${JSON.stringify({
      schema_version: 'lazurio.knowledgebase.retirement_target_map.v1',
      overrides: [],
      rules: [
        {
          source_prefix: 'legacy/',
          target_prefix: 'data/v2/custom-assets/',
        },
      ],
    }, null, 2)}\n`,
  )
  await writeFile(
    path.join(root, 'data/v2/v2-target.json'),
    `${JSON.stringify({
      schema_version: 'lazurio.knowledgebase.v2_only_target.v1',
      retirement: {
        page_source_corpus: 'app/v1/src/content/docs',
        page_target_corpus: 'data/v2',
        public_source_corpus: 'app/v1/public',
        public_target_corpus: '.',
        public_target_map: 'migrations/v2/public-target-map.json',
      },
    }, null, 2)}\n`,
  )
  git(root, ['init', '-b', 'main'])
  git(root, ['config', 'user.name', 'Knowledgebase Test'])
  git(root, ['config', 'user.email', 'knowledgebase-test@example.invalid'])
  git(root, ['add', '.'])
  git(root, ['commit', '-m', 'Pre-cutover source'])
  return { root, sourceRef: git(root, ['rev-parse', 'HEAD']) }
}

describe('v1 retirement record generator', () => {
  test('builds complete byte-checked page and public mappings from an exact commit', async () => {
    const { root, sourceRef } = await createFixture()
    const result = await generateV1RetirementRecord({
      moduleRoot: root,
      sourceRef,
      reviewedAt: '2026-08-22',
      apply: true,
    })

    expect(result.record).toMatchObject({
      source_ref: sourceRef,
      source_page_count: 1,
      migrated_to_same_path: ['cs/index.md'],
      removed_runtime_paths: ['app/v1'],
      public_assets: {
        source_file_count: 1,
        migrated_to_same_path: ['assets/logo.svg'],
      },
    })
    expect(result.record.navigation).toMatchObject({ target: 'data/v2/sidebar.ts' })
    expect(
      JSON.parse(
        await readFile(
          path.join(root, 'data/v2/migration-records/v1-runtime-retirement.json'),
          'utf8',
        ),
      ),
    ).toEqual(result.record)
  })

  test('compares canonical Git bytes across CRLF checkout conversion', async () => {
    const { root, sourceRef } = await createFixture()
    const pagePath = 'data/v2/docs/cs/index.md'
    const assetPath = 'data/v2/public/assets/logo.svg'
    git(root, ['config', 'core.autocrlf', 'true'])
    await Promise.all([rm(path.join(root, pagePath)), rm(path.join(root, assetPath))])
    git(root, ['checkout', '--', pagePath, assetPath])

    expect(await readFile(path.join(root, pagePath), 'utf8')).toContain('\r\n')
    const result = await generateV1RetirementRecord({
      moduleRoot: root,
      sourceRef,
      reviewedAt: '2026-08-22',
    })

    expect(result.record.migrated_to_same_path).toEqual(['cs/index.md'])
    expect(result.record.public_assets.migrated_to_same_path).toEqual(['assets/logo.svg'])
  })

  test('requires an explicit reviewed opt-in before classifying newer v2 targets', async () => {
    const { root, sourceRef } = await createFixture({ newerTarget: true })

    await expect(
      generateV1RetirementRecord({
        moduleRoot: root,
        sourceRef,
        reviewedAt: '2026-08-22',
      }),
    ).rejects.toThrow('rerun with --allow-newer-targets')

    const result = await generateV1RetirementRecord({
      moduleRoot: root,
      sourceRef,
      reviewedAt: '2026-08-22',
      allowNewerTargets: true,
    })
    expect(result.record.newer_v2_same_path).toEqual(['cs/index.md'])
  })

  test('maps custom legacy public paths to canonical v2 targets', async () => {
    const { root, sourceRef } = await createMappedPublicFixture()
    const result = await generateV1RetirementRecord({
      moduleRoot: root,
      sourceRef,
      reviewedAt: '2026-08-22',
    })

    expect(result.record.public_assets).toMatchObject({
      source_file_count: 1,
      target_corpus: '.',
      superseded: [
        {
          source: 'legacy/logo.svg',
          targets: ['data/v2/custom-assets/logo.svg'],
          byte_status: 'identical',
        },
      ],
    })
  })
})
