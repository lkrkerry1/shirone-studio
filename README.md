# Shirone Studio

Standalone desktop editor for a [Shirone](https://github.com/LyraVoid/Shirone) site, built as
Tauri 2 + Svelte 5 + TypeScript with a Cordis-style plugin architecture.

The editor is content-type oriented: posts are one plugin, not a hard-coded assumption. It is
designed to grow toward moments, series, about pages, timelines and other structured data pages.

## Prerequisites

- Windows 10/11 x64 with WebView2
- Node.js 22+ and pnpm 12+
- Rust stable (`stable-msvc`)
- Microsoft Visual Studio Build Tools with the C++ workload

## Development

```bash
pnpm install
pnpm test
pnpm tauri dev
```

## Build

```bash
pnpm build
pnpm tauri build
```

## Plugin composition

`compose.yml` is the source of truth for the enabled plugin list. Built-in plugins are local
workspace packages; the app does not install remote plugin code in v1.

## Roadmap

- M0 scaffold and Tauri shell
- M1 Cordis kernel, composition loader and plugin manager
- M2 content type registry and project layout
- M3 Shirone Markdown syntax manifest
- M4 frontmatter codec and field schema
- M5 posts and series content types
- M6 type-driven editor shell
- M7 content information panel and auto-updated metadata
- M8 algorithm templates and new-content wizard
- M9 moments and about content types
- M10 platform metadata (Luogu / Codeforces / AtCoder)
- M11 syntax-aware formatting checks
- M12 Markdown / KaTeX / Mermaid preview
- M13 plugin manager, settings and Git contract
- M14 documentation and final verification
