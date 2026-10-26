# Shirone Studio

Standalone desktop editor for a [Shirone](https://github.com/LyraVoid/Shirone) site, built as
Tauri 2 + Svelte 5 + TypeScript with a Cordis-style plugin architecture.

The editor is content-type oriented: posts are one plugin, not a hard-coded assumption. It is
designed to grow toward moments, series, about pages, timelines and other structured data pages.

## Status

| Milestone | Status |
| --- | --- |
| M0 scaffold and Tauri shell | done |
| M1 Cordis kernel, composition loader, plugin manager | done |
| M2 content type registry and project layout | done |
| M3 Shirone Markdown syntax manifest | done |
| M4 frontmatter codec and field schema | done |
| M5 host bridge, posts and series | done |
| M6 type-driven editor with hidden frontmatter | done |
| M7 content information panel and auto `updated` | done |
| M8 algorithm templates and new-content wizard | done |
| M9 moments and about | done |
| M10 Luogu / Codeforces / AtCoder metadata | done |
| M11 syntax-aware formatting lint | done |
| M12 Markdown / KaTeX / Mermaid preview | done |
| M13 plugin manager and Git contract | done |
| M14 docs and timeline contract | done |

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

`pnpm test` runs all workspace tests. `pnpm build` builds the frontend only; `pnpm tauri build`
produces the desktop bundle.

On a restricted Windows environment where the default temp directory is not writable by
esbuild, set `TEMP` and `TMP` to a project-local directory before building:

```bash
mkdir .tmp
TEMP=.tmp TMP=.tmp pnpm build
```

## Using the editor

1. Set the workspace root to the Blog checkout (the directory containing `shirones/content` or
   `src/content`).
2. Choose a post in the sidebar. The editor only shows the Markdown body; frontmatter is edited
   in the right panel.
3. `Ctrl+S` saves. `updated` is maintained automatically when the body changes, the post is not
   a draft, and `published` is not in the future; disable “自动修改于” to edit it manually.
4. “新建” opens templates for 单题题解 / 整赛题解 / 专题笔记 / 板子笔记 / 随笔. For algorithm
   templates, pick a platform and fetch the problem title/slug/tags before creating.
5. Formatting issues appear as editor underlines and gutter markers; the status bar shows the
   current count. Quick fixes are available from the CodeMirror lint action.
6. The right panel has a preview tab (Markdown, GFM, KaTeX, Mermaid, directives). Local images
   such as `./cover.png` resolve relative to the post bundle; `/images/...` resolves under
   `public/`. Raw `<video>` / `<audio>` elements use the same Tauri asset protocol.
7. “插件” shows the loaded plugins. Core content plugins are locked; optional plugins can be
   toggled without restarting the app.

## Plugin composition

`compose.yml` is the source of truth for the enabled plugin list. Built-in plugins are local
workspace packages; the app does not install remote plugin code in v1. See
[docs/plugin-authoring.md](docs/plugin-authoring.md).

## Documentation

- [Content type contract](docs/content-types.md)
- [Timeline data contract](docs/timeline-contract.md)
- [Plugin authoring](docs/plugin-authoring.md)
- [Shirone syntax reference](docs/syntax-reference.md)

## WebView2 profile location

Launching the app from a sandboxed shell (the DSH harness shell is one) fails with
`WebView2 error: WindowsError(0x8000FFFF)` and no window. `msedgewebview2.exe` itself aborts in
`msedge.dll` with `0x80000003` (`STATUS_BREAKPOINT`, a failed Chromium `CHECK`). The sandbox only
allows writes inside the workspace, and the WebView2 browser process cannot create or write its
user-data profile outside of it.

Evidence, all measured on the same build:

- Inside the sandbox, a profile under `%LOCALAPPDATA%`, `%USERPROFILE%` or even `C:\Temp` crashes
  the browser process; a profile inside the repository opens the window with two renderer
  processes.
- The same executable launched through Task Scheduler (outside the sandbox) with its default
  `%LOCALAPPDATA%` profile opens the window immediately on the stock runtime 155.0.4283.62.
- The runtime version is a red herring: 155 and 156, `--no-sandbox`, `--disable-gpu`,
  `--disable-gpu-sandbox`, `--single-process` and disabling `RendererCodeIntegrity` all behave
  the same, because the abort happens while the profile is opened, before the page loads.

What the app does about it:

- It builds the window against the first usable profile among `.shirone-webview2/` (workspace),
  `~/.shirone-studio/webview2`, and `%TEMP%/shirone-studio-webview2`. Under `DSH_SHELL` the
  workspace directory is tried first, so `pnpm tauri dev` works with no extra configuration.
- `SHIRONE_WEBVIEW_DATA_DIR=<dir>` pins a single directory and disables the fallback;
  `SHIRONE_WEBVIEW_DATA_DIR=default` uses Tauri's own app data folder.
- If every candidate fails it prints each attempt and the failing HRESULT, shows a native dialog
  when there is no console to print to, and exits with code `4` instead of panicking with `101`.

Outside a sandbox any location works, for example
`set SHIRONE_WEBVIEW_DATA_DIR=%LOCALAPPDATA%\shirone-studio\webview2`.
