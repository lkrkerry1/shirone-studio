# Timeline data contract (future plugin)

Timeline is a data-authored page, not a Markdown post. A future
`@shirone-studio/plugin-content-timeline` plugin should own this shape. Nothing in v1 reads it,
so adding it later does not migrate existing posts or moments.

## Content file

Path resolution uses the detected project layout:

- npm mode: `shirones/content/timeline/index.ts`
- source mode: `src/content/timeline/index.ts`

```ts
export const categories = [
  { id: 'education', label: '求学', color: '#4f6bed' },
] as const

export const items = [
  {
    title: '进入大学',
    date: '2023-09-01',
    category: 'education',
    subtitle: '计算机科学与技术',
    location: '南京',
    description: '开始系统地学习算法与工程。',
    highlights: ['ACM 集训', '第一次开源贡献'],
    tags: ['校园'],
    icon: 'material-symbols:school',
    featured: true,
  },
]
```

## Item fields

| field | type | required | notes |
| --- | --- | --- | --- |
| `title` | string | yes | card heading |
| `date` | `YYYY-MM-DD` | yes | sort key |
| `category` | string | yes | must exist in `categories` |
| `subtitle` | string | no | secondary line |
| `location` | string | no | place label |
| `description` | string | no | one paragraph |
| `highlights` | string[] | no | bullet chips |
| `tags` | string[] | no | filters |
| `icon` | string | no | Iconify name |
| `featured` | boolean | no | pin/emphasis |

## Config file

`content/config/timeline.ts` (or `src/config/timeline.ts`):

```ts
export const timelineConfig = {
  categories: ['education', 'work', 'life'],
  order: 'desc',
  disabledTitles: [],
}
```

## Plugin boundary

`DataContentType` returns a typed `DataDocument` and exposes:

- `list(ctx)` — entries for the sidebar;
- `readData(ctx)` / `writeData(ctx, document)` — raw-preserving save;
- optional `newContent` provider for a single entry.

The generic app shell can show a JSON editor immediately; a dedicated timeline UI can be added
as a client plugin later. Both coexist without changing the post editor.
