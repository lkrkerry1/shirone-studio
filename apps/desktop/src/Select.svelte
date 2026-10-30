<script lang="ts">
  export interface SelectOption {
    value: string
    label: string
  }

  let {
    value,
    options,
    onchange,
    id,
    ariaLabel,
    disabled = false,
  }: {
    value: string
    options: SelectOption[]
    onchange: (value: string) => void
    id?: string
    ariaLabel?: string
    disabled?: boolean
  } = $props()

  let open = $state(false)
  let host: HTMLDivElement
  let trigger: HTMLButtonElement
  /** Fixed coordinates: a menu inside a scrolling panel would be clipped. */
  let position = $state({ left: 0, top: 0, width: 0 })

  const selected = $derived(options.find((option) => option.value === value) ?? options[0])

  function toggle(): void {
    if (open) {
      open = false
      return
    }
    const rect = trigger.getBoundingClientRect()
    const estimated = Math.min(options.length * 30 + 8, 260)
    const below = window.innerHeight - rect.bottom
    const top = below >= estimated + 8 ? rect.bottom + 4 : Math.max(8, rect.top - estimated - 4)
    position = { left: rect.left, top, width: rect.width }
    open = true
  }

  function choose(next: string): void {
    open = false
    if (next !== value) onchange(next)
  }

  /** A fixed menu would drift away when the panel or page scrolls. */
  function onScroll(): void {
    if (open) open = false
  }

  function onWindowEvent(event: Event): void {
    if (!open) return
    if (event instanceof KeyboardEvent && event.key === 'Escape') {
      open = false
      return
    }
    if (event instanceof MouseEvent && host && !host.contains(event.target as Node)) {
      open = false
    }
  }
</script>

<svelte:window
  onclick={onWindowEvent}
  onkeydown={onWindowEvent}
  onscroll={onScroll}
  onresize={onScroll}
/>

<div class="select" bind:this={host}>
  <button
    bind:this={trigger}
    {id}
    type="button"
    class="trigger"
    {disabled}
    aria-label={ariaLabel}
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={toggle}
  >
    <span class="label">{selected?.label ?? ''}</span>
    <span class="caret" aria-hidden="true">▾</span>
  </button>

  {#if open}
    <ul
      class="menu"
      role="listbox"
      aria-label={ariaLabel}
      style="left: {position.left}px; top: {position.top}px; width: {position.width}px"
    >
      {#each options as option (option.value)}
        <li role="presentation">
          <button
            type="button"
            class="option"
            class:selected={option.value === value}
            role="option"
            aria-selected={option.value === value}
            onclick={() => choose(option.value)}
          >
            {option.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .select {
    position: relative;
    min-width: 0;
  }

  .trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 6px 9px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    /* Form containers can pass their control size down through this token. */
    font-size: var(--select-font-size, inherit);
    text-align: left;
    cursor: pointer;
  }

  .trigger:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .caret {
    flex: none;
    color: var(--muted);
    font-size: 10px;
  }

  .menu {
    position: fixed;
    z-index: 60;
    max-height: 260px;
    margin: 0;
    padding: 4px;
    overflow: auto;
    list-style: none;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface-2);
    box-shadow: 0 12px 28px rgb(0 0 0 / 0.35);
    font-size: var(--select-font-size, inherit);
  }

  .option {
    display: block;
    width: 100%;
    padding: 6px 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .option:hover {
    background: color-mix(in oklab, var(--accent) 12%, transparent);
  }

  .option.selected {
    background: color-mix(in oklab, var(--accent) 20%, transparent);
  }
</style>
