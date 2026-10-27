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

/**
 * Luogu renders tags as list links; their JSON payloads differ across builds,
 * so try the quoted `tags` array first and the anchor list second. Numeric tag
 * ids are ignored (the names live elsewhere).
 */
export function extractLuoguTags(html: string): string[] {
  const quoted = /"tags"\s*:\s*\[([^\]]*)\]/.exec(html)
  if (quoted?.[1]) {
    const names = [...quoted[1].matchAll(/"([^"]+)"\s*/g)].map((match) => match[1]!)
    if (names.length > 0) return [...new Set(names)]
  }
  const anchors = [...html.matchAll(/\/problem\/list\?tag=[^"]*"[^>]*>([^<]{1,24})</g)].map((match) =>
    match[1]!.trim(),
  )
  return [...new Set(anchors.filter((name) => name.length > 0))]
}
