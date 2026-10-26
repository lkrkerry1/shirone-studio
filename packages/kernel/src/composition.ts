import { parse } from 'yaml'

export interface PluginEntry {
  /** Stable entry id; defaults to the package name. */
  id?: string
  /** Package name resolved by the app's static plugin registry. */
  name: string
  config?: unknown
  disabled?: boolean
  /** Entry ids that must stay enabled while this one is enabled. */
  requires?: string[]
}

export interface PluginGroup {
  id: string
  disabled?: boolean
  plugins: Array<PluginEntry | PluginGroup>
}

export interface Composition {
  groups: PluginGroup[]
}

export interface FlatPluginEntry extends PluginEntry {
  group: string
  id: string
}

export function parseComposition(source: string): Composition {
  const parsed = parse(source) as unknown
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('compose.yml must be a mapping')
  }
  const groups = (parsed as { groups?: unknown }).groups
  if (!Array.isArray(groups)) {
    throw new Error('compose.yml must contain a groups array')
  }
  return { groups: groups.map(validateGroup) }
}

function validateGroup(input: unknown): PluginGroup {
  if (!input || typeof input !== 'object') throw new Error('plugin group must be a mapping')
  const group = input as Record<string, unknown>
  const id = group.id
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('plugin group needs a non-empty id')
  }
  if (!Array.isArray(group.plugins)) {
    throw new Error(`plugin group "${id}" needs a plugins array`)
  }
  return {
    id,
    disabled: group.disabled === true,
    plugins: group.plugins.map((entry) => validateEntry(entry, id)),
  }
}

function validateEntry(input: unknown, group: string): PluginEntry | PluginGroup {
  if (!input || typeof input !== 'object') throw new Error('plugin entry must be a mapping')
  const entry = input as Record<string, unknown>
  if (Array.isArray(entry.plugins)) return validateGroup(input)
  if (typeof entry.name !== 'string' || entry.name.length === 0) {
    throw new Error(`plugin entry in group "${group}" needs a name`)
  }
  return {
    id: typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : undefined,
    name: entry.name,
    config: entry.config,
    disabled: entry.disabled === true,
    requires: Array.isArray(entry.requires)
      ? entry.requires.filter((item): item is string => typeof item === 'string')
      : undefined,
  }
}

export function flattenComposition(composition: Composition): FlatPluginEntry[] {
  const out: FlatPluginEntry[] = []
  const visit = (group: PluginGroup, inheritedDisabled: boolean) => {
    const disabled = inheritedDisabled || group.disabled === true
    for (const item of group.plugins) {
      if ('plugins' in item) {
        visit(item, disabled)
        continue
      }
      out.push({
        ...item,
        group: group.id,
        id: item.id ?? item.name,
        disabled: disabled || item.disabled === true,
      })
    }
  }
  for (const group of composition.groups) visit(group, false)
  return out
}
