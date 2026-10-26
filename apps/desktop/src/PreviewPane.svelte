<script lang="ts">
  import 'katex/dist/katex.min.css'
  import { onMount } from 'svelte'
  import mermaid from 'mermaid'

  let { html, resolveAsset }: {
    html: string
    resolveAsset?: (src: string) => string
  } = $props()
  let container: HTMLDivElement
  let lastRendered = ''
  // Re-rendering replaces the whole `{@html}` subtree, which would otherwise
  // throw the pane back to the top on every keystroke.
  let keepScroll = 0

  onMount(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
    })
  })

  $effect.pre(() => {
    if (container && html !== lastRendered) keepScroll = container.scrollTop
  })

  $effect(() => {
    if (!container || html === lastRendered) return
    lastRendered = html
    queueMicrotask(async () => {
      if (resolveAsset) {
        for (const node of container.querySelectorAll('img[src], video[src], audio[src], source[src]')) {
          const src = node.getAttribute('src')
          if (src) node.setAttribute('src', resolveAsset(src))
        }
        for (const node of container.querySelectorAll('video[poster]')) {
          const poster = node.getAttribute('poster')
          if (poster) node.setAttribute('poster', resolveAsset(poster))
        }
      }
      for (const code of container.querySelectorAll('pre > code.language-mermaid')) {
        const pre = code.parentElement
        if (!pre) continue
        const diagram = document.createElement('div')
        diagram.className = 'mermaid'
        diagram.textContent = code.textContent ?? ''
        pre.replaceWith(diagram)
      }
      container.scrollTop = keepScroll
      try {
        await mermaid.run({ nodes: container.querySelectorAll('.mermaid') })
      } catch {
        // Invalid Mermaid should not break the rest of the preview.
      }
      container.scrollTop = keepScroll
    })
  })
</script>

<div class="preview" bind:this={container}>
  {@html html}
</div>

<style>
  .preview {
    height: 100%;
    overflow: auto;
    padding: 18px 22px 80px;
    line-height: 1.8;
    font-size: 14px;
  }

  :global(.preview img),
  :global(.preview video) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 1em auto;
    border-radius: 10px;
  }

  :global(.preview audio) {
    display: block;
    width: 100%;
    margin: 1em 0;
  }

  :global(.preview h1),
  :global(.preview h2),
  :global(.preview h3) {
    line-height: 1.35;
    margin: 1.2em 0 0.5em;
  }

  :global(.preview p) {
    margin: 0.8em 0;
  }

  :global(.preview a) {
    color: var(--accent);
  }

  :global(.preview code) {
    padding: 0.15em 0.35em;
    border-radius: 5px;
    background: color-mix(in srgb, var(--accent) 8%, var(--surface));
    font-family: var(--editor-font);
    font-size: 0.9em;
  }

  :global(.preview pre) {
    overflow: auto;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface-2);
  }

  :global(.preview pre code) {
    padding: 0;
    background: transparent;
  }

  :global(.preview blockquote) {
    margin: 1em 0;
    padding: 0.4em 1em;
    border-left: 3px solid var(--accent);
    color: var(--muted);
    background: color-mix(in srgb, var(--accent) 4%, var(--surface));
  }

  :global(.preview table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }

  /* highlight.js tokens use the appearance plugin's github-light/dark palette
     instead of a bundled stylesheet, so preview code matches the editor. */
  :global(.preview .hljs) {
    color: var(--text);
    background: transparent;
  }

  :global(.preview .hljs-comment),
  :global(.preview .hljs-quote) {
    color: var(--syntax-comment);
    font-style: italic;
  }

  :global(.preview .hljs-keyword),
  :global(.preview .hljs-literal),
  :global(.preview .hljs-built_in),
  :global(.preview .hljs-type) {
    color: var(--syntax-keyword);
  }

  :global(.preview .hljs-string),
  :global(.preview .hljs-regexp),
  :global(.preview .hljs-addition) {
    color: var(--syntax-string);
  }

  :global(.preview .hljs-number),
  :global(.preview .hljs-symbol),
  :global(.preview .hljs-bullet) {
    color: var(--syntax-number);
  }

  :global(.preview .hljs-title),
  :global(.preview .hljs-title.function_),
  :global(.preview .hljs-section) {
    color: var(--syntax-function);
  }

  :global(.preview .hljs-attr),
  :global(.preview .hljs-attribute),
  :global(.preview .hljs-variable),
  :global(.preview .hljs-template-variable),
  :global(.preview .hljs-params),
  :global(.preview .hljs-meta) {
    color: var(--syntax-variable);
  }

  :global(.preview .hljs-tag),
  :global(.preview .hljs-name),
  :global(.preview .hljs-selector-tag) {
    color: var(--syntax-tag);
  }

  :global(.preview .hljs-operator),
  :global(.preview .hljs-punctuation),
  :global(.preview .hljs-subst) {
    color: var(--syntax-punctuation);
  }

  :global(.preview .hljs-deletion) {
    color: var(--syntax-keyword);
  }

  :global(.preview th),
  :global(.preview td) {
    border: 1px solid var(--border);
    padding: 6px 8px;
    text-align: left;
  }

  :global(.preview .directive) {
    margin: 1em 0;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: color-mix(in srgb, var(--accent) 5%, var(--surface));
  }

  :global(.preview .mermaid) {
    overflow: auto;
    padding: 8px;
  }

  /* Display formulas can be wider than the pane; scroll them instead of
     letting the whole preview grow a horizontal scrollbar. */
  :global(.preview .katex-display) {
    overflow-x: auto;
    overflow-y: hidden;
    padding: 2px 0;
  }

  :global(.preview .media-embed) {
    position: relative;
    aspect-ratio: 16 / 9;
    margin: 1em 0;
    overflow: hidden;
    border-radius: 10px;
    background: #000;
  }

  :global(.preview .media-embed iframe) {
    width: 100%;
    height: 100%;
    border: 0;
  }
</style>
