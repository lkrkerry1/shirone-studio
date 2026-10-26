<script lang="ts">
  import 'katex/dist/katex.min.css'
  import 'highlight.js/styles/github.css'
  import { onMount } from 'svelte'
  import mermaid from 'mermaid'

  let { html, resolveAsset }: {
    html: string
    resolveAsset?: (src: string) => string
  } = $props()
  let container: HTMLDivElement
  let lastRendered = ''

  onMount(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
    })
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
      try {
        await mermaid.run({ nodes: container.querySelectorAll('.mermaid') })
      } catch {
        // Invalid Mermaid should not break the rest of the preview.
      }
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
    font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
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

  :global(.preview .directive::before) {
    content: attr(class);
    display: block;
    margin-bottom: 4px;
    color: var(--muted);
    font-size: 11px;
  }

  :global(.preview .mermaid) {
    overflow: auto;
    padding: 8px;
  }
</style>
