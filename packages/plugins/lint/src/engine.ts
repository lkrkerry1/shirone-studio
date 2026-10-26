import type { LintDiagnostic, LintFix } from '@shirone-studio/contracts'
import { collectProtectedRanges, maskSource } from '@shirone-studio/plugin-syntax-shirone'

type RuleContext = {
  body: string
  masked: string
  lineStarts: number[]
}

const FULLWIDTH: Record<string, string> = {
  ',': '，',
  ';': '；',
  ':': '：',
  '!': '！',
  '?': '？',
}

function starts(body: string): number[] {
  const starts = [0]
  for (let index = 0; index < body.length; index += 1) {
    if (body[index] === '\n') starts.push(index + 1)
  }
  return starts
}

function lineAt(starts: number[], offset: number): number {
  let low = 0
  let high = starts.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (starts[mid]! <= offset) low = mid + 1
    else high = mid - 1
  }
  return Math.max(0, high)
}

function fix(label: string, from: number, to: number, insert: string): LintFix {
  return { label, from, to, insert }
}

function checkHeadings(context: RuleContext): LintDiagnostic[] {
  const out: LintDiagnostic[] = []
  for (const match of context.masked.matchAll(/^ {0,3}#\s.*$/gm)) {
    out.push({
      ruleId: 'h1-in-body',
      severity: 'error',
      message: '正文不要写一级标题（会和 frontmatter title 重复）',
      from: match.index ?? 0,
      to: (match.index ?? 0) + (match[0]?.length ?? 0),
    })
  }
  return out
}

function checkCodeFences(context: RuleContext): LintDiagnostic[] {
  const out: LintDiagnostic[] = []
  const lines = context.body.split('\n')
  let inFence = false
  let fenceChar = ''
  let fenceLength = 0
  let offset = 0
  for (const line of lines) {
    const open = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (!inFence && open) {
      inFence = true
      fenceChar = open[1]![0]!
      fenceLength = open[1]!.length
      const info = open[2]!.trim()
      if (info.length === 0) {
        out.push({
          ruleId: 'code-fence-language',
          severity: 'error',
          message: '代码块必须标注语言（如 ```cpp）',
          from: offset,
          to: offset + line.length,
        })
      }
    } else if (
      inFence &&
      new RegExp(`^ {0,3}${fenceChar === '`' ? '`' : '~'}{${fenceLength},}\\s*$`).test(line)
    ) {

      inFence = false
    }
    offset += line.length + 1
  }
  return out
}

function checkCjkLatin(context: RuleContext): LintDiagnostic[] {
  const out: LintDiagnostic[] = []
  const pattern =
    /([\p{Script=Han}])([A-Za-z0-9])|([A-Za-z0-9])([\p{Script=Han}])/gu
  for (const match of context.masked.matchAll(pattern)) {
    const index = match.index ?? 0
    out.push({
      ruleId: 'cjk-latin-space',
      severity: 'warning',
      message: '中文与英文/数字之间需要半角空格',
      from: index + 1,
      to: index + 1,
      fix: fix('插入空格', index + 1, index + 1, ' '),
    })
  }
  return out
}

function checkPunctuation(context: RuleContext): LintDiagnostic[] {
  const out: LintDiagnostic[] = []
  for (const match of context.masked.matchAll(
    /([\p{Script=Han}])[ \t]+([，。！？；：、])|([，。！？；：、])[ \t]+([\p{Script=Han}])/gu,
  )) {
    const index = match.index ?? 0
    const text = match[0]!
    const replacement = text.replace(/[ \t]+/g, '')
    out.push({
      ruleId: 'cjk-punct-space',
      severity: 'warning',
      message: '全角标点前后不要加空格',
      from: index,
      to: index + text.length,
      fix: fix('删除空格', index, index + text.length, replacement),
    })
  }
  for (const match of context.masked.matchAll(/([\p{Script=Han}])([,;:!?])/gu)) {
    const index = match.index ?? 0
    const punctuation = match[2]!
    out.push({
      ruleId: 'ascii-punct-in-cjk',
      severity: 'warning',
      message: '中文语境请使用全角标点',
      from: index,
      to: index + match[0]!.length,
      fix: fix('替换为全角', index + 1, index + 2, FULLWIDTH[punctuation] ?? punctuation),
    })
  }
  return out
}

function checkFirstBlock(context: RuleContext): LintDiagnostic[] {
  const lines = context.body.split('\n')
  const index = lines.findIndex((line) => line.trim().length > 0)
  if (index === -1) return []
  const line = lines[index]!.trim()
  const startsBad = /^(#{1,6}\s|[-*+]\s|>\s|```|~~~|\|)/.test(line)
  if (!startsBad) return []
  const offset = lines.slice(0, index).reduce((sum, item) => sum + item.length + 1, 0)
  return [
    {
      ruleId: 'opening-paragraph',
      severity: 'warning',
      message: '正文第一块建议是普通段落（列表卡片摘要会取它）',
      from: offset,
      to: offset + line.length,
    },
  ]
}

function checkDirectiveBalance(context: RuleContext): LintDiagnostic[] {
  const open = context.body.match(/^ {0,3}:{3,4}\s*[a-z]/gm)?.length ?? 0
  const close = context.body.match(/^ {0,3}:{3,4}\s*$/gm)?.length ?? 0
  if (open === close) return []
  return [
    {
      ruleId: 'directive-balance',
      severity: 'warning',
      message: `容器指令可能未闭合：打开 ${open} 个，关闭 ${close} 个`,
      from: 0,
      to: Math.min(context.body.length, 80),
    },
  ]
}

export function checkBody(body: string, contentType = 'posts'): LintDiagnostic[] {
  const context: RuleContext = {
    body,
    masked: maskSource(body, collectProtectedRanges(body)),
    lineStarts: starts(body),
  }
  const diagnostics = [
    ...checkHeadings(context),
    ...checkCodeFences(context),
    ...checkCjkLatin(context),
    ...checkPunctuation(context),
    ...checkFirstBlock(context),
    ...checkDirectiveBalance(context),
  ]
  if (contentType === 'posts') {
    const hasSection = /^ {0,3}##\s/m.test(context.masked)
    const hasStatement = /\*\*题意：\*\*/.test(context.body)
    if (hasSection && !hasStatement) {
      diagnostics.push({
        ruleId: 'post-statement',
        severity: 'warning',
        message: '题解小节建议以 **题意：** 开头',
        from: 0,
        to: Math.min(body.length, 60),
      })
    }
  }
  return diagnostics.sort((a, b) => a.from - b.from || a.to - b.to)
}

export { lineAt }
