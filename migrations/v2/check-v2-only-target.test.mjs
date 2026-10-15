import { afterEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { checkV2OnlyTarget } from './check-v2-only-target.mjs'

const temporaryRoots = []

function git(root, argumentsList) {
  return execFileSync('git', argumentsList, { cwd: root, encoding: 'utf8' }).trim()
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function createV2Fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'knowledgebase-v2-only-'))
  temporaryRoots.push(root)
  await Promise.all([
    mkdir(path.join(root, 'app/v2'), { recursive: true }),
    mkdir(path.join(root, 'editor/v2'), { recursive: true }),
    mkdir(path.join(root, 'data/v2/docs'), { recursive: true }),
    mkdir(path.join(root, 'data/v2/public'), { recursive: true }),
    mkdir(path.join(root, 'migrations/v2'), { recursive: true }),
  ])
  await writeFile(path.join(root, 'data/v2/sidebar.ts'), 'export const sidebar = []\n')
  await writeFile(
    path.join(root, 'data/v2/knowledgebase.json'),
    `${JSON.stringify({ schema_version: 'companiesascode.knowledgebase.data.v2' })}\n`,
  )
  await writeFile(path.join(root, 'migrations/v2/migrate-v1-to-v2.mjs'), '// fixture\n')
  await writeFile(path.join(root, 'migrations/v2/generate-v1-retirement-record.mjs'), '// fixture\n')
  await writeFile(
    path.join(root, 'migrations/v2/v1-runtime-retirement.example.json'),
    '{}\n',
  )
  await writeFile(
    path.join(root, 'data/v2/v2-target.json'),
    `${JSON.stringify({
      schema_version: 'lazurio.knowledgebase.v2_only_target.v1',
      content_title_mode: 'authored-h1',
      required_directories: ['app/v2', 'editor/v2', 'data/v2/docs', 'data/v2/public'],
      required_files: [
        'data/v2/sidebar.ts',
        'data/v2/knowledgebase.json',
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
    }, null, 2)}\n`,
  )
  return root
}

describe('Knowledgebase v2-only target', () => {
  test('accepts v2 as the sole runtime while retaining migration tooling', async () => {
    const moduleRoot = await createV2Fixture()
    await expect(checkV2OnlyTarget({ moduleRoot })).resolves.toMatchObject({ targetVersion: 'v2' })
  })

  test('rejects a retained v1 runtime', async () => {
    const moduleRoot = await createV2Fixture()
    await mkdir(path.join(moduleRoot, 'app/v1'), { recursive: true })

    await expect(checkV2OnlyTarget({ moduleRoot })).rejects.toThrow('app/v1 is still present')
  })

  test('rejects v1 runtime commands in canonical v2 home pages only', async () => {
    const moduleRoot = await createV2Fixture()
    const docsRoot = path.join(moduleRoot, 'data/v2/docs')
    await Promise.all([
      mkdir(path.join(docsRoot, 'cs/00-governance'), { recursive: true }),
      mkdir(path.join(docsRoot, 'en'), { recursive: true }),
    ])

    const historicalReference =
      'Historical source: `app/v1/src/content/docs/cs/index.md`.\n\n'
    await Promise.all([
      writeFile(
        path.join(docsRoot, 'cs/index.md'),
        `${historicalReference}\`\`\`bash\ncd knowledgebase/app/v1\nbun run check\n\`\`\`\n`,
      ),
      writeFile(
        path.join(docsRoot, 'en/index.md'),
        `${historicalReference}\`\`\`sh\ncd ./knowledgebase/app/v1\nbun run build\n\`\`\`\n`,
      ),
      writeFile(
        path.join(docsRoot, 'cs/00-governance/index.md'),
        '```bash\ncd knowledgebase/app/v1\n```\n',
      ),
    ])

    await expect(checkV2OnlyTarget({ moduleRoot })).rejects.toThrow(
      /data\/v2\/docs\/cs\/index\.md[\s\S]*data\/v2\/docs\/en\/index\.md/,
    )

    await Promise.all([
      writeFile(
        path.join(docsRoot, 'cs/index.md'),
        `${historicalReference}\`\`\`bash\ncd knowledgebase/app/v2\nbun run check\n\`\`\`\n`,
      ),
      writeFile(
        path.join(docsRoot, 'en/index.md'),
        `${historicalReference}\`\`\`sh\ncd ./knowledgebase/app/v2\nbun run build\n\`\`\`\n`,
      ),
    ])

    await expect(checkV2OnlyTarget({ moduleRoot })).resolves.toMatchObject({
      targetVersion: 'v2',
    })
  })

  test('rejects removal of the v1-to-v2 migration path', async () => {
    const moduleRoot = await createV2Fixture()
    await rm(path.join(moduleRoot, 'migrations/v2/migrate-v1-to-v2.mjs'))

    await expect(checkV2OnlyTarget({ moduleRoot })).rejects.toThrow(
      'migrations/v2/migrate-v1-to-v2.mjs must be a real file',
    )
  })

  test('accepts an explicitly declared custom v2 layout', async () => {
    const moduleRoot = await createV2Fixture()
    await rm(path.join(moduleRoot, 'editor/v2'), { recursive: true })
    await rm(path.join(moduleRoot, 'data/v2/docs'), { recursive: true })
    await rm(path.join(moduleRoot, 'data/v2/sidebar.ts'))
    await rm(path.join(moduleRoot, 'data/v2/knowledgebase.json'))
    await writeFile(
      path.join(moduleRoot, 'data/v2/v2-target.json'),
      `${JSON.stringify({
        schema_version: 'lazurio.knowledgebase.v2_only_target.v1',
        content_title_mode: 'custom',
        required_directories: ['app/v2', 'data/v2'],
        required_files: [
          'migrations/v2/generate-v1-retirement-record.mjs',
          'migrations/v2/migrate-v1-to-v2.mjs',
          'migrations/v2/v1-runtime-retirement.example.json',
        ],
        data_contract: null,
        retirement: {
          page_source_corpus: 'app/v1/src/content/docs',
          page_target_corpus: 'data/v2',
          public_source_corpus: 'app/v1/public',
          public_target_corpus: 'app/v2/public',
        },
      }, null, 2)}\n`,
    )

    await expect(checkV2OnlyTarget({ moduleRoot })).resolves.toMatchObject({
      targetVersion: 'v2',
    })
  })

  test('requires retirement evidence when a migrated fork enables that gate', async () => {
    const moduleRoot = await createV2Fixture()

    await expect(
      checkV2OnlyTarget({ moduleRoot, requireRetirementRecord: true }),
    ).rejects.toThrow('v1-runtime-retirement.json is required')
  })

  test('rejects retirement targets outside the canonical v2 corpus', async () => {
    const moduleRoot = await createV2Fixture()
    await mkdir(path.join(moduleRoot, 'data/v2/migration-records'), { recursive: true })
    await writeFile(
      path.join(moduleRoot, 'data/v2/migration-records/v1-runtime-retirement.json'),
      `${JSON.stringify({
        target_version: 'v2',
        target_corpus: '.',
        source_page_count: 1,
        identical_same_path: ['../../app/v2/package.json'],
      })}\n`,
    )

    await expect(checkV2OnlyTarget({ moduleRoot })).rejects.toThrow(
      'target_corpus must be data/v2/docs',
    )
  })

  test('rejects a symlinked retirement record', async () => {
    const moduleRoot = await createV2Fixture()
    const recordDirectory = path.join(moduleRoot, 'data/v2/migration-records')
    const externalRecord = path.join(moduleRoot, 'external-retirement-record.json')
    await mkdir(recordDirectory, { recursive: true })
    await writeFile(
      externalRecord,
      `${JSON.stringify({
        target_version: 'v2',
        target_corpus: 'data/v2/docs',
        source_page_count: 0,
      })}\n`,
    )
    await symlink(
      externalRecord,
      path.join(recordDirectory, 'v1-runtime-retirement.json'),
    )

    await expect(
      checkV2OnlyTarget({ moduleRoot, requireRetirementRecord: true }),
    ).rejects.toThrow('required as a real file')
  })

  test('rejects a target behind an intermediate symlink', async () => {
    const moduleRoot = await createV2Fixture()
    const recordDirectory = path.join(moduleRoot, 'data/v2/migration-records')
    const externalDocs = path.join(moduleRoot, 'external-docs')
    const legacyDocs = path.join(moduleRoot, 'app/v1/src/content/docs/linked')
    await Promise.all([
      mkdir(recordDirectory, { recursive: true }),
      mkdir(externalDocs, { recursive: true }),
      mkdir(legacyDocs, { recursive: true }),
    ])
    await writeFile(path.join(externalDocs, 'page.md'), '# Outside\n')
    await writeFile(path.join(legacyDocs, 'page.md'), '# Outside\n')
    git(moduleRoot, ['init', '-b', 'main'])
    git(moduleRoot, ['config', 'user.name', 'Knowledgebase Test'])
    git(moduleRoot, ['config', 'user.email', 'knowledgebase-test@example.invalid'])
    git(moduleRoot, ['add', '.'])
    git(moduleRoot, ['commit', '-m', 'Pre-cutover source'])
    const sourceRef = git(moduleRoot, ['rev-parse', 'HEAD'])
    await rm(path.join(moduleRoot, 'app/v1'), { recursive: true })
    await symlink(externalDocs, path.join(moduleRoot, 'data/v2/docs/linked'))
    await writeFile(
      path.join(recordDirectory, 'v1-runtime-retirement.json'),
      `${JSON.stringify({
        schema_version: 'lazurio.knowledgebase.v1_retirement.v1',
        source_ref: sourceRef,
        target_version: 'v2',
        target_corpus: 'data/v2/docs',
        source_corpus: 'app/v1/src/content/docs',
        source_page_count: 1,
        identical_same_path: ['linked/page.md'],
        rollback: {
          strategy: 'git-source-ref',
          source_ref: sourceRef,
          instructions: 'Restore the removed paths from source_ref.',
        },
      })}\n`,
    )

    await expect(checkV2OnlyTarget({ moduleRoot })).rejects.toThrow(
      'target is missing or unsafe: linked/page.md',
    )
  })

  test('rejects a superseded source without a v2 replacement target', async () => {
    const moduleRoot = await createV2Fixture()
    const recordDirectory = path.join(moduleRoot, 'data/v2/migration-records')
    const legacyDocs = path.join(moduleRoot, 'app/v1/src/content/docs/cs')
    await Promise.all([
      mkdir(recordDirectory, { recursive: true }),
      mkdir(legacyDocs, { recursive: true }),
    ])
    await writeFile(path.join(legacyDocs, 'retired.md'), '# Retired\n')
    git(moduleRoot, ['init', '-b', 'main'])
    git(moduleRoot, ['config', 'user.name', 'Knowledgebase Test'])
    git(moduleRoot, ['config', 'user.email', 'knowledgebase-test@example.invalid'])
    git(moduleRoot, ['add', '.'])
    git(moduleRoot, ['commit', '-m', 'Pre-cutover source'])
    const sourceRef = git(moduleRoot, ['rev-parse', 'HEAD'])
    await rm(path.join(moduleRoot, 'app/v1'), { recursive: true })
    await writeFile(
      path.join(recordDirectory, 'v1-runtime-retirement.json'),
      `${JSON.stringify({
        schema_version: 'lazurio.knowledgebase.v1_retirement.v1',
        source_ref: sourceRef,
        target_version: 'v2',
        target_corpus: 'data/v2/docs',
        source_corpus: 'app/v1/src/content/docs',
        source_page_count: 1,
        superseded: [{ source: 'cs/retired.md', targets: [] }],
        rollback: {
          strategy: 'git-source-ref',
          source_ref: sourceRef,
          instructions: 'Restore the removed paths from source_ref.',
        },
      })}\n`,
    )

    await expect(checkV2OnlyTarget({ moduleRoot })).rejects.toThrow(
      'superseded entries must declare safe v2 targets',
    )
  })

  test('compares retirement mappings and claimed bytes with the rollback commit', async () => {
    const moduleRoot = await createV2Fixture()
    const legacyDocs = path.join(moduleRoot, 'app/v1/src/content/docs/cs')
    const targetDocs = path.join(moduleRoot, 'data/v2/docs/cs')
    await Promise.all([
      mkdir(legacyDocs, { recursive: true }),
      mkdir(targetDocs, { recursive: true }),
    ])
    await Promise.all([
      writeFile(path.join(legacyDocs, 'one.md'), '# One\n'),
      writeFile(path.join(legacyDocs, 'two.md'), '# Two\n'),
      writeFile(path.join(targetDocs, 'one.md'), '# One\n'),
    ])
    git(moduleRoot, ['init', '-b', 'main'])
    git(moduleRoot, ['config', 'user.name', 'Knowledgebase Test'])
    git(moduleRoot, ['config', 'user.email', 'knowledgebase-test@example.invalid'])
    git(moduleRoot, ['add', '.'])
    git(moduleRoot, ['commit', '-m', 'Pre-cutover source'])
    const sourceRef = git(moduleRoot, ['rev-parse', 'HEAD'])
    await rm(path.join(moduleRoot, 'app/v1'), { recursive: true })
    const recordDirectory = path.join(moduleRoot, 'data/v2/migration-records')
    const recordPath = path.join(recordDirectory, 'v1-runtime-retirement.json')
    await mkdir(recordDirectory, { recursive: true })
    await writeFile(
      recordPath,
      `${JSON.stringify({
        schema_version: 'lazurio.knowledgebase.v1_retirement.v1',
        source_ref: sourceRef,
        target_version: 'v2',
        source_page_count: 1,
        source_corpus: 'app/v1/src/content/docs',
        target_corpus: 'data/v2/docs',
        identical_same_path: ['cs/one.md'],
        rollback: {
          strategy: 'git-source-ref',
          source_ref: sourceRef,
          instructions: 'Restore the v1 runtime from source_ref.',
        },
      })}\n`,
    )

    await expect(
      checkV2OnlyTarget({ moduleRoot, requireRetirementRecord: true }),
    ).rejects.toThrow('must exactly cover source_ref files')

    await writeFile(path.join(targetDocs, 'two.md'), '# Different\n')
    await writeFile(
      recordPath,
      `${JSON.stringify({
        schema_version: 'lazurio.knowledgebase.v1_retirement.v1',
        source_ref: sourceRef,
        target_version: 'v2',
        source_page_count: 2,
        source_corpus: 'app/v1/src/content/docs',
        target_corpus: 'data/v2/docs',
        identical_same_path: ['cs/one.md', 'cs/two.md'],
        rollback: {
          strategy: 'git-source-ref',
          source_ref: sourceRef,
          instructions: 'Restore the v1 runtime from source_ref.',
        },
      })}\n`,
    )
    await expect(
      checkV2OnlyTarget({ moduleRoot, requireRetirementRecord: true }),
    ).rejects.toThrow('falsely claims byte-identical content: cs/two.md')
  })

  test('requires and verifies legacy public asset coverage', async () => {
    const moduleRoot = await createV2Fixture()
    const legacyDocs = path.join(moduleRoot, 'app/v1/src/content/docs')
    const legacyPublic = path.join(moduleRoot, 'app/v1/public')
    await Promise.all([
      mkdir(legacyDocs, { recursive: true }),
      mkdir(legacyPublic, { recursive: true }),
    ])
    await writeFile(path.join(legacyPublic, 'favicon.svg'), '<svg>Legacy</svg>\n')
    await writeFile(path.join(moduleRoot, 'data/v2/public/favicon.svg'), '<svg>Legacy</svg>\n')
    git(moduleRoot, ['init', '-b', 'main'])
    git(moduleRoot, ['config', 'user.name', 'Knowledgebase Test'])
    git(moduleRoot, ['config', 'user.email', 'knowledgebase-test@example.invalid'])
    git(moduleRoot, ['add', '.'])
    git(moduleRoot, ['commit', '-m', 'Pre-cutover source'])
    const sourceRef = git(moduleRoot, ['rev-parse', 'HEAD'])
    await rm(path.join(moduleRoot, 'app/v1'), { recursive: true })
    const recordDirectory = path.join(moduleRoot, 'data/v2/migration-records')
    await mkdir(recordDirectory, { recursive: true })
    const record = {
      schema_version: 'lazurio.knowledgebase.v1_retirement.v1',
      source_ref: sourceRef,
      target_version: 'v2',
      source_page_count: 0,
      source_corpus: 'app/v1/src/content/docs',
      target_corpus: 'data/v2/docs',
      rollback: {
        strategy: 'git-source-ref',
        source_ref: sourceRef,
        instructions: 'Restore the removed v1 paths from source_ref.',
      },
    }
    const recordPath = path.join(recordDirectory, 'v1-runtime-retirement.json')
    await writeFile(recordPath, `${JSON.stringify(record)}\n`)
    await expect(
      checkV2OnlyTarget({ moduleRoot, requireRetirementRecord: true }),
    ).rejects.toThrow('public_assets must cover every legacy public file')

    record.public_assets = {
      source_file_count: 1,
      source_corpus: 'app/v1/public',
      target_corpus: 'data/v2/public',
      migrated_to_same_path: ['favicon.svg'],
    }
    await writeFile(recordPath, `${JSON.stringify(record)}\n`)
    await expect(
      checkV2OnlyTarget({ moduleRoot, requireRetirementRecord: true }),
    ).resolves.toMatchObject({ targetVersion: 'v2' })
  })

  test('verifies committed LF evidence from a clean CRLF checkout', async () => {
    const moduleRoot = await createV2Fixture()
    const legacyDocs = path.join(moduleRoot, 'app/v1/src/content/docs/cs')
    const targetPath = 'data/v2/docs/cs/index.md'
    await mkdir(legacyDocs, { recursive: true })
    await writeFile(path.join(legacyDocs, 'index.md'), '# Legacy\n')
    await mkdir(path.dirname(path.join(moduleRoot, targetPath)), { recursive: true })
    await writeFile(path.join(moduleRoot, targetPath), '# Legacy\n')
    git(moduleRoot, ['init', '-b', 'main'])
    git(moduleRoot, ['config', 'user.name', 'Knowledgebase Test'])
    git(moduleRoot, ['config', 'user.email', 'knowledgebase-test@example.invalid'])
    git(moduleRoot, ['add', '.'])
    git(moduleRoot, ['commit', '-m', 'Pre-cutover source'])
    const sourceRef = git(moduleRoot, ['rev-parse', 'HEAD'])
    await rm(path.join(moduleRoot, 'app/v1'), { recursive: true })
    const recordDirectory = path.join(moduleRoot, 'data/v2/migration-records')
    await mkdir(recordDirectory, { recursive: true })
    await writeFile(
      path.join(recordDirectory, 'v1-runtime-retirement.json'),
      `${JSON.stringify({
        schema_version: 'lazurio.knowledgebase.v1_retirement.v1',
        source_ref: sourceRef,
        target_version: 'v2',
        source_corpus: 'app/v1/src/content/docs',
        target_corpus: 'data/v2/docs',
        source_page_count: 1,
        migrated_to_same_path: ['cs/index.md'],
        public_assets: {
          source_file_count: 0,
          source_corpus: 'app/v1/public',
          target_corpus: 'data/v2/public',
        },
        rollback: {
          strategy: 'git-source-ref',
          source_ref: sourceRef,
          instructions: 'Restore the removed v1 paths from source_ref.',
        },
      }, null, 2)}\n`,
    )
    git(moduleRoot, ['add', '-A'])
    git(moduleRoot, ['commit', '-m', 'Retire v1'])
    git(moduleRoot, ['config', 'core.autocrlf', 'true'])
    await rm(path.join(moduleRoot, targetPath))
    git(moduleRoot, ['checkout', '--', targetPath])

    expect(await readFile(path.join(moduleRoot, targetPath), 'utf8')).toContain('\r\n')
    await expect(
      checkV2OnlyTarget({ moduleRoot, requireRetirementRecord: true }),
    ).resolves.toMatchObject({ targetVersion: 'v2' })
  })
})
