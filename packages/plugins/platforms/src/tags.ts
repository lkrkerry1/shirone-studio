/**
 * Unify platform tags into the blog's Chinese vocabulary.
 *
 * Codeforces answers its own English tag list (`dp`, `greedy`, …); the blog
 * tags are Chinese, so they are translated here instead of leaking both.
 */
const CODEFORCES_TAGS: Record<string, string> = {
  implementation: '实现',
  math: '数学',
  greedy: '贪心',
  dp: '动态规划',
  'data structures': '数据结构',
  'brute force': '暴力',
  'constructive algorithms': '构造',
  graphs: '图论',
  sortings: '排序',
  'binary search': '二分',
  'dfs and similar': 'DFS',
  trees: '树',
  strings: '字符串',
  'number theory': '数论',
  combinatorics: '组合数学',
  geometry: '几何',
  bitmasks: '位运算',
  'two pointers': '双指针',
  dsu: '并查集',
  'shortest paths': '最短路',
  probabilities: '概率论',
  'divide and conquer': '分治',
  hashing: '哈希',
  games: '博弈论',
  flows: '网络流',
  interactive: '交互',
  matrices: '矩阵',
  'ternary search': '三分',
  fft: 'FFT',
  'meet-in-the-middle': '折半搜索',
  'string suffix structures': '后缀结构',
  'expression parsing': '表达式解析',
  'graph matchings': '图匹配',
  'chinese remainder theorem': '中国剩余定理',
  schedules: '调度',
  'sqrt decomposition': '分块',
  '*special': '特殊题',
  '2-sat': '2-SAT',
}

export function translateCodeforcesTags(tags: string[] | undefined): string[] {
  const translated = new Set<string>()
  for (const tag of tags ?? []) {
    const value = CODEFORCES_TAGS[tag] ?? tag
    if (value) translated.add(value)
  }
  return [...translated]
}

/** Numeric tag ids from a Luogu problem page (the lentille-context payload). */
export function luoguTagIds(html: string): number[] {
  const context = /<script id="lentille-context"[^>]*>([\s\S]*?)<\/script>/.exec(html)
  if (context?.[1]) {
    try {
      const parsed = JSON.parse(context[1]) as {
        data?: { problem?: { tags?: unknown } }
      }
      const tags = parsed.data?.problem?.tags
      if (Array.isArray(tags)) {
        return [...new Set(tags.filter((tag): tag is number => typeof tag === 'number'))]
      }
    } catch {
      // Fall through to the loose match below.
    }
  }
  const loose = /"tags"\s*:\s*\[([\d,\s]*)\]/.exec(html)
  if (!loose?.[1]) return []
  return [...new Set(loose[1].split(',').map((part) => Number.parseInt(part, 10)).filter(Number.isFinite))]
}

/**
 * A tag's display name from a filtered problem-list page, e.g.
 * `<a href="/problem/list?tag=47">并查集</a>`.
 */
export function luoguTagName(html: string, id: number): string | null {
  const pattern = new RegExp(
    `<a[^>]+href="/problem/list\\?tag=${id}"[^>]*>([^<]{1,32})</a>`,
    'i',
  )
  const match = pattern.exec(html)
  const name = match?.[1]?.trim()
  return name ? name : null
}
