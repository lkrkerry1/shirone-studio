export interface AssetPathOptions {
  src: string
  layoutRoot: string
  contentPath: string
  publicRoot: string
}

export function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const absolute = normalized.startsWith('/')
  const parts: string[] = []
  for (const part of normalized.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      parts.pop()
      continue
    }
    parts.push(part)
  }
  return `${absolute ? '/' : ''}${parts.join('/')}`
}

export function dirname(path: string): string {
  const normalized = normalizePath(path)
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '' : normalized.slice(0, index)
}

/**
 * Resolve an author-facing image/media URL to an absolute local path.
 * Returns null for URLs the webview should load itself.
 */
export function resolveAssetPath(options: AssetPathOptions): string | null {
  const src = options.src.trim()
  if (src === '' || /^(?:[a-z]+:)?\/\//i.test(src) || /^(?:data|blob|mailto):/i.test(src) || src.startsWith('#')) {
    return null
  }
  const withoutQuery = src.split(/[?#]/, 1)[0]!
  if (withoutQuery.startsWith('/')) {
    return normalizePath(`${options.publicRoot}/${withoutQuery.slice(1)}`)
  }
  const base = dirname(`${options.layoutRoot}/${options.contentPath}`)
  return normalizePath(`${base}/${withoutQuery}`)
}
