<script lang="ts">
  import type { PluginSettingField } from '@shirone-studio/contracts'
  import type { StudioApp } from './boot'
  import Select from './Select.svelte'

  let {
    context,
    projectRoot,
    autosave,
    onprojectroot,
    onautosave,
    onreload,
    onsaved,
    onclose,
  }: {
    context: StudioApp['context']
    projectRoot: string
    autosave: boolean
    onprojectroot: (value: string) => void
    onautosave: (value: boolean) => void
    onreload: () => void
    onsaved: () => void
    onclose: () => void
  } = $props()

  function initialValues(): Record<string, Record<string, unknown>> {
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
  let values = $state<Record<string, Record<string, unknown>>>(initialValues())

  function write(plugin: string, field: PluginSettingField, value: unknown): void {
    values[plugin] = { ...values[plugin], [field.key]: value }
    context.settings.write(plugin, field.key, value)
    onsaved()
  }

  function numberValue(plugin: string, key: string): string {
    const value = values[plugin]?.[key]
    return value === undefined || value === null ? '' : String(value)
  }
</script>

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

    {#each contributions as contribution (contribution.plugin)}
      <section class="group">
        <h3>{contribution.title}</h3>
        {#each contribution.fields as field (field.key)}
          {#if field.type === 'boolean'}
            <label class="field checkbox">
              <input
                type="checkbox"
                checked={values[contribution.plugin]?.[field.key] === true}
                onchange={(event) => write(contribution.plugin, field, event.currentTarget.checked)}
              />
              <span class="label">{field.label}</span>
              {#if field.description}<span class="hint">{field.description}</span>{/if}
            </label>
          {:else if field.type === 'select'}
            <label class="field">
              <span class="label">{field.label}</span>
              <Select
                value={String(values[contribution.plugin]?.[field.key] ?? '')}
                ariaLabel={field.label}
                options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
                onchange={(next) => write(contribution.plugin, field, next)}
              />
              {#if field.description}<span class="hint">{field.description}</span>{/if}
            </label>
          {:else if field.type === 'number'}
            <label class="field">
              <span class="label">{field.label}</span>
              <input
                type="number"
                value={numberValue(contribution.plugin, field.key)}
                oninput={(event) => {
                  const raw = event.currentTarget.value
                  write(contribution.plugin, field, raw === '' ? field.default : Number(raw))
                }}
              />
              {#if field.description}<span class="hint">{field.description}</span>{/if}
            </label>
          {:else}
            <label class="field">
              <span class="label">{field.label}</span>
              <input
                value={String(values[contribution.plugin]?.[field.key] ?? '')}
                placeholder={field.placeholder}
                spellcheck="false"
                oninput={(event) => write(contribution.plugin, field, event.currentTarget.value)}
              />
              {#if field.description}<span class="hint">{field.description}</span>{/if}
            </label>
          {/if}
        {/each}
      </section>
    {/each}

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
    width: min(560px, 100%);
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

  .footer {
    margin: 0;
    text-align: right;
  }
</style>
