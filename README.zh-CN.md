# Shirone Studio

**简体中文** | [English](README.md)

> [!IMPORTANT]
> **本项目由 AI 完成。**
> 从第一行代码到最后一次提交，本仓库的源码、测试、文档和提交信息均由 **AI 编码代理**在人类
> 的需求、审查与决策下生成。它不是人类手写的项目，请按"AI 生成的软件"来审查、使用与评估，
> 详见文末 [AI 生成声明](#ai-生成声明)。

面向 [Shirone](https://github.com/LyraVoid/Shirone) 博客站的独立桌面编辑器，基于
Tauri 2 + Svelte 5 + TypeScript，插件架构参考 Cordis。

编辑器的组织方式以「内容类型」为中心：文章只是其中一个插件，而不是写死的假设。设计上可以继续
生长出瞬间、系列、关于页、时间线等结构化页面。

## 功能

- **内容类型驱动**：文章（题解/笔记/随笔）、系列、瞬间、关于页各是一个插件，侧栏按类型分组。
- **富文本编辑**：标题、强调、代码、链接、图片、KaTeX 公式、引用、表格在编辑器内就地渲染；
  光标进入某个块时该块还原为 Markdown 源码，也可一键切到纯源码模式。
- **排版检查**：中英文空格、中文标点、公式两侧空格、代码块语言、一级标题、题解「题意：」等
  规则；状态栏显示数量，可一键修复所有可自动修复项。
- **实时预览**：Markdown / GFM / KaTeX / Mermaid / 指令块，本地图片走 Tauri asset 协议。
- **外观插件**：整套配色（Material 3 vibrant，亮/暗）、博客同款字体（Outfit / Yozai /
  JetBrains Mono）、代码高亮、编辑器主题、滚动条都在 appearance 插件里，可替换。
- **Git 面板**：查看分支/变更、逐文件 diff、暂存、按选中文件提交、推送，全部在应用内完成。
- **图片粘贴**：`Ctrl+V` 或拖入图片，自动存进文章的 `img/` 目录并插入 Markdown 引用。
- **自动保存**：停止输入约 1.2 秒写盘；窗口重新获得焦点时检测外部改动并提示重载/覆盖；关窗前
  落盘未保存内容。
- **新建向导**：单题题解 / 整赛题解 / 专题笔记 / 板子笔记 / 随笔等模板；算法模板可先从洛谷、
  Codeforces、AtCoder 拉取题目标题、slug 与标签。
- **插件管理**：核心内容插件锁定，可选插件可即时启停，组合来源是 `compose.yml`。
- **WebView2 容错**：沙箱内找不到可写 profile 时按候选目录回退，失败时给出诊断而不是崩溃。

## 技术栈与结构

- **桌面外壳**：Tauri 2（Rust），WebView2
- **前端**：Svelte 5（runes）+ TypeScript + CodeMirror 6
- **插件内核**：`packages/kernel`（Cordis 风格 Service/Context，`compose.yml` 组合）
- **契约**：`packages/contracts`；运行时服务：`packages/runtime`
- **插件**：`packages/plugins/*`（host、frontmatter、各内容类型、模板、平台、lint、preview、
  git、appearance、syntax-shirone）
- **应用**：`apps/desktop`（Svelte UI + `src-tauri` Rust 命令）

## 里程碑

| 里程碑 | 状态 |
| --- | --- |
| M0 脚手架与 Tauri 外壳 | 完成 |
| M1 Cordis 内核、组合加载器、插件管理 | 完成 |
| M2 内容类型注册表与项目布局 | 完成 |
| M3 Shirone 语法清单 | 完成 |
| M4 frontmatter 编解码与字段 schema | 完成 |
| M5 host 桥接、文章与系列 | 完成 |
| M6 类型驱动编辑器（隐藏 frontmatter） | 完成 |
| M7 内容信息面板与自动 `updated` | 完成 |
| M8 算法模板与新建向导 | 完成 |
| M9 瞬间与关于页 | 完成 |
| M10 洛谷 / Codeforces / AtCoder 元数据 | 完成 |
| M11 语法感知排版检查 | 完成 |
| M12 Markdown / KaTeX / Mermaid 预览 | 完成 |
| M13 插件管理与 Git 契约 | 完成 |
| M14 文档与时间线契约 | 完成 |
| M15 Git 面板、图片粘贴与自动保存 | 完成 |

## 环境要求

- Windows 10/11 x64，带 WebView2 运行时
- Node.js 22+ 与 pnpm 12+
- Rust stable（`stable-msvc`）
- Visual Studio Build Tools（含 C++ 工作负载）

## 开发与构建

```bash
pnpm install
pnpm test          # 全部工作区测试
pnpm tauri dev     # 开发窗口
pnpm build         # 只构建前端
pnpm tauri build   # 打包桌面安装包
```

如果 `esbuild` 因默认临时目录不可写而失败，把 `TEMP`/`TMP` 指到项目内目录：

```bash
mkdir .tmp
TEMP=.tmp TMP=.tmp pnpm build
```

## 使用

1. 把工作区根目录设为博客仓库（包含 `shirones/content` 或 `src/content` 的目录）。
2. 在侧栏选择文章。编辑器只显示正文 Markdown，frontmatter 在右侧「属性」面板编辑。
3. `Ctrl+S` 保存；自动保存默认开启。正文变化且非草稿、`published` 不在未来时，`updated` 会
   自动维护——关掉「自动修改于」即可手改。
4. 「新建」提供各类模板；算法模板可先选平台、填题号/链接，拉取标题、slug 与标签再创建。
5. 排版问题以编辑器下划线和行号标记呈现，状态栏显示数量，可「一键修复」。
6. 右侧「预览」标签渲染 Markdown / GFM / KaTeX / Mermaid；`./cover.png` 相对文章目录解析，
   `/images/...` 在 `public/` 下解析。
7. 顶栏「Git」查看变更、看 diff、提交与推送。
8. 「插件」查看已加载插件；核心内容插件锁定，可选插件可即时启停。

## 插件组合

`compose.yml` 是启用插件列表的唯一来源。内置插件都是工作区内的本地包，v1 不安装远程插件代码。
详见 [docs/plugin-authoring.md](docs/plugin-authoring.md)。

## 文档

- [内容类型契约](docs/content-types.md)
- [时间线数据契约](docs/timeline-contract.md)
- [插件编写](docs/plugin-authoring.md)
- [Shirone 语法参考](docs/syntax-reference.md)
- [签名安装包](docs/signing.md)

## WebView2 profile 位置

在受限外壳（例如 DSH harness 的 shell）里启动时，WebView2 浏览器进程无法在工作区之外创建
profile，会以 `WebView2 error: WindowsError(0x8000FFFF)` 失败且不打开窗口——`msedgewebview2.exe`
本身在 `msedge.dll` 里以 `0x80000003` 中止。

应用的处理方式：

- 依次尝试 `.shirone-webview2/`（工作区）、`~/.shirone-studio/webview2`、
  `%TEMP%/shirone-studio-webview2`，用第一个可用的 profile 建窗口；存在 `DSH_SHELL` 时优先
  工作区目录，因此 `pnpm tauri dev` 无需额外配置。
- `SHIRONE_WEBVIEW_DATA_DIR=<dir>` 固定单个目录并关闭回退；`=default` 使用 Tauri 自己的应用
  数据目录。
- 全部失败时打印每次尝试与 HRESULT，没有控制台时弹原生对话框，并以退出码 `4` 退出（而不是
  panic 的 `101`）。

沙箱之外任何位置都可以，例如
`set SHIRONE_WEBVIEW_DATA_DIR=%LOCALAPPDATA%\shirone-studio\webview2`。

## AI 生成声明

**这个项目是 AI 生成的软件。**

- **生成范围**：源码、测试、文档、提交信息、发布说明，全部由 AI 编码代理产出。人类的角色是
  提出需求、审查结果、指出问题并决定是否合并/发布。
- **迭代方式**：项目不是一次性生成，而是多轮对话下的持续迭代——每轮由人类描述问题或期望，
  AI 定位原因、修改代码、补测试、提交并推送。
- **可能的问题**：AI 生成的代码同样会有幻觉、遗漏边缘情况、过度自信的解释，以及"看起来对但
  没验证"的实现。使用前请自行审查，尤其是涉及数据写入（保存、Git 操作、文件系统）的路径。
- **不是范例**：请不要把本仓库当作人类工程实践、团队协作或代码评审流程的参照。
- **欢迎反馈**：发现问题请开 issue 或 PR；修复同样可以由 AI 完成，但判断与验收仍应由人负责。

## 许可证

MIT，见 [LICENSE](LICENSE)。项目由 AI 生成，许可证同样覆盖这些生成的代码。
