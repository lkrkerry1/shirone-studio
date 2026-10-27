import { parse } from 'yaml'

export interface SplitFrontmatter {
  raw: string
  body: string
  data: Record<string, unknown>
  eol: 'lf' | 'crlf'
  bom: boolean
}

export class FrontmatterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FrontmatterError'
  }
}

const FRONTMATTER_OPEN = /^---\s*$/
const FRONTMATTER_CLOSE = /^(---|\.\.\.)\s*$/

export function splitFrontmatter(source: string): SplitFrontmatter {
  const bom = source.startsWith('\uFEFF')
  const text = bom ? source.slice(1) : source
  const eol: 'lf' | 'crlf' = text.includes('\r\n') ? 'crlf' : 'lf'
  const normalized = text.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')

  if (lines.length === 0 || !FRONTMATTER_OPEN.test(lines[0] ?? '')) {
    return { raw: '', body: text, data: {}, eol, bom }
  }

  let close = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (FRONTMATTER_CLOSE.test(lines[index] ?? '')) {
      close = index
      break
    }
  }
  if (close === -1) {
    throw new FrontmatterError('Frontmatter opening delimiter has no closing delimiter')
  }

  const raw = lines.slice(0, close + 1).join('\n')
  const body = lines.slice(close + 1).join('\n')
  const yaml = lines.slice(1, close).join('\n')
  let data: Record<string, unknown> = {}
  if (yaml.trim().length > 0) {
    let parsed: unknown
    try {
      parsed = parse(yaml)
    } catch (error) {
      throw new FrontmatterError(
        `Invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
    if (parsed === null || parsed === undefined) {
      data = {}
    } else if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new FrontmatterError('Frontmatter must be a YAML mapping')
    } else {
      data = parsed as Record<string, unknown>
    }
  }

  return { raw, body, data, eol, bom }
}

export interface SerializeOptions {
  /** Preferred key order; unknown keys keep their original order after these. */
  order?: string[]
  /** Preserve the source BOM. Defaults to false for new files. */
  bom?: boolean
}

export function serializeFrontmatter(
  data: Record<string, unknown>,
  options: SerializeOptions = {},
): string {
  const order = options.order ?? []
  const keys = [
    ...order.filter((key) => data[key] !== undefined),
    ...Object.keys(data).filter((key) => !order.includes(key) && data[key] !== undefined),
  ]
  const lines = keys.map((key) => {
    const value = formatValue(data[key], 0)
    return value.startsWith('\n') ? `${key}:${value}` : `${key}: ${value}`
  })
  return `${options.bom ? '\uFEFF' : ''}---\n${lines.join('\n')}\n---`
}

export function composeFrontmatter(
  split: Pick<SplitFrontmatter, 'raw' | 'body' | 'eol' | 'bom'>,
  raw = split.raw,
): string {
  const body = split.body
  if (raw.length === 0) return `${split.bom ? '\uFEFF' : ''}${body}`
  const eol = split.eol === 'crlf' ? '\r\n' : '\n'
  const normalizedRaw = raw.replace(/\r\n/g, '\n').replace(/\n/g, eol)
  const normalizedBody = body.replace(/\r\n/g, '\n').replace(/\n/g, eol)
  return `${split.bom ? '\uFEFF' : ''}${normalizedRaw}${eol}${normalizedBody}`
}

const SAFE_PLAIN = /^[^\s:#[\]{}&*!|>'"%@`,]+$/
/**
 * ISO-8601 timestamps carry colons but are plain YAML timestamps, not strings
 * that need quoting: the blog's moment `published` is written unquoted.
 */
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

function formatScalar(value: unknown): string {
  if (value instanceof Date) return formatDate(value)
  if (typeof value === 'string') {
    if (value.length === 0) return '""'
    if (ISO_TIMESTAMP.test(value)) return value
    if (
      !SAFE_PLAIN.test(value) ||
      /^(true|false|null|~)$/i.test(value) ||
      /^[-+]?\d+(?:\.\d+)?$/.test(value)
    ) {
      return JSON.stringify(value)
    }
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null) return 'null'
  return JSON.stringify(value)
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatValue(value: unknown, indent: number): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return `[${value.map(formatScalar).join(', ')}]`
    }
    const pad = ' '.repeat(indent + 2)
    const lines: string[] = []
    for (const item of value) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const entries = Object.entries(item as Record<string, unknown>)
        const first = entries[0]
        if (!first) {
          lines.push(`${pad}- {}`)
          continue
        }
        lines.push(`${pad}- ${first[0]}: ${formatScalar(first[1])}`)
        for (const [childKey, childValue] of entries.slice(1)) {
          lines.push(`${pad}  ${childKey}: ${formatScalar(childValue)}`)
        }
      } else {
        lines.push(`${pad}- ${formatScalar(item)}`)
      }
    }
    return `\n${lines.join('\n')}`
  }
  if (value && typeof value === 'object') {
    const pad = ' '.repeat(indent + 2)
    const lines = Object.entries(value as Record<string, unknown>).map(
      ([childKey, childValue]) => `${pad}${childKey}: ${formatScalar(childValue)}`,
    )
    return `\n${lines.join('\n')}`
  }
  return formatScalar(value)
}
