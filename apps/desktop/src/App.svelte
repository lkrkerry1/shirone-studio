<script lang="ts">
  import { onMount } from 'svelte'
  import type {
    ContentDocument,
    ContentSummary,
    ContentTypeDefinition,
    ProjectLayout,
  } from '@shirone-studio/contracts'
  import { createApp, detectLayout, type StudioApp } from './boot'
  import { loadProjectRoot, saveProjectRoot } from './settings'
  import CodeEditor from './CodeEditor.svelte'

  let projectRoot = $state(loadProjectRoot())
  let context = $state<StudioApp['context'] | null>(null)
  let layout = $state<ProjectLayout | null>(null)
  let types = $state<ContentTypeDefinition[]>([])
  let summaries = $state<Record<string, ContentSummary[]>>({})
  let current = $state<ContentDocument | null>(null)
  let body = $state('')
  let dirty = $state(false)
  let loading = $state(true)
  let error = $state('')
  let saveState = $state('')

  const groups = $derived([...new Set(types.map((type) => type.group))])

  onMount(() => {
    void boot()
  })

  async function boot() {
    loading = true
    error = ''
    try {
      const app = await createApp()
      context = app.context
      layout = await detectLayout(app.context, projectRoot)
      types = app.context.contentTypes.list()
      await refresh()
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      loading = false
    }
  }

  async function refresh() {
    if (!context) return
    const next: Record<string, ContentSummary[]> = {}
    for (const type of types) {
      try {
        next[type.id] = await type.list(context)
      } catch {
        next[type.id] = []
      }
    }
    summaries = next
  }

  async function open(type: ContentTypeDefinition, item: ContentSummary) {
    if (!context) return
    try {
      const doc = await type.read(context, item.id)
      current = doc
      body = doc.body ?? ''
      dirty = false
      saveState = ''
      error = ''
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    }
  }

  async function save() {
    if (!context || !current) return
    const type = types.find((candidate) => candidate.id === current?.type)
    if (!type) return
    try {
      const result = await type.save(context, {
        ...current,
        body,
        frontmatterDirty: false,
        rawFrontmatter: current.rawFrontmatter,
      })
      current = { ...current, body, hash: result.hash }
      dirty = false
      saveState = '已保存'
      await refresh()
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    }
  }

  function handleKey(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      void save()
    }
  }

  function reloadRoot() {
    saveProjectRoot(projectRoot.trim())
    current = null
    body = ''
    dirty = false
    void boot()
  }
</script>

<svelte:window onkeydown={handleKey} />

<div class="app">
  <header class="topbar">
    <div class="brand">Shirone Studio</div>
    <div class="workspace">
      <input
        class="root-input"
        bind:value={projectRoot}
        aria-label="项目根目录"
        spellcheck="false"
      />
      <button class="secondary" onclick={reloadRoot}>重新加载</button>
    </div>
    <div class="actions">
      {#if layout}
        <span class="badge">{layout.mode === 'npm' ? 'npm 内容模式' : '源码模式'}</span>
      {/if}
      <button class="primary" disabled={!current || !dirty} onclick={save}>保存</button>
    </div>
  </header>

  <div class="body">
    <aside class="sidebar">
      {#if loading}
        <div class="loading">加载中…</div>
      {:else}
        {#each groups as group}
          <section class="group">
            <h2>{group}</h2>
            {#each types.filter((type) => type.group === group) as type}
              <div class="type">
                <div class="type-label">{type.label}</div>
                {#each summaries[type.id] ?? [] as item}
                  <button
                    class:active={current?.type === type.id && current?.id === item.id}
                    class="item"
                    onclick={() => void open(type, item)}
                  >
                    <span class="item-title">{item.title}</span>
                    {#if item.date}<span class="item-date">{item.date.slice(0, 10)}</span>{/if}
                  </button>
                {:else}
                  <div class="empty-type">暂无内容</div>
                {/each}
              </div>
            {/each}
          </section>
        {/each}
      {/if}
    </aside>

    <main class="main">
      {#if error}
        <div class="error">{error}</div>
      {/if}
      {#if current}
        <div class="docbar">
          <div class="docmeta">
            <div class="doctitle">{current.title}</div>
            <div class="docpath">{current.path}</div>
          </div>
          <div class="docstatus">
            {dirty ? '未保存' : saveState || '已同步'}
          </div>
        </div>
        <div class="editor-note">
          frontmatter 已隐藏，正文编辑器只显示 Markdown 内容。
        </div>
        <div class="editor">
          <CodeEditor
            value={body}
            docId={current.path}
            onChange={(next) => {
              body = next
              dirty = true
            }}
          />
        </div>
      {:else}
        <div class="welcome">
          <h1>Shirone Studio</h1>
          <p>选择左侧内容开始编辑；frontmatter 与正文分离。</p>
          {#if layout}
            <p class="hint">工作区：{layout.root}</p>
          {/if}
        </div>
      {/if}
    </main>
  </div>

  <footer class="statusbar">
    <span>{current ? current.type : '未打开内容'}</span>
    <span>{dirty ? '● 未保存' : '○ 已保存'}</span>
    <span>{layout?.contentRoot ?? ''}</span>
  </footer>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--surface);
  }

  .topbar {
    display: grid;
    grid-template-columns: auto minmax(280px, 1fr) auto;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--surface-2);
  }

  .brand {
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .workspace {
    display: flex;
    gap: 8px;
    min-width: 0;
  }

  .root-input {
    flex: 1;
    min-width: 0;
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 12px;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .badge {
    padding: 4px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    font-size: 11px;
  }

  button {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 12px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    background: var(--surface);
    color: var(--text);
  }

  button:disabled {
    cursor: default;
    opacity: 0.45;
  }

  button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  .body {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    min-height: 0;
    flex: 1;
  }

  .sidebar {
    border-right: 1px solid var(--border);
    overflow: auto;
    padding: 12px;
    background: var(--surface-2);
  }

  .group h2 {
    margin: 14px 6px 6px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .type-label {
    padding: 4px 8px;
    font-size: 12px;
    color: var(--muted);
  }

  .item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    margin: 2px 0;
    padding: 7px 9px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    text-align: left;
  }

  .item:hover {
    background: var(--surface);
  }

  .item.active {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  }

  .item-title {
    font-size: 13px;
    font-weight: 600;
  }

  .item-date {
    font-size: 11px;
    color: var(--muted);
  }

  .empty-type {
    padding: 4px 9px 8px;
    font-size: 11px;
    color: var(--muted);
  }

  .main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .docbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    border-bottom: 1px solid var(--border);
  }

  .doctitle {
    font-size: 14px;
    font-weight: 700;
  }

  .docpath {
    margin-top: 2px;
    font-size: 11px;
    color: var(--muted);
  }

  .docstatus {
    font-size: 11px;
    color: var(--muted);
  }

  .editor-note {
    padding: 6px 20px;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
    font-size: 11px;
    background: color-mix(in srgb, var(--accent) 4%, var(--surface));
  }

  .editor {
    flex: 1;
    min-height: 0;
  }

  .error {
    margin: 12px 20px 0;
    padding: 10px 12px;
    border: 1px solid #b42318;
    border-radius: 8px;
    background: #fef3f2;
    color: #b42318;
    font-size: 12px;
    white-space: pre-wrap;
  }

  .welcome {
    margin: auto;
    text-align: center;
    color: var(--muted);
  }

  .welcome h1 {
    color: var(--text);
    font-size: 30px;
  }

  .hint {
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .loading {
    padding: 20px;
    color: var(--muted);
    font-size: 12px;
  }

  .statusbar {
    display: flex;
    gap: 18px;
    padding: 5px 12px;
    border-top: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--muted);
    font-size: 11px;
  }

  @media (max-width: 900px) {
    .body {
      grid-template-columns: 220px minmax(0, 1fr);
    }

    .topbar {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .actions {
      grid-column: 1 / -1;
      justify-content: flex-end;
    }
  }
</style>
