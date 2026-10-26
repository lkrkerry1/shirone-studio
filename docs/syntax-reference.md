# Shirone Markdown Syntax Reference

Generated from `packages/plugins/syntax-shirone/src/specs.ts`. Do not edit by hand;
run `pnpm docs:syntax`.

| id | category | name | docs | preview | mask |
| --- | --- | --- | --- | --- | --- |
| `gfm` | 基础 | 标准 Markdown / GFM | [guide/writing/markdown/basic/](guide/writing/markdown/basic/) | full | inline |
| `attributes` | 属性 | 扩展属性 | [guide/writing/markdown/attributes/](guide/writing/markdown/attributes/) | partial | attribute |
| `emoji` | 行内 | 原生 Emoji | [guide/writing/markdown/emoji-icons/](guide/writing/markdown/emoji-icons/) | full | — |
| `math` | 行内 | KaTeX 数学公式 | [guide/writing/markdown/math/](guide/writing/markdown/math/) | full | math |
| `table` | 基础 | 响应式表格 | [guide/writing/markdown/table/](guide/writing/markdown/table/) | full | — |
| `marker` | 行内 | 马克笔高亮 | [guide/writing/markdown/marker/](guide/writing/markdown/marker/) | full | — |
| `spoiler` | 行内 | 防剧透文本 | [guide/writing/markdown/spoiler/](guide/writing/markdown/spoiler/) | full | — |
| `abbreviation` | 行内 | 缩写词 | [guide/writing/markdown/abbreviations/](guide/writing/markdown/abbreviations/) | full | — |
| `annotation` | 行内 | 内容注释 | [guide/writing/markdown/annotations/](guide/writing/markdown/annotations/) | full | — |
| `admonition` | 容器 | 提示容器 / details | [guide/writing/markdown/admonitions/](guide/writing/markdown/admonitions/) | full | directive |
| `github-alert` | 容器 | GitHub 警报 | [guide/writing/markdown/github-alerts/](guide/writing/markdown/github-alerts/) | full | — |
| `github-card` | 卡片 | GitHub 仓库卡片 | [guide/writing/markdown/cards/](guide/writing/markdown/cards/) | placeholder | directive |
| `field-group` | 卡片 | 字段组 | [guide/writing/markdown/cards/](guide/writing/markdown/cards/) | partial | directive |
| `collapse` | 卡片 | 折叠面板卡片 | [guide/writing/markdown/cards/](guide/writing/markdown/cards/) | partial | directive |
| `steps` | 容器 | 步骤引导 | [guide/writing/markdown/steps/](guide/writing/markdown/steps/) | full | directive |
| `file-tree` | 容器 | 文件树 | [guide/writing/markdown/file-tree/](guide/writing/markdown/file-tree/) | partial | directive |
| `code-tree` | 容器 | 代码树 | [guide/writing/markdown/code-tree/](guide/writing/markdown/code-tree/) | partial | directive, fence |
| `tabs` | 容器 | 代码选项组 | [guide/writing/markdown/tabs/](guide/writing/markdown/tabs/) | full | directive, fence |
| `grid` | 容器 | 图片画廊 | [guide/writing/markdown/image-grid/](guide/writing/markdown/image-grid/) | full | directive |
| `image-width` | 行内 | 单图宽度与图注 | [guide/writing/markdown/image-grid/](guide/writing/markdown/image-grid/) | full | — |
| `include` | 容器 | 文件片段导入 | [guide/writing/markdown/include/](guide/writing/markdown/include/) | placeholder | include |
| `codeblock-meta` | 代码 | 代码块元信息 | [guide/writing/codeblock/titles/](guide/writing/codeblock/titles/) | partial | fence |
| `mermaid` | 图表 | Mermaid 图表 | [guide/writing/charts/mermaid/](guide/writing/charts/mermaid/) | full | fence |
| `media-youtube` | 媒体 | YouTube 视频 | [guide/writing/media/youtube/](guide/writing/media/youtube/) | placeholder | directive |
| `media-bilibili` | 媒体 | Bilibili 视频 | [guide/writing/media/bilibili/](guide/writing/media/bilibili/) | placeholder | directive |
| `media-acfun` | 媒体 | AcFun 视频 | [guide/writing/media/acfun/](guide/writing/media/acfun/) | placeholder | directive |
| `media-artplayer` | 媒体 | ArtPlayer 播放器 | [guide/writing/media/artplayer/](guide/writing/media/artplayer/) | placeholder | directive |
| `audio-reader` | 媒体 | 音频朗读条 | [guide/writing/media/audio/](guide/writing/media/audio/) | partial | inline |
| `frontmatter` | 页面 | Frontmatter | [guide/frontmatter/](guide/frontmatter/) | none | none |
| `encryption` | 高级 | 文章加密 | [guide/writing/advanced/encryption/](guide/writing/advanced/encryption/) | none | none |
| `permalink` | 高级 | 固定链接 | [guide/writing/advanced/permalink/](guide/writing/advanced/permalink/) | none | none |
| `organization` | 组织 | 单文件与目录包 | [guide/writing/organization/folder/](guide/writing/organization/folder/) | none | none |

## Notes

- `preview` is the editor preview support level: full, partial, placeholder or none.
- `mask` lists syntax tokens excluded from formatting checks. Container bodies still get linted.
