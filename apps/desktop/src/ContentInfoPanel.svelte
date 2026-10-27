<script lang="ts">
  import type { FieldDefinition } from '@shirone-studio/contracts'
  import Select from './Select.svelte'

  let { fields, value, onChange }: {
    fields: FieldDefinition[]
    value: Record<string, unknown>
    onChange: (next: Record<string, unknown>) => void
  } = $props()

  const groups = $derived([...new Set(fields.map((field) => field.group ?? '其他'))])
  const primaryGroups = new Set(['基础', '内容关联', '状态'])

  function update(key: string, next: unknown) {
    onChange({ ...value, [key]: next })
  }

  function stringValue(key: string): string {
    const current = value[key]
    if (current instanceof Date) return current.toISOString().slice(0, 10)
    return current === undefined || current === null ? '' : String(current)
  }

  function tagsValue(key: string): string {
    const current = value[key]
    return Array.isArray(current) ? current.join(', ') : ''
  }

  const pad = (number: number) => String(number).padStart(2, '0')

  function localOffset(): string {
    const minutes = -new Date().getTimezoneOffset()
    const sign = minutes >= 0 ? '+' : '-'
    const absolute = Math.abs(minutes)
    return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
  }

  /** A timestamp shown in the browser's local time, which is what datetime-local wants. */
  function datetimeValue(key: string): string {
    const current = value[key]
    if (current === undefined || current === null || current === '') return ''
    const date = new Date(String(current))
    if (Number.isNaN(date.getTime())) return String(current).slice(0, 16)
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`
  }

  /**
   * datetime-local reports wall time without a zone; write it back as a full
   * ISO timestamp (+08:00 style) so the frontmatter keeps a timestamp, not a
   * quoted string.
   */
  function updateDatetime(key: string, raw: string) {
    if (raw === '') {
      update(key, '')
      return
    }
    const previous = stringValue(key)
    const seconds = /T\d{2}:\d{2}:(\d{2})/.exec(previous)?.[1] ?? '00'
    const offset = /(?:Z|[+-]\d{2}:\d{2})$/.exec(previous)?.[0] ?? localOffset()
    update(key, `${raw.slice(0, 16)}:${seconds}${offset}`)
  }
</script>

<div class="panel">
  {#each groups as group}
    {@const groupFields = fields.filter((field) => (field.group ?? '其他') === group)}
    {#if primaryGroups.has(group)}
      <section class="field-group">
        <h3>{group}</h3>
        {#each groupFields as field}
          {@render fieldControl(field)}
        {/each}
      </section>
    {:else}
      <details class="field-group">
        <summary>{group}</summary>
        {#each groupFields as field}
          {@render fieldControl(field)}
        {/each}
      </details>
    {/if}
  {/each}
</div>

{#snippet fieldControl(field: FieldDefinition)}
  <label class="field" for={`fm-${field.key}`}>
    <span class="label">
      {field.label}
      {#if field.required}<span class="required">*</span>{/if}
    </span>
    {#if field.type === 'text'}
      <textarea
        id={`fm-${field.key}`}
        rows="3"
        placeholder={field.placeholder}
        value={stringValue(field.key)}
        oninput={(event) => update(field.key, event.currentTarget.value)}
      ></textarea>
    {:else if field.type === 'boolean'}
      <input
        id={`fm-${field.key}`}
        type="checkbox"
        checked={value[field.key] === true}
        onchange={(event) => update(field.key, event.currentTarget.checked)}
      />
    {:else if field.type === 'select'}
      <Select
        id={`fm-${field.key}`}
        value={stringValue(field.key)}
        options={[
          { value: '', label: '—' },
          ...(field.options ?? []).map((option) => ({ value: option, label: option })),
        ]}
        onchange={(next) => update(field.key, next)}
      />
    {:else if field.type === 'number'}
      <input
        id={`fm-${field.key}`}
        type="number"
        value={stringValue(field.key)}
        oninput={(event) =>
          update(field.key, event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))}
      />
    {:else if field.type === 'date'}
      <input
        id={`fm-${field.key}`}
        type="date"
        value={stringValue(field.key)}
        oninput={(event) => update(field.key, event.currentTarget.value)}
      />
    {:else if field.type === 'datetime'}
      <input
        id={`fm-${field.key}`}
        type="datetime-local"
        value={datetimeValue(field.key)}
        oninput={(event) => updateDatetime(field.key, event.currentTarget.value)}
      />
    {:else if field.type === 'tags'}
      <input
        id={`fm-${field.key}`}
        type="text"
        placeholder="用逗号分隔"
        value={tagsValue(field.key)}
        oninput={(event) =>
          update(
            field.key,
            event.currentTarget.value
              .split(/[,，]/)
              .map((tag) => tag.trim())
              .filter(Boolean),
          )}
      />
    {:else if field.type === 'object-list' || field.type === 'list'}
      <textarea
        id={`fm-${field.key}`}
        rows="4"
        placeholder={field.placeholder ?? 'JSON'}
        value={JSON.stringify(value[field.key] ?? [], null, 2)}
        oninput={(event) => {
          try {
            update(field.key, JSON.parse(event.currentTarget.value))
          } catch {
            // Keep the last valid value while the user is typing JSON.
          }
        }}
      ></textarea>
    {:else}
      <input
        id={`fm-${field.key}`}
        type="text"
        placeholder={field.placeholder}
        value={stringValue(field.key)}
        oninput={(event) => update(field.key, event.currentTarget.value)}
      />
    {/if}
  </label>
{/snippet}

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    overflow: auto;
    /* Match the 12px control size used by this panel's inputs. */
    --select-font-size: 12px;
  }

  .field-group {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px;
    background: var(--surface-2);
  }

  .field-group h3,
  .field-group summary {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--muted);
    letter-spacing: 0.04em;
    cursor: pointer;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 9px;
  }

  .label {
    font-size: 12px;
    font-weight: 600;
  }

  .required {
    color: var(--accent);
  }

  input,
  textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 12px;
  }

  input[type='checkbox'] {
    width: auto;
    align-self: flex-start;
  }

  textarea {
    resize: vertical;
  }
</style>
