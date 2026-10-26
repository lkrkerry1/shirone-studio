<script lang="ts">
  import { onMount } from 'svelte'
  import { basicSetup } from 'codemirror'
  import { markdown } from '@codemirror/lang-markdown'
  import { EditorState } from '@codemirror/state'
  import { EditorView } from '@codemirror/view'
  import { lintGutter, linter } from '@codemirror/lint'
  import type { LintDiagnostic } from '@shirone-studio/contracts'

  let { value, docId, onChange, lintSource }: {
    value: string
    docId: string
    onChange: (value: string) => void
    lintSource?: (value: string) => LintDiagnostic[]
  } = $props()

  let host: HTMLDivElement
  let view: EditorView | undefined
  let lastDocId = ''

  onMount(() => {
    const extensions = [
      basicSetup,
      markdown(),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString())
      }),
    ]
    if (lintSource) {
      extensions.push(
        lintGutter(),
        linter(
          (current) =>
            lintSource(current.state.doc.toString()).map((item) => ({
              from: Math.min(item.from, item.to),
              to: Math.max(item.from, item.to),
              severity: item.severity,
              message: item.message,
              actions: item.fix
                ? [
                    {
                      name: item.fix.label,
                      apply: (target: EditorView) => {
                        target.dispatch({
                          changes: {
                            from: item.fix!.from,
                            to: item.fix!.to,
                            insert: item.fix!.insert,
                          },
                        })
                      },
                    },
                  ]
                : undefined,
            })),
          { delay: 250 },
        ),
      )
    }
    view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: host,
    })
    return () => view?.destroy()
  })

  $effect(() => {
    if (!view) return
    if (docId !== lastDocId) {
      lastDocId = docId
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
      return
    }
    if (value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    }
  })
</script>

<div class="editor-host" bind:this={host}></div>

<style>
  .editor-host {
    min-height: 0;
    height: 100%;
    overflow: auto;
  }

  :global(.editor-host .cm-editor) {
    height: 100%;
    font-size: 15px;
    background: var(--surface);
  }

  :global(.editor-host .cm-scroller) {
    font-family: 'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace;
    line-height: 1.65;
  }

  :global(.editor-host .cm-content) {
    padding: 24px 32px 80px;
    max-width: 900px;
    margin: 0 auto;
  }

  :global(.editor-host .cm-focused) {
    outline: none;
  }
</style>
