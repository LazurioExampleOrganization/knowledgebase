import { afterEach, describe, expect, test } from 'bun:test'
import { lstat, mkdir, mkdtemp, realpath, rm, symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ensureKnowledgebaseDataMount } from './ensure-data-mount.mjs'

const temporaryRoots = []

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function fixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'knowledgebase-data-mount-'))
  temporaryRoots.push(root)
  await mkdir(path.join(root, 'data/v2/docs'), { recursive: true })
  await mkdir(path.join(root, 'app/v2/src'), { recursive: true })
  return root
}

describe('Knowledgebase v2 Starlight data mount', () => {
  test('creates one managed link and reuses it idempotently', async () => {
    const moduleRoot = await fixtureRoot()
    const first = await ensureKnowledgebaseDataMount({ moduleRoot })
    const second = await ensureKnowledgebaseDataMount({ moduleRoot })

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect((await lstat(first.mountPath)).isSymbolicLink()).toBe(true)
    expect(await realpath(first.mountPath)).toBe(await realpath(first.dataRoot))
  })

  test('refuses an unmanaged directory at the Starlight mount path', async () => {
    const moduleRoot = await fixtureRoot()
    await mkdir(path.join(moduleRoot, 'app/v2/src/content/docs'), { recursive: true })

    await expect(ensureKnowledgebaseDataMount({ moduleRoot })).rejects.toThrow(
      'is not a managed link',
    )
  })

  test('refuses a link that points outside the canonical data directory', async () => {
    const moduleRoot = await fixtureRoot()
    const otherRoot = path.join(moduleRoot, 'other-docs')
    const mountPath = path.join(moduleRoot, 'app/v2/src/content/docs')
    await mkdir(otherRoot, { recursive: true })
    await mkdir(path.dirname(mountPath), { recursive: true })
    await symlink(otherRoot, mountPath, process.platform === 'win32' ? 'junction' : 'dir')

    await expect(ensureKnowledgebaseDataMount({ moduleRoot })).rejects.toThrow(
      'expected',
    )
  })

  test('refuses a linked ancestor in the canonical data path', async () => {
    const moduleRoot = await mkdtemp(path.join(os.tmpdir(), 'knowledgebase-data-mount-'))
    temporaryRoots.push(moduleRoot)
    const outsideData = path.join(moduleRoot, 'outside-data')
    await mkdir(path.join(outsideData, 'v2/docs'), { recursive: true })
    await mkdir(path.join(moduleRoot, 'app/v2/src'), { recursive: true })
    await symlink(
      outsideData,
      path.join(moduleRoot, 'data'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )

    await expect(ensureKnowledgebaseDataMount({ moduleRoot })).rejects.toThrow(
      'must be a real directory',
    )
  })

  test('refuses a linked ancestor in the runtime mount path', async () => {
    const moduleRoot = await fixtureRoot()
    const outsideContent = path.join(moduleRoot, 'outside-content')
    await mkdir(outsideContent, { recursive: true })
    await symlink(
      outsideContent,
      path.join(moduleRoot, 'app/v2/src/content'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )

    await expect(ensureKnowledgebaseDataMount({ moduleRoot })).rejects.toThrow(
      'must be a real directory',
    )
  })
})
