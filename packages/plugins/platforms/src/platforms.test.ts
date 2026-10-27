import { describe, expect, it } from 'vitest'
import type { HostBridge } from '@shirone-studio/contracts'
import { adapters } from './adapters'

function hostWith(body: string): HostBridge {
  return {
    httpFetch: async () => body,
  } as unknown as HostBridge
}

const luogu = adapters.find((adapter) => adapter.id === 'luogu')!
const codeforces = adapters.find((adapter) => adapter.id === 'codeforces')!
const atcoder = adapters.find((adapter) => adapter.id === 'atcoder')!

const detect = (input: string) => adapters.find((adapter) => adapter.matches?.(input))?.id ?? null

describe('platform adapters', () => {
  it('parses URLs and bare IDs', () => {
    expect(luogu.parseInput('P2024')?.url).toBe('https://www.luogu.com.cn/problem/P2024')
    expect(luogu.parseInput('https://www.luogu.com.cn/problem/P2024')?.id).toBe('P2024')
    expect(codeforces.parseInput('2261E')?.contestId).toBe('2261')
    expect(codeforces.parseInput('https://codeforces.com/contest/2261/problem/E')?.index).toBe('E')
    expect(atcoder.parseInput('abc479_c')?.contestId).toBe('abc479')
    expect(
      atcoder.parseInput('https://atcoder.jp/contests/abc479/tasks/abc479_c')?.index,
    ).toBe('C')
  })

  it('detects the platform from an id or URL', () => {
    expect(detect('P2024')).toBe('luogu')
    expect(detect('https://www.luogu.com.cn/problem/P2024')).toBe('luogu')
    expect(detect('2261E')).toBe('codeforces')
    expect(detect('2272')).toBe('codeforces')
    expect(detect('https://codeforces.com/contest/2272')).toBe('codeforces')
    expect(detect('abc479_c')).toBe('atcoder')
    expect(detect('https://atcoder.jp/contests/abc479')).toBe('atcoder')
    expect(detect('随便什么')).toBe(null)
  })

  it('fetches and formats Luogu titles', async () => {
    const meta = await luogu.fetchProblem(
      hostWith('<title>P2024 [NOI2001] 食物链 - 洛谷</title>'),
      luogu.parseInput('P2024')!,
    )
    expect(meta.displayTitle).toBe('洛谷 P2024 [NOI2001] 食物链')
    expect(luogu.suggestSlug(meta)).toBe('lg-p2024')
    expect(luogu.suggestedTags(meta)).toEqual(['洛谷'])
  })

  it('reads Luogu tag names with a login cookie', async () => {
    const problem = '<script id="lentille-context" type="application/json">{"data":{"problem":{"tags":[18,47]}}}</script>'
    const calls: Array<{ url: string; cookie?: string }> = []
    const host = {
      httpFetch: async (url: string, options?: { cookie?: string }) => {
        calls.push({ url, cookie: options?.cookie })
        if (url.includes('tag=18')) return '<a href="/problem/list?tag=18">2001</a>'
        if (url.includes('tag=47')) return '<a href="/problem/list?tag=47">并查集</a>'
        return problem
      },
    } as unknown as HostBridge
    const meta = await luogu.fetchProblem(host, luogu.parseInput('P2024')!, {
      cookie: '_uid=1129046',
    })
    expect(meta.tags).toEqual(['洛谷', '2001', '并查集'])
    expect(calls.every((call) => call.cookie === '_uid=1129046')).toBe(true)
  })

  it('keeps only the platform tag without a Luogu cookie', async () => {
    const problem = '<script id="lentille-context" type="application/json">{"data":{"problem":{"tags":[18,47]}}}</script>'
    const meta = await luogu.fetchProblem(hostWith(problem), luogu.parseInput('P2024')!)
    expect(meta.tags).toEqual(['洛谷'])
  })

  it('fetches and formats AtCoder titles', async () => {
    const meta = await atcoder.fetchProblem(
      hostWith('<title>C - Bento Packing</title>'),
      atcoder.parseInput('abc479_c')!,
    )
    expect(meta.displayTitle).toBe('AtCoder ABC479 C Bento Packing')
    expect(atcoder.suggestSlug(meta)).toBe('at-abc-479-c')
  })

  it('fetches and formats Codeforces problems', async () => {
    const meta = await codeforces.fetchProblem(
      hostWith(
        JSON.stringify({
          result: { problems: [{ contestId: 2261, index: 'E', name: 'Example', tags: ['dp'] }] },
        }),
      ),
      codeforces.parseInput('2261E')!,
    )
    expect(meta.displayTitle).toBe('Codeforces 2261E Example')
    expect(codeforces.suggestSlug(meta)).toBe('cf-2261e')
  })

  it('translates the tags a problem page reports', async () => {
    const meta = await codeforces.fetchProblem(
      hostWith(
        JSON.stringify({
          result: {
            problems: [
              { contestId: 2261, index: 'E', name: 'Example', tags: ['dp', 'greedy', 'trees'] },
            ],
          },
        }),
      ),
      codeforces.parseInput('2261E')!,
    )
    expect(meta.tags).toEqual(['Codeforces', '动态规划', '贪心', '树'])
  })

  it('recognises Codeforces contest URLs and fills name and tags', async () => {
    const ref = codeforces.parseInput('https://codeforces.com/contest/2272')!
    expect(ref.contestId).toBe('2272')
    expect(ref.index).toBeUndefined()
    expect(codeforces.parseInput('2272')?.contestId).toBe('2272')
    expect(codeforces.supportsContest).toBe(true)

    const meta = await codeforces.fetchProblem(
      hostWith(
        JSON.stringify({
          result: { contest: { id: 2272, name: 'Codeforces Round 2272 (Div. 2)' } },
        }),
      ),
      ref,
    )
    expect(meta.displayTitle).toBe('Codeforces Round 2272 (Div. 2)')
    expect(meta.contestTitle).toBe('Codeforces Round 2272 (Div. 2)')
    expect(meta.tags).toEqual(['Codeforces', '模拟赛', 'Div. 2'])
    expect(codeforces.suggestSlug(meta)).toBe('cf-2272')
    expect(codeforces.suggestTitle(meta)).toBe('Codeforces Round 2272 (Div. 2)')
  })

  it('recognises AtCoder contest URLs', async () => {
    const ref = atcoder.parseInput('https://atcoder.jp/contests/abc479')!
    expect(ref.contestId).toBe('abc479')
    expect(ref.index).toBeUndefined()
    const meta = await atcoder.fetchProblem(
      hostWith('<title>AtCoder Beginner Contest 479 - AtCoder</title>'),
      ref,
    )
    expect(meta.displayTitle).toBe('AtCoder Beginner Contest 479')
    expect(meta.tags).toEqual(['AtCoder', '模拟赛', 'ABC'])
    expect(atcoder.suggestSlug(meta)).toBe('at-abc-479')
  })
})
