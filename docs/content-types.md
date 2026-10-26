# Content type contract

Shirone Studio treats every author-facing collection as a plugin. The app shell knows how to
list, open, edit and save a `ContentDocument`; it does not import a post-specific store.

## Interface

`ContentTypeDefinition` (in `@shirone-studio/contracts`) provides:

```ts
interface ContentTypeDefinition {
  id: string
  label: string
  group: string
  order: number
  kind: 'markdown-frontmatter' | 'markdown-plain' | 'data'
  storage: {
    base(layout: ProjectLayout): string
    layout: 'bundle' | 'flat'
    pattern: string
    idFrom: 'directory' | 'filename' | 'field'
  }
  fields: FieldDefinition[]
  supports: { body: boolean; frontmatter: boolean; preview: boolean; lint: boolean }
  list(ctx): Promise<ContentSummary[]>
  read(ctx, id): Promise<ContentDocument>
  create(ctx, draft): Promise<ContentDocument>
  save(ctx, doc): Promise<{ path: string; hash?: string }>
  newContent?: NewContentProvider[]
}
```

The context supplied to these methods contains `host` (filesystem/HTTP bridge), `layout`
(detected project paths), `frontmatter` (YAML codec), `syntax` and any registered services.

## Built-in types (v1)

| id | label | storage | body | fields |
| --- | --- | --- | --- | --- |
| `posts` | 文章 | `content/posts/<slug>/index.md` | Markdown + frontmatter | 20 official frontmatter fields |
| `series` | 系列 | `content/series/<slug>.md` | Markdown + frontmatter | title, status, defaultCategory |
| `moments` | 瞬间 | `content/moments/<date>-<slug>.md` | Markdown + frontmatter | published, pinned, mood, tags, location, images |
| `about` | 关于页 | `content/spec/about.md` | Markdown, no frontmatter | — |

Project path prefixes are detected automatically:

- npm mode: `shirones/content`, `shirones/config`, `public`
- source mode: `src/content`, `src/config`, `public`

## Future data types

These are intentionally **not** part of v1. They are `kind: 'data'` plugins over TypeScript data
modules, not Markdown frontmatter:

| type | proposed file | fields |
| --- | --- | --- |
| `timeline` | `content/timeline/index.ts` | see [timeline contract](timeline-contract.md) |
| `projects` | `content/projects/index.ts` | title, description, link, repo, tags, status, featured |
| `skills` | `content/skills/index.ts` | name, level, category, icon, description |
| `devices` | `content/devices/index.ts` | name, image, specs, purchaseDate, note |
| `games` | `content/games/index.ts` | title, cover, platform, status, rating, review |
| `friends` | `content/friends/index.ts` | name, avatar, url, description, group |
| `anime` | `content/anime/index.ts` | title, cover, status, rating, review, tags |

`DataContentType` adds:

```ts
interface DataContentType extends ContentTypeDefinition {
  readData(ctx): Promise<DataDocument>
  writeData(ctx, document: DataDocument): Promise<{ path: string; hash?: string }>
}
```

The editor can render a generic JSON/object panel or a dedicated plugin UI later. Keeping the
registry generic means adding `timeline` does not touch the post editor.

## Adding a type

1. Create a workspace package under `packages/plugins/content-<id>`.
2. Export a `ContentTypeDefinition` (or `DataContentType`) and a DSH-style plugin:

   ```ts
   export const name = 'content-<id>'
   export const inject = ['contentTypes', 'host']
   export function apply(ctx: Context): void {
     ctx.contentTypes.register(type)
   }
   ```

3. Add the plugin name to `compose.yml`.
4. Add the package to `apps/desktop/package.json` and import it in `apps/desktop/src/boot.ts`.
5. Add tests with an in-memory `HostBridge`; never require a real site checkout.
