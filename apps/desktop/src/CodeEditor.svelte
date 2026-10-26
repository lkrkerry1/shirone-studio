<script lang="ts">
  import { onMount } from 'svelte'
  import { basicSetup } from 'codemirror'
  import { markdown } from '@codemirror/lang-markdown'
  import { Compartment, EditorState, type Extension } from '@codemirror/state'
  import { EditorView } from '@codemirror/view'
  import { lintGutter, linter } from '@codemirror/lint'
  import 'katex/dist/katex.min.css'
  import type { LintDiagnostic } from '@shirone-studio/contracts'
  import { codeLanguages } from './languages'
  import { richMarkdown } from './rich-markdown'

  let {
    value,
    docId,
    onChange,
    lintSource,
    extensions = [],
    rich = false,
    resolveAsset,
  }: {
    value: string
    docId: string
    onChange: (value: string) => void
    lintSource?: (value: string) => LintDiagnostic[]
    /** Theme and other extensions contributed by the appearance plugin. */
    extensions?: Extension[]
    /** Render Markdown in place instead of showing its source. */
    rich?: boolean
    /** Resolve image targets surfaced by the rich editor. */
    resolveAsset?: (src: string) => string
  } = $props()

  let host: HTMLDivElement
  let view: EditorView | undefined
  let lastDocId = ''
  const richCompartment = new Compartment()
  const richExtension = () => (rich ? richMarkdown({ resolveAsset }) : [])

  onMount(() => {
    // `extensions` comes after basicSetup so a theme can override its defaults.
    const editorExtensions = [
      basicSetup,
      // Fenced blocks get the language named on the fence; the highlight theme
      // itself comes from the appearance plugin via `extensions`.
      markdown({ codeLanguages }),
      richCompartment.of(richExtension()),
      ...extensions,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString())
      }),
    ]
    if (lintSource) {
      editorExtensions.push(
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
      state: EditorState.create({ doc: value, extensions: editorExtensions }),
      parent: host,
    })
    return () => view?.destroy()
  })

  // Reconfigure instead of recreating the view, so toggling keeps undo history
  // and the cursor position.
  $effect(() => {
    const enabled = rich
    const resolver = resolveAsset
    if (!view) return
    view.dispatch({
      effects: richCompartment.reconfigure(enabled ? richMarkdown({ resolveAsset: resolver }) : []),
    })
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

<!-- Size and overflow only; colours and typography come from the appearance plugin. -->
<style>
  .editor-host {
    min-height: 0;
    height: 100%;
    overflow: auto;
  }
</style>
