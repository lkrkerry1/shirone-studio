import type { HostBridge, PlatformAdapter, ProblemMeta, ProblemRef } from '@shirone-studio/contracts'

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function htmlTitle(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  return match ? decodeEntities(match[1] ?? '') : ''
}

function contestSlug(contestId: string): string {
  if (contestId.includes('-')) return contestId.toLowerCase()
  const match = /^([a-z]+)(\d+)$/i.exec(contestId)
  return match ? `${match[1]!.toLowerCase()}-${match[2]}` : contestId.toLowerCase()
}

const luogu: PlatformAdapter = {
  id: 'luogu',
  name: '洛谷',
  slugPrefix: 'lg-',
  supportsContest: false,
  parseInput(input) {
    const text = input.trim()
    const url = /luogu\.com\.cn\/problem\/([A-Za-z]+\d+[A-Za-z0-9]*)/i.exec(text)
    const id = url?.[1] ?? (/^[A-Za-z]+\d+[A-Za-z0-9]*$/.test(text) ? text : '')
    if (!id) return null
    const upper = id.toUpperCase()
    return { platform: 'luogu', id: upper, url: `https://www.luogu.com.cn/problem/${upper}` }
  },
  async fetchProblem(host: HostBridge, ref: ProblemRef): Promise<ProblemMeta> {
    const html = await host.httpFetch(ref.url)
    const raw = htmlTitle(html).replace(/\s*-\s*洛谷\s*$/i, '')
    const title = raw || ref.id
    return {
      platform: 'luogu',
      problemId: ref.id,
      title,
      displayTitle: `洛谷 ${title}`,
      url: ref.url,
      tags: ['洛谷'],
    }
  },
  suggestSlug(meta) {
    return `lg-${meta.problemId.toLowerCase()}`
  },
  suggestTitle(meta) {
    return meta.displayTitle
  },
  suggestedTags(meta) {
    return meta.tags ?? ['洛谷']
  },
}

interface CodeforcesProblem {
  contestId?: number
  index?: string
  name?: string
  tags?: string[]
}

const codeforces: PlatformAdapter = {
  id: 'codeforces',
  name: 'Codeforces',
  slugPrefix: 'cf-',
  supportsContest: false,
  parseInput(input) {
    const text = input.trim()
    const url = /codeforces\.com\/(?:contest|problemset\/problem)\/(\d+)\/(?:problem\/)?([A-Z]\d?)/i.exec(
      text,
    )
    const bare = /^(\d+)\s*([A-Z]\d?)$/i.exec(text)
    const contestId = url?.[1] ?? bare?.[1]
    const index = (url?.[2] ?? bare?.[2])?.toUpperCase()
    if (!contestId || !index) return null
    return {
      platform: 'codeforces',
      id: `${contestId}${index}`,
      contestId,
      index,
      url: `https://codeforces.com/problemset/problem/${contestId}/${index}`,
    }
  },
  async fetchProblem(host: HostBridge, ref: ProblemRef): Promise<ProblemMeta> {
    const body = await host.httpFetch('https://codeforces.com/api/problemset.problems')
    const parsed = JSON.parse(body) as { result?: { problems?: CodeforcesProblem[] } }
    const problem = parsed.result?.problems?.find(
      (item) => String(item.contestId) === ref.contestId && item.index === ref.index,
    )
    const name = problem?.name ?? ref.id
    const displayTitle = `Codeforces ${ref.contestId}${ref.index} ${name}`
    return {
      platform: 'codeforces',
      problemId: ref.id,
      contestId: ref.contestId,
      index: ref.index,
      title: name,
      displayTitle,
      url: ref.url,
      tags: ['Codeforces'],
    }
  },
  suggestSlug(meta) {
    return `cf-${meta.contestId ?? ''}${(meta.index ?? '').toLowerCase()}`
  },
  suggestTitle(meta) {
    return meta.displayTitle
  },
  suggestedTags(meta) {
    return meta.tags ?? ['Codeforces']
  },
}

const atcoder: PlatformAdapter = {
  id: 'atcoder',
  name: 'AtCoder',
  slugPrefix: 'at-',
  supportsContest: false,
  parseInput(input) {
    const text = input.trim()
    const url = /atcoder\.jp\/contests\/([^/]+)\/tasks\/([^/?#]+)/i.exec(text)
    const bare = /^([a-z0-9]+)_([a-z]\d?)$/i.exec(text)
    const contestId = url?.[1] ?? bare?.[1]
    const task = url?.[2] ?? bare?.[0]
    if (!contestId || !task) return null
    const index = (/[_-]([a-z]\d?)$/i.exec(task)?.[1] ?? '').toUpperCase()
    return {
      platform: 'atcoder',
      id: task,
      contestId,
      index,
      url: `https://atcoder.jp/contests/${contestId}/tasks/${task}`,
    }
  },
  async fetchProblem(host: HostBridge, ref: ProblemRef): Promise<ProblemMeta> {
    const html = await host.httpFetch(ref.url)
    const raw = htmlTitle(html)
    const name = raw.replace(/^[A-Z]\d?\s*-\s*/, '') || ref.id
    const contest = (ref.contestId ?? '').toUpperCase()
    return {
      platform: 'atcoder',
      problemId: ref.id,
      contestId: ref.contestId,
      index: ref.index,
      title: name,
      displayTitle: `AtCoder ${contest} ${ref.index ?? ''} ${name}`.replace(/\s+/g, ' ').trim(),
      url: ref.url,
      tags: ['AtCoder'],
    }
  },
  suggestSlug(meta) {
    return `at-${contestSlug(meta.contestId ?? '')}-${(meta.index ?? '').toLowerCase()}`
  },
  suggestTitle(meta) {
    return meta.displayTitle
  },
  suggestedTags(meta) {
    return meta.tags ?? ['AtCoder']
  },
}

const manual: PlatformAdapter = {
  id: 'manual',
  name: '手动 / 其他',
  slugPrefix: '',
  supportsContest: false,
  parseInput(input) {
    const text = input.trim()
    if (!text) return null
    return { platform: 'manual', id: text, url: '' }
  },
  async fetchProblem(_host, ref) {
    return {
      platform: 'manual',
      problemId: ref.id,
      title: ref.id,
      displayTitle: ref.id,
      url: '',
      tags: [],
    }
  },
  suggestSlug(meta) {
    return meta.problemId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  },
  suggestTitle(meta) {
    return meta.title
  },
  suggestedTags() {
    return []
  },
}

export const adapters = [luogu, codeforces, atcoder, manual]
