# Plugin authoring

Shirone Studio uses the same package shape as DSH: a plugin exports `name`, optional `inject`,
optional `Config`, and `apply`.

```ts
import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'

export const name = 'my-plugin'
export const inject = ['contentTypes', 'host']
export const Config = {
  parse(input: unknown) {
    return { enabled: (input as { enabled?: boolean })?.enabled ?? true }
  },
}

export function apply(ctx: Context, config: { enabled: boolean }): void {
  if (!config.enabled) return
  // register a service, content type, syntax, template, platform, lint rule...
}

export default definePlugin({ name, inject, Config, apply })
```

## Registration

`compose.yml` at the repository root is the source of truth:

```yaml
groups:
  - id: core
    plugins:
      - name: '@shirone-studio/plugin-host'
      - name: '@shirone-studio/plugin-frontmatter'
```

The app imports each package and maps its name to a `PluginDefinition`. Unknown names become
`error` records in the plugin manager; a missing optional plugin never crashes the editor.

`requires` on a group/entry forms a dependency edge. The plugin manager refuses to disable an
active plugin that another active entry requires. The UI additionally locks the core content
plugins.

## Available services

| service | owner | purpose |
| --- | --- | --- |
| `host` | `plugin-host` | Tauri-backed filesystem and HTTP bridge |
| `frontmatter` | `plugin-frontmatter` | YAML split/serialize/compose with raw preservation |
| `contentTypes` | `runtime` | content type registry |
| `syntax` | `runtime` | Shirone syntax manifest registry |
| `templates` | `runtime` | new-content template registry |
| `platforms` | `runtime` | problem metadata adapters |
| `lint` | `plugin-lint` | formatting diagnostics |
| `preview` | `plugin-preview` | Markdown/KaTeX/Mermaid renderer |
| `git` | `plugin-git` | Git contract, noop in v1 |

Services use Cordis `Service`, so injection and disposal are handled by the kernel.

## Rules

- Keep plugin code free of DOM assumptions where possible; the core packages are unit-tested in
  Node with in-memory hosts.
- Do not add a plugin to `compose.yml` until it is imported in `apps/desktop/src/boot.ts`.
- Plugins that can be optional must register lazily and leave the app usable when disabled.
- Save operations take the document hash and return a conflict instead of overwriting external
  changes (`write_text` returns `CONFLICT`).
