import { Service } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import type {
  PluginSettingField,
  PluginSettingsContribution,
} from '@shirone-studio/contracts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    settings: SettingsRegistry
  }
}

const STORAGE_PREFIX = 'shirone-studio.setting.'

function storageKey(plugin: string, key: string): string {
  return `${STORAGE_PREFIX}${plugin}.${key}`
}

/**
 * Registry of plugin settings surfaced in the settings dialog.
 *
 * Plugins register the fields they want to expose; values are stored per
 * plugin/key in localStorage and can be read at any time by the plugin itself.
 */
export class SettingsRegistry extends Service {
  private readonly contributions = new Map<string, PluginSettingsContribution>()
  private readonly listeners = new Set<() => void>()

  constructor(ctx: Context) {
    super(ctx, 'settings')
  }

  register(contribution: PluginSettingsContribution): () => void {
    if (this.contributions.has(contribution.plugin)) {
      throw new Error(`Settings already registered: ${contribution.plugin}`)
    }
    this.contributions.set(contribution.plugin, contribution)
    this.emit()
    return () => {
      if (this.contributions.delete(contribution.plugin)) this.emit()
    }
  }

  list(): PluginSettingsContribution[] {
    return [...this.contributions.values()].sort((a, b) => a.title.localeCompare(b.title))
  }

  field(plugin: string, key: string): PluginSettingField | undefined {
    return this.contributions.get(plugin)?.fields.find((field) => field.key === key)
  }

  /** Stored value, falling back to the field default. */
  read(plugin: string, key: string): unknown {
    const field = this.field(plugin, key)
    if (typeof localStorage === 'undefined') return field?.default
    const raw = localStorage.getItem(storageKey(plugin, key))
    if (raw === null) return field?.default
    try {
      return JSON.parse(raw)
    } catch {
      return field?.default
    }
  }

  write(plugin: string, key: string, value: unknown): void {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(storageKey(plugin, key), JSON.stringify(value))
    this.emit()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
