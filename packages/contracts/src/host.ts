export interface FileContent {
  content: string
  hash: string
  mtimeMs: number
  eol: 'lf' | 'crlf'
}

export interface FileStat {
  exists: boolean
  isDirectory: boolean
  size: number
  mtimeMs: number
}

export interface DirEntry {
  name: string
  relativePath: string
  isDirectory: boolean
}

export interface ProjectLayoutInfo {
  mode: 'npm' | 'source'
  root: string
  contentRoot: string
  configRoot: string
  publicRoot: string
}

export interface HostBridge {
  detectLayout(root: string): Promise<ProjectLayoutInfo>
  readText(root: string, relativePath: string): Promise<FileContent>
  writeText(
    root: string,
    relativePath: string,
    content: string,
    expectedHash?: string,
  ): Promise<{ hash: string; mtimeMs: number }>
  writeAsset(
    root: string,
    relativePath: string,
    base64: string,
  ): Promise<{ path: string; hash: string; size: number }>
  listDir(root: string, relativePath: string): Promise<DirEntry[]>
  stat(root: string, relativePath: string): Promise<FileStat>
  createDir(root: string, relativePath: string): Promise<void>
  httpFetch(url: string, options?: { cookie?: string }): Promise<string>
  gitStatus(root: string): Promise<import('./git').GitStatus>
  gitStage(root: string, paths: string[]): Promise<import('./git').GitStatus>
  gitUnstage(root: string, paths: string[]): Promise<import('./git').GitStatus>
  gitCommit(
    root: string,
    message: string,
    paths: string[],
  ): Promise<import('./git').GitCommitResult>
  gitPush(root: string): Promise<import('./git').GitPushResult>
  gitDiff(root: string, path: string, staged: boolean): Promise<string>
}

export interface FrontmatterBridge {
  split(source: string): {
    raw: string
    body: string
    data: Record<string, unknown>
    eol: 'lf' | 'crlf'
    bom: boolean
  }
  serialize(data: Record<string, unknown>, options?: { order?: string[]; bom?: boolean }): string
  compose(
    split: { raw: string; body: string; eol: 'lf' | 'crlf'; bom: boolean },
    raw?: string,
  ): string
}

export interface ContentContext {
  host: HostBridge
  frontmatter: FrontmatterBridge
  layout: import('./index').ProjectLayout
}
