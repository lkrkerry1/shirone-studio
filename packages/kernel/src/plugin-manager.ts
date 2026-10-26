import type { Context } from '@deepseek-ai/cordis'
import type { PluginDefinition } from './index'
import { flattenComposition, type Composition, type FlatPluginEntry } from './composition'

export interface PluginRecord {
  id: string
  name: string
  group: string
  state: 'pending' | 'active' | 'disabled' | 'error'
  error?: string
  disabled: boolean
}

export type PluginRegistry = Record<string, PluginDefinition<unknown>>

interface LoadedRecord extends PluginRecord {
  fiber?: { dispose(): Promise<void> }
}

export class PluginManager {
  private readonly records = new Map<string, LoadedRecord>()
  private readonly entries: FlatPluginEntry[]

  constructor(
    private readonly ctx: Context,
    private readonly registry: PluginRegistry,
    composition: Composition,
  ) {
    this.entries = flattenComposition(composition)
    for (const entry of this.entries) {
      this.records.set(entry.id, {
        id: entry.id,
        name: entry.name,
        group: entry.group,
        state: entry.disabled ? 'disabled' : 'pending',
        disabled: entry.disabled === true,
      })
    }
  }

  list(): PluginRecord[] {
    return [...this.records.values()].map(({ fiber: _fiber, ...record }) => record)
  }

  async loadAll(): Promise<void> {
    for (const entry of this.entries) {
      if (entry.disabled) continue
      await this.load(entry)
    }
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const record = this.records.get(id)
    const entry = this.entries.find((item) => item.id === id)
    if (!record || !entry) throw new Error(`Unknown plugin entry: ${id}`)

    if (!enabled) {
      const dependents = [...this.records.values()].filter((item) => {
        if (item.state !== 'active' || item.id === id) return false
        const dependencyEntry = this.entries.find((candidate) => candidate.id === item.id)
        return dependencyEntry?.requires?.includes(id) === true
      })
      if (dependents.length > 0) {
        throw new Error(
          `Cannot disable ${id}; required by ${dependents.map((item) => item.id).join(', ')}`,
        )
      }
      await record.fiber?.dispose()
      record.fiber = undefined
      record.state = 'disabled'
      record.disabled = true
      return
    }

    record.disabled = false
    record.state = 'pending'
    await this.load(entry)
  }

  async disposeAll(): Promise<void> {
    for (const record of this.records.values()) {
      await record.fiber?.dispose()
      record.fiber = undefined
    }
  }

  private async load(entry: FlatPluginEntry): Promise<void> {
    const record = this.records.get(entry.id)
    if (!record || record.state === 'active') return
    const definition = this.registry[entry.name]
    if (!definition) {
      record.state = 'error'
      record.error = `Plugin package not registered: ${entry.name}`
      return
    }
    try {
      const config = definition.Config ? definition.Config.parse(entry.config ?? {}) : entry.config
      // Cordis treats a function plugin and its properties as the plugin unit.
      // Our package exports `{ name, inject, Config, apply }` like DSH, so adapt it
      // here instead of relying on Cordis to understand the package shape.
      const plugin = Object.assign(
        (inner: Context, pluginConfig: unknown) => definition.apply(inner, pluginConfig as never),
        { inject: definition.inject },
      )
      const fiber = (await this.ctx.plugin(plugin, config as never)) as LoadedRecord['fiber']
      record.fiber = fiber
      record.state = 'active'
      record.error = undefined
    } catch (error) {
      record.state = 'error'
      record.error = error instanceof Error ? error.message : String(error)
    }
  }
}
