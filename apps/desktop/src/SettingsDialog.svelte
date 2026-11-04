<script lang="ts">
  import { onMount } from 'svelte'
  import type { PluginRecord } from '@shirone-studio/kernel'
  import type { PluginSettingField } from '@shirone-studio/contracts'
  import type { StudioApp } from './boot'
  import Select from './Select.svelte'

  let {
    context,
    plugins,
    projectRoot,
    autosave,
    onprojectroot,
    onautosave,
    onreload,
    onsaved,
    onclose,
  }: {
    context: StudioApp['context']
    plugins: {
      list(): PluginRecord[]
      setEnabled(id: string, enabled: boolean): Promise<void>
    }
    projectRoot: string
    autosave: boolean
    onprojectroot: (value: string) => void
    onautosave: (value: boolean) => void
    onreload: () => void
    onsaved: () => void
    onclose: () => void
  } = $props()

  // The shell calls these services directly; disabling them would break the UI,
  // so the settings dialog keeps them on. Only data-only plugins can be toggled.
  const locked = new Set([
    '@shirone-studio/plugin-host',
    '@shirone-studio/plugin-frontmatter',
    '@shirone-studio/plugin-content-posts',
    '@shirone-studio/plugin-content-series',
    '@shirone-studio/plugin-content-moments',
    '@shirone-studio/plugin-content-about',
    '@shirone-studio/plugin-platforms',
    '@shirone-studio/plugin-lint',
    '@shirone-studio/plugin-preview',
    '@shirone-studio/plugin-git',
    '@shirone-studio/plugin-appearance',
  ])

  function initials(): Record<string, Record<string, unknown>> {
    return Object.fromEntries(
      context.settings.list().map((contribution) => [
        contribution.plugin,
        Object.fromEntries(
          contribution.fields.map((field) => [
            field.key,
            context.settings.read(contribution.plugin, field.key) ?? field.default ?? '',
          ]),
        ),
      ]),
    )
  }

  const contributions = $derived(context.settings.list())
  let records = $state<PluginRecord[]>([])
  let values = $state<Record<string, Record<string, unknown>>>(initials())
  let pluginError = $state('')

  onMount(() => {
    records = plugins.list()
  })

  /** The settings contribution a plugin entry owns, matched by the short name. */
  function settingsFor(record: PluginRecord) {
    return contributions.find(
      (contribution) =>
        record.name === contribution.plugin ||
        record.name.endsWith(`-${contribution.plugin}`) ||
        record.name.endsWith(`/${contribution.plugin}`),
    )
  }

  function shortName(name: string): string {
    return name.replace('@shirone-studio/plugin-', '')
  }

  function write(plugin: string, field: PluginSettingField, value: unknown): void {
    values[plugin] = { ...values[plugin], [field.key]: value }
    context.settings.write(plugin, field.key, value)
    onsaved()
  }

  function numberValue(plugin: string, key: string): string {
    const value = values[plugin]?.[key]
    return value === undefined || value === null ? '' : String(value)
  }

  async function toggle(record: PluginRecord): Promise<void> {
    if (locked.has(record.name)) return
    try {
      pluginError = ''
      // `disabled` is the current state; enable() takes the *next* enabled flag.
      await plugins.setEnabled(record.id, record.disabled)
      records = plugins.list()
    } catch (cause) {
      pluginError = cause instanceof Error ? cause.message : String(cause)
    }
  }
</script>

{#snippet settingField(plugin: string, field: PluginSettingField)}
  {#if field.type === 'boolean'}
    <label class="field checkbox">
      <input
        type="checkbox"
        checked={values[plugin]?.[field.key] === true}
        onchange={(event) => write(plugin, field, event.currentTarget.checked)}
      />
      <span class="label">{field.label}</span>
      {#if field.description}<span class="hint">{field.description}</span>{/if}
    </label>
  {:else if field.type === 'select'}
    <label class="field">
      <span class="label">{field.label}</span>
      <Select
        value={String(values[plugin]?.[field.key] ?? '')}
        ariaLabel={field.label}
        options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
        onchange={(next) => write(plugin, field, next)}
      />
      {#if field.description}<span class="hint">{field.description}</span>{/if}
    </label>
  {:else if field.type === 'number'}
    <label class="field">
      <span class="label">{field.label}</span>
      <input
        type="number"
        value={numberValue(plugin, field.key)}
        oninput={(event) => {
          const raw = event.currentTarget.value
          write(plugin, field, raw === '' ? field.default : Number(raw))
        }}
      />
      {#if field.description}<span class="hint">{field.description}</span>{/if}
    </label>
  {:else}
    <label class="field">
      <span class="label">{field.label}</span>
      <input
        value={String(values[plugin]?.[field.key] ?? '')}
        placeholder={field.placeholder}
        spellcheck="false"
        oninput={(event) => write(plugin, field, event.currentTarget.value)}
      />
      {#if field.description}<span class="hint">{field.description}</span>{/if}
    </label>
  {/if}
{/snippet}

<div
  class="overlay"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && onclose()}
>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="设置">
    <header>
      <h2>设置</h2>
      <button class="close" onclick={onclose} aria-label="关闭">×</button>
    </header>

    <section class="group">
      <h3>通用</h3>
      <label class="field">
        <span class="label">项目根目录</span>
        <div class="row">
          <input
            value={projectRoot}
            aria-label="项目根目录"
            spellcheck="false"
            oninput={(event) => onprojectroot(event.currentTarget.value)}
          />
          <button class="secondary" onclick={onreload}>重新加载</button>
        </div>
        <span class="hint">包含 shirones/content 或 src/content 的目录。</span>
      </label>

      <label class="field checkbox">
        <input
          type="checkbox"
          checked={autosave}
          onchange={(event) => onautosave(event.currentTarget.checked)}
        />
        <span class="label">自动保存</span>
        <span class="hint">停止输入约 1.2 秒后写盘；关闭后仍可用 Ctrl+S 保存。</span>
      </label>
    </section>

    <section class="group">
      <h3>插件</h3>
      {#if pluginError}<p class="error">{pluginError}</p>{/if}
      {#each records as record (record.id)}
        {@const contribution = settingsFor(record)}
        <div class="plugin">
          <div class="plugin-head">
            <div class="plugin-meta">
              <span class="plugin-name">{shortName(record.name)}</span>
              <span class="hint">
                {record.group} · {record.state}{record.error ? ` · ${record.error}` : ''}
              </span>
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
          {#if contribution}
            <div class="plugin-settings">
              {#each contribution.fields as field (field.key)}
                {@render settingField(contribution.plugin, field)}
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </section>

    <p class="hint footer">设置保存在本机，随项目一起生效。</p>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    padding: 24px;
    background: var(--overlay);
  }

  .dialog {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(600px, 100%);
    max-height: 88vh;
    padding: 16px;
    overflow: auto;
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

  .close {
    margin-left: auto;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 20px;
    cursor: pointer;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
  }

  .group h3 {
    margin: 0 0 2px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }

  .field.checkbox {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 4px 8px;
  }

  .field.checkbox input {
    grid-row: span 2;
  }

  .label {
    color: var(--text);
  }

  .hint {
    color: var(--muted);
    font-size: 11px;
  }

  .error {
    margin: 0;
    color: var(--danger);
    font-size: 12px;
  }

  .row {
    display: flex;
    gap: 6px;
  }

  .row input {
    flex: 1;
    min-width: 0;
  }

  input:not([type='checkbox']) {
    padding: 6px 9px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--text);
    font: inherit;
    font-size: 12px;
  }

  button {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 10px;
    background: var(--surface-2);
    color: var(--text);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .plugin {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-2);
  }

  .plugin-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .plugin-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .plugin-name {
    color: var(--text);
    font-family: var(--editor-font);
    font-size: 12px;
  }

  .switch {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    color: var(--muted);
    font-size: 11px;
    white-space: nowrap;
  }

  .switch input[type='checkbox'] {
    margin: 0;
  }

  .plugin-settings {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }

  .footer {
    margin: 0;
    text-align: right;
  }
</style>
