import type { Validation } from '@shirone-studio/contracts'

export function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:[+-]\d{2}:\d{2}|Z)?)?$/.test(value)
}

export function dateValue(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value.slice(0, 10)
  return undefined
}

export function validateDateOrder(
  published: unknown,
  updated: unknown,
): Validation[] {
  if (!isValidDate(published)) {
    return [{ level: 'error', message: 'published 必须是 YYYY-MM-DD 或完整时间戳' }]
  }
  if (updated === undefined) return []
  if (!isValidDate(updated)) {
    return [{ level: 'error', message: 'updated 必须是 YYYY-MM-DD 或完整时间戳' }]
  }
  if ((dateValue(updated) ?? '') < (dateValue(published) ?? '')) {
    return [{ level: 'error', message: 'updated 不能早于 published' }]
  }
  return []
}

export function validateDescription(description: unknown): Validation[] {
  if (description === undefined || description === null || description === '') {
    return [{ level: 'warning', message: 'description 建议填写（列表卡片与 SEO 会使用）' }]
  }
  if (typeof description !== 'string') {
    return [{ level: 'error', message: 'description 必须是字符串' }]
  }
  const issues: Validation[] = []
  if (/^\s*\d*\s*题题解[:：]/.test(description)) {
    issues.push({ level: 'warning', message: 'description 不要加「N 题题解：」前缀' })
  }
  if (description.length < 50) {
    issues.push({ level: 'warning', message: 'description 偏短（建议 50–120 字）' })
  }
  if (description.length > 120) {
    issues.push({ level: 'warning', message: 'description 偏长（建议 50–120 字）' })
  }
  if (/。$/.test(description)) {
    issues.push({ level: 'info', message: '概述型 description 通常不加句号' })
  }
  return issues
}

export function validateTags(tags: unknown): Validation[] {
  if (tags === undefined) return []
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
    return [{ level: 'error', message: 'tags 必须是字符串数组' }]
  }
  const issues: Validation[] = []
  if (tags.length < 2 || tags.length > 3) {
    issues.push({ level: 'warning', message: 'tags 建议 2–3 个' })
  }
  if (tags.includes('题解')) {
    issues.push({ level: 'warning', message: '不要把 category（题解）当作 tag' })
  }
  if (new Set(tags).size !== tags.length) {
    issues.push({ level: 'warning', message: 'tags 有重复项' })
  }
  return issues
}
