export type ContentKind = 'markdown-frontmatter' | 'markdown-plain' | 'data-ts'

export interface FieldDefinition {
  key: string
  label: string
  type:
    | 'string'
    | 'text'
    | 'date'
    | 'datetime'
    | 'boolean'
    | 'number'
    | 'select'
    | 'tags'
    | 'image'
    | 'icon'
    | 'list'
    | 'object-list'
  group?: string
  required?: boolean
  placeholder?: string
  description?: string
  options?: string[]
  itemFields?: FieldDefinition[]
}

export interface ContentSummary {
  type: string
  id: string
  title: string
  subtitle?: string
  date?: string
  status?: string
  tags?: string[]
  path: string
}

export interface ContentDocument {
  type: string
  id: string
  path: string
  title: string
  body?: string
  frontmatter?: Record<string, unknown>
  rawFrontmatter?: string
  frontmatterDirty?: boolean
  data?: unknown
  hash?: string
  meta: ContentSummary
}

export interface ContentDraft {
  type: string
  title?: string
  slug?: string
  body?: string
  frontmatter?: Record<string, unknown>
  data?: unknown
}

export interface NewContentProvider {
  id: string
  label: string
  description?: string
  fields?: FieldDefinition[]
  create(ctx: unknown, input: Record<string, unknown>): Promise<ContentDraft>
}

export interface ContentTypeDefinition {
  id: string
  label: string
  group: string
  order: number
  kind: ContentKind
  storage: {
    base(layout: ProjectLayout): string
    layout: 'flat' | 'bundle'
    pattern: string
    idFrom: 'filename' | 'directory' | 'field'
  }
  fields?: FieldDefinition[]
  supports: {
    body: boolean
    frontmatter: boolean
    preview: boolean
    lint: boolean
  }
  list(ctx: unknown): Promise<ContentSummary[]>
  read(ctx: unknown, ref: string): Promise<ContentDocument>
  create(ctx: unknown, draft: ContentDraft): Promise<ContentDocument>
  save(ctx: unknown, doc: ContentDocument): Promise<{ path: string; hash?: string }>
  newContent?: NewContentProvider[]
}

export interface ProjectLayout {
  root: string
  mode: 'npm' | 'source'
  contentRoot: string
  configRoot: string
  publicRoot: string
  repoRoot?: string
}
