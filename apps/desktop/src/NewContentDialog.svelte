<script lang="ts">
  import type {
    ContentTypeDefinition,
    FieldDefinition,
    PlatformAdapter,
  } from '@shirone-studio/contracts'
  import type { ContentTemplate } from '@shirone-studio/runtime'
  import type { StudioApp } from './boot'
  import { loadLuoguCookie, saveLuoguCookie } from './settings'
  import Select from './Select.svelte'

  let { context, types, templates, platforms, detectPlatform, onclose, oncreated }: {
    context: StudioApp['context']
    types: ContentTypeDefinition[]
    templates: ContentTemplate[]
    platforms: PlatformAdapter[]
    /** Platform id that recognises this id or URL, if any. */
    detectPlatform: (input: string) => string | null
    onclose: () => void
    oncreated: (type: ContentTypeDefinition, id: string) => void
  } = $props()

  interface Entry {
    id: string
    label: string
    description?: string
    kind: 'template' | 'provider'
    typeId: string
    fields: FieldDefinition[]
  }

  const entries: Entry[] = $derived([
    ...templates.map((template) => ({
      id: `template:${template.id}`,
      label: template.label,
      description: template.description,
      kind: 'template' as const,
      typeId: template.contentType,
      fields: template.fields,
    })),
    ...types.flatMap((type) =>
      (type.newContent ?? []).map((provider) => ({
        id: `provider:${type.id}:${provider.id}`,
        label: provider.label,
        description: provider.description,
        kind: 'provider' as const,
        typeId: type.id,
        fields: provider.fields ?? [],
      })),
    ),
  ])

  let entryId = $state('')
  let values = $state<Record<string, unknown>>({})
  let error = $state('')
  let busy = $state(false)
  let platformId = $state('')
  let platformInput = $state('')
  let platformBusy = $state(false)
  let platformMessage = $state('')
  let luoguCookie = $state(loadLuoguCookie())

  const selected = $derived(entries.find((entry) => entry.id === entryId))

  /** Values a form starts with, from the fields' `default` factories. */
  function initialValues(entry: Entry | undefined): Record<string, unknown> {
    const next: Record<string, unknown> = {}
    for (const field of entry?.fields ?? []) {
      if (typeof field.default !== 'function') continue
      try {
        next[field.key] = field.default()
      } catch {
        // A broken default must not stop the dialog from opening.
      }
    }
    return next
  }

  $effect(() => {
    if (!entryId && entries.length > 0) entryId = entries[0]!.id
  })

  // Switching the template resets the form to that template's defaults, so the
  // moment slug can start at the current HHMM instead of an empty field.
  $effect(() => {
    const entry = entries.find((candidate) => candidate.id === entryId)
    if (!entry) return
    values = initialValues(entry)
  })

  $effect(() => {
    if (!platformId && platforms.length > 0) platformId = platforms[0]!.id
  })

  async function fetchPlatform() {
    // A pasted URL may belong to another platform than the selected one.
    const detected = detectPlatform(platformInput)
    const adapter = platforms.find((candidate) => candidate.id === (detected ?? platformId))
    if (!adapter) return
    if (adapter.id !== platformId) platformId = adapter.id
    const ref = adapter.parseInput(platformInput)
    if (!ref) {
      platformMessage = '无法识别这个题号或 URL'
      return
    }
    try {
      platformBusy = true
      platformMessage = '获取中…'
      const meta = await adapter.fetchProblem(
        context.host,
        ref,
        adapter.id === 'luogu' ? { cookie: luoguCookie } : undefined,
      )
      values = {
        ...values,
        title: adapter.suggestTitle(meta),
        slug: adapter.suggestSlug(meta),
        tags: adapter.suggestedTags(meta).join(', '),
        problemUrl: meta.url,
        platformName: adapter.name,
        problemId: meta.problemId,
      }
      platformMessage = meta.contestTitle
        ? `已识别整赛：${meta.displayTitle}`
        : `已填入：${meta.displayTitle}`
    } catch (cause) {
      platformMessage = cause instanceof Error ? cause.message : String(cause)
    } finally {
      platformBusy = false
    }
  }

  function choose(id: string) {
    entryId = id
    values = initialValues(entries.find((entry) => entry.id === id))
    error = ''
  }

  function update(key: string, value: unknown) {
    values = { ...values, [key]: value }
  }

  async function create() {
    const entry = selected
    if (!entry) return
    const type = types.find((candidate) => candidate.id === entry.typeId)
    if (!type) {
      error = '找不到内容类型'
      return
    }
    if (entry.kind === 'template') {
      const template = templates.find((candidate) => `template:${candidate.id}` === entry.id)
      if (!template) return
      const draft = template.build(context, values)
      try {
        busy = true
        const doc = await type.create(context, draft)
        oncreated(type, doc.id)
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause)
      } finally {
        busy = false
      }
      return
    }
    const provider = (type.newContent ?? []).find(
      (candidate) => `provider:${type.id}:${candidate.id}` === entry.id,
    )
    if (!provider) return
    try {
      busy = true
      const draft = await provider.create(context, values)
      const doc = await type.create(context, draft)
      oncreated(type, doc.id)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      busy = false
    }
  }
</script>

<div class="overlay" role="presentation" onclick={(event) => event.target === event.currentTarget && onclose()}>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="新建内容">
    <header>
      <h2>新建内容</h2>
      <button class="close" onclick={onclose} aria-label="关闭">×</button>
    </header>

    <label class="field">
      <span>模板 / 内容类型</span>
      <Select
        value={entryId}
        ariaLabel="模板 / 内容类型"
        options={entries.map((entry) => ({ value: entry.id, label: entry.label }))}
        onchange={choose}
      />
    </label>

    {#if selected?.description}
      <p class="hint">{selected.description}</p>
    {/if}

    {#if selected?.typeId === 'posts' && platforms.length > 0}
      <div class="platform-row">
        <Select
          value={platformId}
          ariaLabel="平台"
          options={platforms.map((platform) => ({ value: platform.id, label: platform.name }))}
          onchange={(next) => (platformId = next)}
        />
        <input
          value={platformInput}
          oninput={(event) => {
            platformInput = event.currentTarget.value
            // Switch the platform as soon as a URL gives it away.
            const detected = detectPlatform(platformInput)
            if (detected && detected !== platformId) platformId = detected
          }}
          placeholder="P2024 / 2261E / abc479_c / 题面 URL"
          aria-label="题号或链接"
          spellcheck="false"
        />
        <button class="secondary" disabled={platformBusy} onclick={fetchPlatform}>
          {platformBusy ? '获取中…' : '获取'}
        </button>
      </div>
      {#if platformId === 'luogu'}
        <input
          class="cookie"
          value={luoguCookie}
          oninput={(event) => {
            luoguCookie = event.currentTarget.value
            saveLuoguCookie(luoguCookie)
          }}
          placeholder="洛谷 Cookie（可选，用于抓取标签；只保存在本机）"
          aria-label="洛谷 Cookie"
          spellcheck="false"
        />
        <p class="hint">填入 <code>_uid=…; __client_id=…</code> 后，拉取题目时会把标签一起带出来。</p>
      {/if}
      {#if platformMessage}<p class="hint">{platformMessage}</p>{/if}
    {/if}

    {#each selected?.fields ?? [] as field}
      <label class="field">
        <span>
          {field.label}
          {#if field.required}<span class="required">*</span>{/if}
        </span>
        {#if field.type === 'text'}
          <textarea
            rows="3"
            placeholder={field.placeholder}
            value={String(values[field.key] ?? '')}
            oninput={(event) => update(field.key, event.currentTarget.value)}
          ></textarea>
        {:else if field.type === 'select'}
          <Select
            value={String(values[field.key] ?? '')}
            ariaLabel={field.label}
            options={[
              { value: '', label: '—' },
              ...(field.options ?? []).map((option) => ({ value: option, label: option })),
            ]}
            onchange={(next) => update(field.key, next)}
          />
        {:else if field.type === 'number'}
          <input
            type="number"
            value={String(values[field.key] ?? '')}
            oninput={(event) =>
              update(field.key, event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))}
          />
        {:else}
          <input
            type="text"
            placeholder={field.placeholder}
            value={String(values[field.key] ?? '')}
            oninput={(event) => update(field.key, event.currentTarget.value)}
          />
        {/if}
      </label>
    {/each}

    {#if error}<p class="error">{error}</p>{/if}

    <footer>
      <button class="secondary" onclick={onclose}>取消</button>
      <button class="primary" disabled={busy} onclick={create}>{busy ? '创建中…' : '创建'}</button>
    </footer>
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
    width: min(520px, 100%);
    max-height: 90vh;
    overflow: auto;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface-2);
    box-shadow: 0 24px 60px rgb(0 0 0 / 0.25);
    /* Match the 13px control size used by this dialog's inputs. */
    --select-font-size: 13px;
  }

  header,
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  header {
    margin-bottom: 12px;
  }

  h2 {
    margin: 0;
    font-size: 16px;
  }

  .close {
    border: 0;
    background: transparent;
    font-size: 20px;
    cursor: pointer;
    color: var(--muted);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
    font-size: 12px;
  }

  input,
  textarea {
    padding: 7px 9px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 13px;
  }

  .hint {
    margin: 0 0 10px;
    color: var(--muted);
    font-size: 12px;
  }

  .cookie {
    width: 100%;
    margin-bottom: 6px;
    box-sizing: border-box;
  }

  .platform-row {
    display: grid;
    grid-template-columns: 140px minmax(0, 1fr) auto;
    gap: 6px;
    margin-bottom: 8px;
  }

  .required {
    color: var(--accent);
  }

  .error {
    color: var(--danger);
    font-size: 12px;
    white-space: pre-wrap;
  }

  footer {
    justify-content: flex-end;
    margin-top: 14px;
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
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  button:disabled {
    opacity: 0.5;
  }
</style>
