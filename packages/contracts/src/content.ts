import type { ContentTypeDefinition } from './index'

export interface DataDocument {
  type: string
  id: string
  data: unknown
  path: string
}

export interface Validation {
  level: 'error' | 'warning' | 'info'
  message: string
  path?: string
}

export interface DataContentType extends Omit<ContentTypeDefinition, 'kind'> {
  kind: 'data-ts'
  load(ctx: unknown): Promise<DataDocument>
  validate(data: unknown): Validation[]
  serialize(data: DataDocument): string
  form: import('./index').FieldDefinition[]
}

export function defineContentType<T extends ContentTypeDefinition>(type: T): T {
  return type
}

export function defineDataContentType<T extends DataContentType>(type: T): T {
  return type
}

export type {
  ContentDocument,
  ContentDraft,
  ContentSummary,
  ContentTypeDefinition,
  FieldDefinition,
  ProjectLayout,
} from './index'
