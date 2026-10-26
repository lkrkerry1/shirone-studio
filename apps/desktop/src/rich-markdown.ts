import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder, StateField, type EditorState, type Extension } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import katex from 'katex'

export interface RichMarkdownOptions {
  /** Resolve a Markdown image target to something the webview can load. */
  resolveAsset?: (src: string) => string
}

const strong = Decoration.mark({ class: 'lp-strong' })
const emphasis = Decoration.mark({ class: 'lp-em' })
const strikethrough = Decoration.mark({ class: 'lp-strike' })
const inlineCode = Decoration.mark({ class: 'lp-code' })
const linkText = Decoration.mark({ class: 'lp-link' })
const hidden = Decoration.replace({})

/** A span that is not rendered while the Markdown source is shown. */
interface Hidden {
  from: number
  to: number
}

class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
  ) {
    super()
  }

  override eq(other: ImageWidget): boolean {
    return other.src === this.src && other.alt === this.alt
  }

  override toDOM(): HTMLElement {
    const holder = document.createElement('span')
    holder.className = 'lp-image'
    const image = document.createElement('img')
    image.src = this.src
    image.alt = this.alt
    image.loading = 'lazy'
    holder.append(image)
    return holder
  }
}

class MathWidget extends WidgetType {
  constructor(
    readonly latex: string,
    readonly display: boolean,
  ) {
    super()
  }

  override eq(other: MathWidget): boolean {
    return other.latex === this.latex && other.display === this.display
  }

  override toDOM(): HTMLElement {
    const holder = document.createElement('span')
    holder.className = this.display ? 'lp-math lp-math-block' : 'lp-math'
    try {
      holder.innerHTML = katex.renderToString(this.latex, {
        displayMode: this.display,
        throwOnError: false,
        output: 'html',
      })
    } catch {
      holder.textContent = this.display ? `$$${this.latex}$$` : `$${this.latex}$`
    }
    return holder
  }

  override ignoreEvent(): boolean {
    return true
  }
}

class RuleWidget extends WidgetType {
  override eq(): boolean {
    return true
  }

  override toDOM(): HTMLElement {
    const rule = document.createElement('span')
    rule.className = 'lp-hr'
    return rule
  }
}

const HEADINGS: Record<string, string> = {
  ATXHeading1: 'lp-h1',
  ATXHeading2: 'lp-h2',
  ATXHeading3: 'lp-h3',
  ATXHeading4: 'lp-h4',
  ATXHeading5: 'lp-h5',
  ATXHeading6: 'lp-h6',
  SetextHeading1: 'lp-h1',
  SetextHeading2: 'lp-h2',
}

/** `$...$` / `$$...$$` spans, ignoring escaped dollars. */
export function findMathSpans(text: string): Array<{ from: number; to: number; latex: string; display: boolean }> {
  const spans: Array<{ from: number; to: number; latex: string; display: boolean }> = []
  const pattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
  for (const match of text.matchAll(pattern)) {
    const from = match.index ?? 0
    if (from > 0 && text[from - 1] === '\\') continue
    const display = match[1] !== undefined
    const latex = (display ? match[1] : match[2]) ?? ''
    if (latex.trim().length === 0) continue
    spans.push({ from, to: from + match[0].length, latex, display })
  }
  return spans
}

function selectionTouches(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some((range) => range.from <= to && range.to >= from)
}

function buildDecorations(state: EditorState, options: RichMarkdownOptions): DecorationSet {
  const decorations: Array<{
    from: number
    to: number
    value: Decoration | ReturnType<typeof Decoration.line>
  }> = []
  const codeRanges: Hidden[] = []
  const add = (from: number, to: number, value: Decoration): void => {
    if (to < from) return
    decorations.push({ from, to, value })
  }

  syntaxTree(state).iterate({
    enter: (node) => {
        const name = node.name
        const heading = HEADINGS[name]
        if (heading) {
          const line = state.doc.lineAt(node.from)
          add(line.from, line.from, Decoration.line({ class: heading }))
          return
        }

        if (name === 'Blockquote') {
          const last = state.doc.lineAt(Math.min(node.to, state.doc.length))
          for (let number = state.doc.lineAt(node.from).number; number <= last.number; number += 1) {
            const line = state.doc.line(number)
            add(line.from, line.from, Decoration.line({ class: 'lp-quote' }))
          }
          return
        }

        if (name === 'InlineCode' || name === 'FencedCode' || name === 'CodeBlock') {
          codeRanges.push({ from: node.from, to: node.to })
          if (name === 'InlineCode' && !selectionTouches(state, node.from, node.to)) {
            add(node.from, node.to, inlineCode)
            for (const child of children(node.node)) {
              if (child.name === 'CodeMark') add(child.from, child.to, hidden)
            }
          }
          return
        }

        if (name === 'StrongEmphasis' || name === 'Emphasis' || name === 'Strikethrough') {
          if (selectionTouches(state, node.from, node.to)) return
          const mark =
            name === 'StrongEmphasis' ? strong : name === 'Emphasis' ? emphasis : strikethrough
          add(node.from, node.to, mark)
          for (const child of children(node.node)) {
            if (child.name === 'EmphasisMark' || child.name === 'StrikethroughMark') {
              add(child.from, child.to, hidden)
            }
          }
          return
        }

        if (name === 'Link') {
          if (selectionTouches(state, node.from, node.to)) return
          for (const child of children(node.node)) {
            if (child.name === 'LinkMark' || child.name === 'URL' || child.name === 'LinkTitle') {
              add(child.from, child.to, hidden)
            }
            if (child.name === 'LinkLabel') add(child.from, child.to, linkText)
          }
          return
        }

        if (name === 'Image') {
          if (selectionTouches(state, node.from, node.to)) return
          const label = children(node.node).find((child) => child.name === 'LinkLabel')
          const target = children(node.node).find((child) => child.name === 'URL')
          if (!target) return
          const src = state.doc.sliceString(target.from, target.to)
          const alt = label ? state.doc.sliceString(label.from, label.to) : ''
          const resolved = options.resolveAsset ? options.resolveAsset(src) : src
          add(
            node.from,
            node.to,
            Decoration.replace({ widget: new ImageWidget(resolved, alt) }),
          )
          return
        }

        if (name === 'HorizontalRule') {
          add(node.from, node.to, Decoration.replace({ widget: new RuleWidget() }))
          return
        }

        if (name === 'HeaderMark' || name === 'QuoteMark') {
          // Reveal the marker while the cursor is anywhere on its line, not
          // only inside the marker itself.
          const line = state.doc.lineAt(node.from)
          if (selectionTouches(state, line.from, line.to)) return
          const after = state.doc.sliceString(node.to, Math.min(node.to + 1, state.doc.length))
          add(node.from, node.to + (after === ' ' ? 1 : 0), hidden)
        }
    },
  })

  // Inline and display math, skipping code spans collected above.
  const text = state.doc.toString()
  for (const span of findMathSpans(text)) {
    const from = span.from
    const to = span.to
    if (codeRanges.some((range) => from >= range.from && to <= range.to)) continue
    if (selectionTouches(state, from, to)) continue
    add(from, to, Decoration.replace({ widget: new MathWidget(span.latex, span.display) }))
  }

  decorations.sort((a, b) => a.from - b.from || a.to - b.to)
  const builder = new RangeSetBuilder<Decoration>()
  for (const item of decorations) builder.add(item.from, item.to, item.value)
  return builder.finish()
}

function children(node: { firstChild: SyntaxChild | null }): SyntaxChild[] {
  const out: SyntaxChild[] = []
  for (let child = node.firstChild; child; child = child.nextSibling) out.push(child)
  return out
}

interface SyntaxChild {
  name: string
  from: number
  to: number
  firstChild: SyntaxChild | null
  nextSibling: SyntaxChild | null
}

/**
 * Rich-text editing for Markdown: headings, emphasis, links, images and math
 * render in place; the source reappears for the block the selection is inside.
 *
 * The decorations live in a state field (not a view plugin) because display
 * math is replaced across line breaks, which plugins are not allowed to do.
 */
export function richMarkdown(options: RichMarkdownOptions = {}): Extension {
  const field = StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state, options),
    update: (decorations, transaction) => {
      const syntaxChanged =
        syntaxTree(transaction.startState) !== syntaxTree(transaction.state)
      if (transaction.docChanged || transaction.selection || syntaxChanged) {
        return buildDecorations(transaction.state, options)
      }
      return decorations
    },
    provide: (current) => EditorView.decorations.from(current),
  })
  return [field]
}
