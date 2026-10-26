<script lang="ts">
  import { onMount } from 'svelte'
  import type { GitFileEntry, GitStatus } from '@shirone-studio/contracts'
  import type { StudioApp } from './boot'

  let { context, root, onclose }: {
    context: StudioApp['context']
    root: string
    onclose: () => void
  } = $props()

  let status = $state<GitStatus | null>(null)
  let loading = $state(false)
  let busy = $state(false)
  let error = $state('')
  let notice = $state('')
  let pushOutput = $state('')
  let message = $state('')
  let selected = $state<string[]>([])
  let diffPath = $state('')
  let diffText = $state('')

  const allSelected = $derived(
    status !== null && status.entries.length > 0 && selected.length === status.entries.length,
  )

  async function refresh(): Promise<void> {
    loading = true
    error = ''
    try {
      const next = await context.git.status(root)
      status = next
      const existing = new Set(next.entries.map((entry) => entry.path))
      selected = selected.filter((path) => existing.has(path))
      if (diffPath && !existing.has(diffPath)) {
        diffPath = ''
        diffText = ''
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      loading = false
    }
  }

  async function showDiff(entry: GitFileEntry): Promise<void> {
    diffPath = entry.path
    diffText = '读取中…'
    try {
      // Untracked and worktree changes live in the worktree diff; fall back to
      // the index for staged-only entries.
      let text = await context.git.diff(root, entry.path, false)
      if (text.trim() === '') text = await context.git.diff(root, entry.path, true)
      if (text.trim() !== '') {
        diffText = text
      } else if (entry.index === '?' && entry.worktree === '?') {
        diffText = '（未跟踪文件：提交时会整体加入）'
      } else {
        diffText = '（没有可显示的差异）'
      }
    } catch (cause) {
      diffText = cause instanceof Error ? cause.message : String(cause)
    }
  }

  function toggle(path: string): void {
    selected = selected.includes(path)
      ? selected.filter((item) => item !== path)
      : [...selected, path]
  }

  function toggleAll(): void {
    if (!status) return
    selected = allSelected ? [] : status.entries.map((entry) => entry.path)
  }

  function badge(entry: GitFileEntry): string {
    const combined = `${entry.index}${entry.worktree}`.trim()
    return combined === '' ? '·' : combined
  }

  async function stageSelected(): Promise<void> {
    await run(async () => {
      status = await context.git.stage(root, selected)
      notice = `已暂存 ${selected.length} 个文件`
    })
  }

  async function unstageSelected(): Promise<void> {
    await run(async () => {
      status = await context.git.unstage(root, selected)
      notice = `已取消暂存 ${selected.length} 个文件`
    })
  }

  async function commit(): Promise<void> {
    if (selected.length === 0) return
    await run(async () => {
      const result = await context.git.commit(root, message, selected)
      notice = result.committed ? `已提交 ${result.hash}` : result.summary
      if (result.committed) {
        message = ''
        selected = []
      }
      await refresh()
    })
  }

  async function push(): Promise<void> {
    await run(async () => {
      const result = await context.git.push(root)
      pushOutput = result.output
      notice = result.ok ? '已推送' : '推送失败'
      await refresh()
    })
  }

  async function run(work: () => Promise<void>): Promise<void> {
    if (busy) return
    busy = true
    error = ''
    notice = ''
    try {
      await work()
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      busy = false
    }
  }

  onMount(() => {
    void refresh()
  })
</script>

<div
  class="overlay"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && onclose()}
>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="Git">
    <header>
      <h2>Git</h2>
      {#if status?.isRepo && status.branch}
        <span class="branch">
          {status.branch}
          {#if status.ahead > 0}<span class="ahead">↑{status.ahead}</span>{/if}
          {#if status.behind > 0}<span class="behind">↓{status.behind}</span>{/if}
        </span>
      {/if}
      <button class="close" onclick={onclose} aria-label="关闭">×</button>
    </header>

    {#if notice}<p class="notice">{notice}</p>{/if}
    {#if error}<p class="error">{error}</p>{/if}

    {#if status === null}
      <p class="empty">读取中…</p>
    {:else if !status.isRepo}
      <p class="empty">当前项目不是 Git 仓库</p>
    {:else if status.entries.length === 0}
      <p class="empty">没有未提交的改动</p>
    {:else}
      <div class="toolbar">
        <button class="secondary compact" onclick={toggleAll}>
          {allSelected ? '取消全选' : '全选'}
        </button>
        <button
          class="secondary compact"
          disabled={busy || selected.length === 0}
          onclick={stageSelected}>暂存选中</button
        >
        <button
          class="secondary compact"
          disabled={busy || selected.length === 0}
          onclick={unstageSelected}>取消暂存</button
        >
        <button class="secondary compact" disabled={busy} onclick={refresh}>刷新</button>
      </div>

      <div class="files">
        {#each status.entries as entry (entry.path)}
          <div class="row" class:active={diffPath === entry.path}>
            <input
              type="checkbox"
              checked={selected.includes(entry.path)}
              aria-label={entry.path}
              onchange={() => toggle(entry.path)}
            />
            <span class="badge" class:conflict={entry.index === 'U' || entry.worktree === 'U'}>
              {badge(entry)}
            </span>
            <button class="path" onclick={() => void showDiff(entry)}>{entry.path}</button>
          </div>
        {/each}
        {#if status.truncated}
          <p class="empty small">列表已截断，只显示前 500 项</p>
        {/if}
      </div>

      {#if diffPath}
        <pre class="diff">{diffText || '（没有可显示的差异）'}</pre>
      {/if}
    {/if}

    {#if status?.isRepo}
      <footer>
        <textarea bind:value={message} rows="2" placeholder="提交信息" aria-label="提交信息"></textarea>
        <div class="buttons">
          <button class="secondary" disabled={busy} onclick={onclose}>关闭</button>
          <button class="secondary" disabled={busy} onclick={push}>{busy ? '处理中…' : '推送'}</button>
          <button
            class="primary"
            disabled={busy || selected.length === 0 || message.trim() === ''}
            onclick={commit}>提交选中 ({selected.length})</button
          >
        </div>
      </footer>
    {/if}

    {#if pushOutput}
      <pre class="output">{pushOutput}</pre>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 24px;
    background: var(--overlay);
    z-index: 20;
  }

  .dialog {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(860px, 100%);
    max-height: 88vh;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface-2);
    box-shadow: 0 24px 60px rgb(0 0 0 / 0.25);
  }

  header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  h2 {
    margin: 0;
    font-size: 16px;
  }

  .branch {
    color: var(--muted);
    font-family: var(--editor-font);
    font-size: 12px;
  }

  .ahead {
    margin-left: 4px;
    color: var(--accent);
  }

  .behind {
    margin-left: 4px;
    color: var(--danger);
  }

  .close {
    margin-left: auto;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 20px;
    cursor: pointer;
  }

  .notice,
  .error,
  .empty {
    margin: 0;
    font-size: 12px;
  }

  .notice {
    color: var(--accent);
  }

  .error {
    color: var(--danger);
    white-space: pre-wrap;
  }

  .empty {
    padding: 12px 0;
    color: var(--muted);
  }

  .empty.small {
    padding: 6px 2px 0;
    font-size: 11px;
  }

  .toolbar {
    display: flex;
    gap: 6px;
  }

  .files {
    overflow: auto;
    max-height: 34vh;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 4px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 6px;
    border-radius: 6px;
  }

  .row.active {
    background: color-mix(in oklab, var(--accent) 12%, transparent);
  }

  .badge {
    flex: none;
    min-width: 22px;
    padding: 1px 5px;
    border-radius: 5px;
    background: var(--surface);
    color: var(--muted);
    font-family: var(--editor-font);
    font-size: 11px;
    text-align: center;
  }

  .badge.conflict {
    background: var(--danger-bg);
    color: var(--danger);
  }

  .path {
    flex: 1;
    overflow: hidden;
    padding: 2px 4px;
    border: 0;
    background: transparent;
    color: var(--text);
    font-family: var(--editor-font);
    font-size: 12px;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  .path:hover {
    color: var(--accent);
  }

  .diff,
  .output {
    overflow: auto;
    max-height: 26vh;
    margin: 0;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text);
    font-family: var(--editor-font);
    font-size: 11px;
    line-height: 1.5;
    white-space: pre;
  }

  .output {
    max-height: 14vh;
    color: var(--muted);
  }

  footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  textarea {
    width: 100%;
    padding: 7px 9px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 13px;
    resize: vertical;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  button {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 12px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  button.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: white;
  }

  button.compact {
    padding: 4px 8px;
    font-size: 11px;
  }

  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
</style>
