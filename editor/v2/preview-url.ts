const WILDCARD_HOSTS = new Set(['0.0.0.0', '::', '[::]'])

export function browserPreviewHost(bindHost: unknown): string {
  const host = String(bindHost ?? '').trim() || '127.0.0.1'
  if (WILDCARD_HOSTS.has(host)) return 'localhost'
  if (host.includes(':') && !host.startsWith('[')) return `[${host}]`
  return host
}

export function createPreviewBaseUrl({
  bindHost,
  previewHost,
  port,
}: {
  bindHost: unknown
  previewHost?: unknown
  port: unknown
}): string {
  const host = browserPreviewHost(previewHost || bindHost)
  return `http://${host}:${String(port)}`
}
