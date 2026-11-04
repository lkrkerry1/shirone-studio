import type { FieldDefinition, FieldOption } from '@shirone-studio/contracts'

export interface ResolvedOption {
  value: string
  label: string
}

/** A field's static options, accepting both plain strings and labelled entries. */
export function normalizeOptions(options: FieldOption[] | undefined): ResolvedOption[] {
  return (options ?? []).map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  )
}

/**
 * Options for a field, including `optionsSource`: the ids of another content
 * type (e.g. `series` → every existing series slug).
 */
export async function resolveFieldOptions(
  field: FieldDefinition,
  context: unknown,
): Promise<ResolvedOption[]> {
  const base = normalizeOptions(field.options)
  if (!field.optionsSource) return base
  const registry = (
    context as {
      contentTypes?: {
        get(id: string): {
          list(ctx: unknown): Promise<Array<{ id: string; title: string }>>
        } | undefined
      }
    }
  ).contentTypes
  const type = registry?.get(field.optionsSource)
  if (!type) return base
  try {
    const items = await type.list(context)
    return [
      ...base,
      ...items.map((item) => ({ value: item.id, label: item.title || item.id })),
    ]
  } catch {
    return base
  }
}
