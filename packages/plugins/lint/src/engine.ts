import type { LintDiagnostic, LintFix } from '@shirone-studio/contracts'
import {
  collectProtectedRanges,
  isProtected,
  maskSource,
  type MaskRange,
} from '@shirone-studio/plugin-syntax-shirone'

type RuleContext = {
  body: string
  masked: string
  ranges: MaskRange[]
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
  // Read the source, not the mask: masked code/math becomes whitespace, which
  // made `填 $1$，` look like "Han + spaces + ，" and flagged valid prose.
  const protectedRange = (from: number, to: number) => isProtected(context.ranges, from, to)
  for (const match of context.body.matchAll(
    /([\p{Script=Han}])[ \t]+([，。！？；：、])|([，。！？；：、])[ \t]+([\p{Script=Han}])/gu,
  )) {
    const index = match.index ?? 0
    const text = match[0]!
    if (protectedRange(index, index + text.length)) continue
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
  for (const match of context.body.matchAll(/([\p{Script=Han}])([,;:!?])/gu)) {
    const index = match.index ?? 0
    if (protectedRange(index, index + match[0]!.length)) continue
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

/**
 * Inline math spans (`$...$`), skipping display math (`$$...$$`), escaped `\$`
 * and anything inside a fence or directive.
 */
function inlineMathSpans(context: RuleContext): Array<{ from: number; to: number }> {
  const display = [...context.body.matchAll(/\$\$[\s\S]*?\$\$/g)].map((match) => {
    const from = match.index ?? 0
    return { from, to: from + match[0].length }
  })
  const spans: Array<{ from: number; to: number }> = []
  for (const match of context.body.matchAll(/\$[^$\n]+\$/g)) {
    const from = match.index ?? 0
    const to = from + match[0].length
    if (display.some((range) => from >= range.from && to <= range.to)) continue
    if (context.body[from - 1] === '\\') continue
    // Only skip ranges that are not math themselves, so a formula inside a
    // fenced block or a directive is ignored.
    const enclosed = context.ranges.some(
      (range) => range.kind !== 'math' && from >= range.from && to <= range.to,
    )
    if (enclosed) continue
    spans.push({ from, to })
  }
  return spans
}

/**
 * Inline math must be separated from surrounding text by a space.
 *
 * Chinese punctuation is a valid boundary: `全填 $1$，` is correct, while
 * `中文$x$中文` is not. Punctuation may always touch a formula, matching how
 * the blog is written.
 */
function checkMathSpacing(context: RuleContext): LintDiagnostic[] {
  const out: LintDiagnostic[] = []
  const boundaryIsFine = (char: string | undefined) =>
    char === undefined || /[\s\p{P}]/u.test(char)

  for (const { from, to } of inlineMathSpans(context)) {
    if (!boundaryIsFine(context.body[from - 1])) {
      out.push({
        ruleId: 'math-space',
        severity: 'warning',
        message: '行内公式两侧需要空格（中文标点除外）',
        from: from - 1,
        to: from,
        fix: fix('插入空格', from, from, ' '),
      })
    }
    if (!boundaryIsFine(context.body[to])) {
      out.push({
        ruleId: 'math-space',
        severity: 'warning',
        message: '行内公式两侧需要空格（中文标点除外）',
        from: to,
        to: to + 1,
        fix: fix('插入空格', to, to, ' '),
      })
    }
  }
  return out
}

/**
 * The blog's excerpt is the first ordinary paragraph (`remark-excerpt` skips
 * every other node), so a leading blockquote, heading or list is harmless.
 * Only a body without any paragraph has nothing to summarise.
 */
function checkBodyParagraph(context: RuleContext): LintDiagnostic[] {
  let inFence = false
  let fence = ''
  for (const raw of context.body.split('\n')) {
    const line = raw.trim()
    if (line.length === 0) continue

    const open = /^(`{3,}|~{3,})/.exec(line)
    if (!inFence && open) {
      inFence = true
      fence = open[1]![0]!
      continue
    }
    if (inFence) {
      if (new RegExp(`^\\${fence}{3,}\\s*$`).test(line)) inFence = false
      continue
    }

    if (/^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|`{3,}|~{3,}|\||:::|@tab\b|<)/.test(line)) continue
    if (/^([-*_])\1{2,}\s*$/.test(line)) continue
    return []
  }

  return [
    {
      ruleId: 'body-paragraph',
      severity: 'warning',
      message: '正文没有普通段落，列表卡片摘要会为空',
      from: 0,
      to: Math.min(context.body.length, 80),
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

/** Options that depend on frontmatter, which the body alone does not carry. */
export interface LintOptions {
  /** Frontmatter `category`; the 题意 opener is only expected on 题解 posts. */
  category?: string
}

export function checkBody(
  body: string,
  contentType = 'posts',
  options: LintOptions = {},
): LintDiagnostic[] {
  const ranges = collectProtectedRanges(body)
  const context: RuleContext = {
    body,
    masked: maskSource(body, ranges),
    ranges,
    lineStarts: starts(body),
  }
  const diagnostics = [
    // Standalone pages such as the about page own their heading structure.
    ...(contentType === 'about' ? [] : checkHeadings(context)),
    ...checkCodeFences(context),
    ...checkCjkLatin(context),
    ...checkPunctuation(context),
    ...checkMathSpacing(context),
    ...checkBodyParagraph(context),
    ...checkDirectiveBalance(context),
  ]
  if (contentType === 'posts' && options.category === '题解') {
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
