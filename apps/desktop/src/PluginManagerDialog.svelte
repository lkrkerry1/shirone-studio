<script lang="ts">
  import { onMount } from 'svelte'
  import type { PluginRecord } from '@shirone-studio/kernel'

  let { plugins, onclose }: {
    plugins: {
      list(): PluginRecord[]
      setEnabled(id: string, enabled: boolean): Promise<void>
    }
    onclose: () => void
  } = $props()

  let records = $state<PluginRecord[]>([])
  let error = $state('')

  onMount(() => {
    records = plugins.list()
  })

  const locked = new Set([
    '@shirone-studio/plugin-host',
    '@shirone-studio/plugin-frontmatter',
    '@shirone-studio/plugin-content-posts',
    '@shirone-studio/plugin-content-series',
    '@shirone-studio/plugin-content-moments',
    '@shirone-studio/plugin-content-about',
  ])

  async function toggle(record: PluginRecord) {
    if (locked.has(record.name)) return
    try {
      error = ''
      await plugins.setEnabled(record.id, !record.disabled)
      records = plugins.list()
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    }
  }
</script>

<div class="overlay" role="presentation" onclick={(event) => event.target === event.currentTarget && onclose()}>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="插件管理">
    <header>
      <h2>插件管理</h2>
      <button class="close" onclick={onclose} aria-label="关闭">×</button>
    </header>
    <p class="hint">
      插件由根目录 <code>compose.yml</code> 组合；核心内容插件不可在此关闭。
    </p>
    {#if error}<p class="error">{error}</p>{/if}
    <div class="list">
      {#each records as record}
        <div class="row">
          <div class="meta">
            <div class="name">{record.name}</div>
            <div class="sub">{record.group} · {record.state}{record.error ? ` · ${record.error}` : ''}</div>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              checked={!record.disabled}
              disabled={locked.has(record.name)}
              onchange={() => void toggle(record)}
            />
            <span>{record.disabled ? '已停用' : '启用'}</span>
          </label>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 24px;
    background: rgb(0 0 0 / 0.35);
    z-index: 20;
  }

  .dialog {
    width: min(620px, 100%);
    max-height: 86vh;
    overflow: auto;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface-2);
    box-shadow: 0 24px 60px rgb(0 0 0 / 0.25);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    margin: 0;
    font-size: 16px;
  }

  .close {
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 20px;
    cursor: pointer;
  }

  .hint {
    color: var(--muted);
    font-size: 12px;
  }

  code {
    padding: 1px 4px;
    border-radius: 4px;
    background: var(--surface);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 10px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  .name {
    font-size: 12px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .sub {
    margin-top: 2px;
    color: var(--muted);
    font-size: 11px;
    overflow-wrap: anywhere;
  }

  .switch {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: none;
    color: var(--muted);
    font-size: 11px;
  }

  .error {
    color: #b42318;
    font-size: 12px;
  }
</style>
