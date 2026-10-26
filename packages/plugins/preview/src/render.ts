import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'

function directiveHandler(state: any, node: any) {
  const children = state.all(node)
  return {
    type: 'element',
    tagName: node.type === 'leafDirective' ? 'span' : 'div',
    properties: {
      className: ['directive', `directive-${node.name ?? 'unknown'}`],
    },
    children,
  }
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkDirective)
  .use(remarkRehype as never, {
    allowDangerousHtml: true,
    handlers: {
      containerDirective: directiveHandler,
      leafDirective: directiveHandler,
    },
  } as never)
  .use(rehypeRaw)
  .use(rehypeKatex)
  .use(rehypeHighlight, { detect: false, ignoreMissing: true })
  .use(rehypeStringify)

export function renderMarkdown(body: string): string {
  // Shirone accepts `:::note`, `::: note` and `::: note 标题`; remark-directive
  // only parses the compact/bracketed forms, so normalize titles to brackets.
  const normalized = body.replace(
    /^(\s*:::)[ \t]*([a-z][\w-]*)[ \t]+([^\[\n#][^\n]*)$/gm,
    (_match, prefix: string, name: string, title: string) =>
      `${prefix}${name}[${title.trim()}]`,
  )
  return String(processor.processSync(normalized))
}
