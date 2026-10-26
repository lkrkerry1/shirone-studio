export {
  defineContentType,
  defineDataContentType,
} from '@shirone-studio/contracts/content'
export type {
  ContentDocument,
  ContentDraft,
  ContentSummary,
  ContentTypeDefinition,
  DataContentType,
  DataDocument,
  Validation,
} from '@shirone-studio/contracts/content'

// Keep the public type surface available for plugins that only use content kit.
export type { FieldDefinition, ProjectLayout } from '@shirone-studio/contracts'

export function joinPath(base: string, ...parts: string[]): string {
  return [base.replace(/[\\/]+$/, ''), ...parts].join('/')
}

export function relativeTo(root: string, absolute: string): string {
  const normalizedRoot = root.replace(/[\\/]+$/, '').replace(/\\/g, '/')
  const normalized = absolute.replace(/\\/g, '/')
  if (!normalized.startsWith(`${normalizedRoot}/`)) {
    throw new Error(`Path is not inside project root: ${absolute}`)
  }
  return normalized.slice(normalizedRoot.length + 1)
}

export function validateSlug(slug: string): string | undefined {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'slug 必须是全小写 ASCII kebab-case'
  }
  if (slug.length > 80) return 'slug 不能超过 80 字符'
  if (slug === 'index') return 'slug 不能是 index'
  return undefined
}

export function assertSlug(slug: string): void {
  const error = validateSlug(slug)
  if (error) throw new Error(error)
}

export function today(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function nowWithOffset(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const offsetMinutes = -now.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const offset = `${sign}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${offset}`
}
