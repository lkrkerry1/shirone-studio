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

function mediaFrame(src: string, title: string) {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['media-embed'] },
    children: [
      {
        type: 'element',
        tagName: 'iframe',
        properties: {
          src,
          title,
          loading: 'lazy',
          allowFullScreen: true,
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        },
        children: [],
      },
    ],
  }
}

function directiveHandler(state: any, node: any) {
  const children = state.all(node)
  const attributes = node.attributes ?? {}
  const name = node.name ?? 'unknown'

  if (node.type === 'leafDirective') {
    if (name === 'bilibili' && typeof attributes.bvid === 'string') {
      const page = typeof attributes.p === 'number' ? attributes.p : 1
      return mediaFrame(
        `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(attributes.bvid)}&page=${page}`,
        String(attributes.title ?? 'Bilibili video'),
      )
    }
    if (name === 'youtube' && typeof attributes.id === 'string') {
      return mediaFrame(
        `https://www.youtube-nocookie.com/embed/${encodeURIComponent(attributes.id)}`,
        String(attributes.title ?? 'YouTube video'),
      )
    }
    if (name === 'acfun' && typeof attributes.id === 'string') {
      return mediaFrame(
        `https://www.acfun.cn/player/ac${encodeURIComponent(attributes.id)}`,
        String(attributes.title ?? 'AcFun video'),
      )
    }
    if (name === 'artplayer' && typeof attributes.src === 'string') {
      return {
        type: 'element',
        tagName: 'video',
        properties: {
          src: attributes.src,
          poster: attributes.poster,
          controls: true,
          playsInline: true,
        },
        children: [],
      }
    }
    if (name === 'audio-reader' && typeof attributes.src === 'string') {
      return {
        type: 'element',
        tagName: 'span',
        properties: { className: ['directive', 'directive-audio-reader'] },
        children: [
          ...children,
          {
            type: 'element',
            tagName: 'audio',
            properties: { src: attributes.src, controls: true },
            children: [],
          },
        ],
      }
    }
  }

  return {
    type: 'element',
    tagName: node.type === 'leafDirective' ? 'span' : 'div',
    properties: {
      className: ['directive', `directive-${name}`],
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
