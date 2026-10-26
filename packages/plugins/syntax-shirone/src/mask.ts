export interface MaskRange {
  from: number
  to: number
  kind: 'fence' | 'inline' | 'math' | 'directive' | 'attribute' | 'include'
}

/**
 * Collect the source ranges that formatting rules must ignore.
 *
 * This intentionally masks syntax tokens rather than whole container bodies:
 * prose inside `::: note` should still be linted, while the directive line
 * itself must not be treated as Chinese text.
 */
export function collectProtectedRanges(body: string): MaskRange[] {
  const ranges: MaskRange[] = []

  const add = (from: number, to: number, kind: MaskRange['kind']) => {
    if (to > from) ranges.push({ from, to, kind })
  }

  // Fenced code blocks (``` / ~~~), including nested fence lengths.
  const lines = body.split('\n')
  const lineStarts: number[] = []
  let cursor = 0
  for (const line of lines) {
    lineStarts.push(cursor)
    cursor += line.length + 1
  }
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const match = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (!match) continue
    const fence = match[1]!
    const start = lineStarts[index]!
    let end = body.length
    for (let next = index + 1; next < lines.length; next += 1) {
      const candidate = lines[next] ?? ''
      const close = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`)
      if (close.test(candidate)) {
        end = lineStarts[next]! + candidate.length
        index = next
        break
      }
    }
    add(start, end, 'fence')
  }

  // Inline code, display math and inline math.
  for (const match of body.matchAll(/`[^`\n]+`/g)) {
    add(match.index ?? 0, (match.index ?? 0) + match[0].length, 'inline')
  }
  for (const match of body.matchAll(/\$\$[\s\S]*?\$\$/g)) {
    add(match.index ?? 0, (match.index ?? 0) + match[0].length, 'math')
  }
  for (const match of body.matchAll(/\$[^$\n]+\$/g)) {
    add(match.index ?? 0, (match.index ?? 0) + match[0].length, 'math')
  }

  // Directive syntax lines: :::, ::::, @tab and leaf directives.
  for (const match of body.matchAll(/^ {0,3}:{3,4}[^\n]*$/gm)) {
    add(match.index ?? 0, (match.index ?? 0) + match[0].length, 'directive')
  }
  for (const match of body.matchAll(/^\s*@tab\b[^\n]*$/gm)) {
    add(match.index ?? 0, (match.index ?? 0) + match[0].length, 'directive')
  }
  for (const match of body.matchAll(/^ {0,3}::[a-z][\w-]*\{[^}\n]*\}\s*$/gm)) {
    add(match.index ?? 0, (match.index ?? 0) + match[0].length, 'directive')
  }

  // Build-time include comments.
  for (const match of body.matchAll(/<!--\s*@include:[\s\S]*?-->/g)) {
    add(match.index ?? 0, (match.index ?? 0) + match[0].length, 'include')
  }

  // Inline attribute groups such as {.secondary} and {#anchor}.
  for (const match of body.matchAll(/\{[#.][^}\n]*\}/g)) {
    add(match.index ?? 0, (match.index ?? 0) + match[0].length, 'attribute')
  }

  return mergeRanges(ranges)
}

export function mergeRanges(ranges: MaskRange[]): MaskRange[] {
  const sorted = [...ranges].sort((a, b) => a.from - b.from)
  const result: MaskRange[] = []
  for (const range of sorted) {
    const last = result[result.length - 1]
    if (last && range.from <= last.to) {
      last.to = Math.max(last.to, range.to)
    } else {
      result.push({ ...range })
    }
  }
  return result
}

export function isProtected(ranges: MaskRange[], from: number, to: number): boolean {
  return ranges.some((range) => from >= range.from && to <= range.to)
}

/** Replace protected characters with spaces while preserving offsets and newlines. */
export function maskSource(body: string, ranges = collectProtectedRanges(body)): string {
  // Use UTF-16 code units, matching JavaScript regex offsets.
  const chars = body.split('')
  for (const range of ranges) {
    for (let index = range.from; index < range.to; index += 1) {
      if (chars[index] !== '\n') chars[index] = ' '
    }
  }
  return chars.join('')
}
