import { Context, Service } from '@deepseek-ai/cordis'

export { Context, Service }
export { parseComposition, flattenComposition } from './composition'
export type { Composition, FlatPluginEntry, PluginEntry, PluginGroup } from './composition'
export { PluginManager } from './plugin-manager'
export type { PluginRecord, PluginRegistry } from './plugin-manager'

export interface ConfigSchema<T> {
  parse(input: unknown): T
}

export interface PluginDefinition<T = unknown> {
  name: string
  inject?: readonly string[]
  Config?: ConfigSchema<T>
  apply(ctx: Context, config: T): void | Promise<void>
}

export function definePlugin<T>(definition: PluginDefinition<T>): PluginDefinition<T> {
  return definition
}
