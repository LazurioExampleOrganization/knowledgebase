import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveMainListener } from '../../../runtime-listener.mjs'

const appRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const { host, port } = resolveMainListener({})

for (const task of ['dev', 'preview']) {
  const blocker = createServer()

  await new Promise((resolve, reject) => {
    blocker.once('error', reject)
    blocker.listen(port, host, resolve)
  })

  const child = spawn(process.execPath, ['scripts/run-astro.mjs', task], {
    cwd: appRoot,
    env: {
      ...process.env,
      CI: '1',
      HOST: '0.0.0.0',
      PORT: '65000',
      EDITOR_PORT: '65001',
      LAZURIO_RUNTIME_HOST: host,
      LAZURIO_RUNTIME_PORT: String(port),
      LAZURIO_RUNTIME_LISTENER_APP_HOST: host,
      LAZURIO_RUNTIME_LISTENER_APP_PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    output += chunk.toString()
  })

  const timeout = setTimeout(() => child.kill('SIGTERM'), 10_000)
  const [code, signal] = await once(child, 'exit')
  clearTimeout(timeout)
  await new Promise((resolve) => blocker.close(resolve))

  assert.equal(signal, null, `${task} strict-port test timed out or was terminated: ${output}`)
  assert.notEqual(code, 0, `${task} must fail when its manifest port ${port} is occupied`)
  assert.match(output, /port .*already in use|address already in use|EADDRINUSE/i)
}

console.log('ok - Knowledgebase dev i preview odmítly obsazený port')
