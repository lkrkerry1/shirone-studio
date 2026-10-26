/** Status of a single path as reported by `git status --porcelain`. */
export interface GitFileEntry {
  /** Path relative to the repository root, '/'-separated. */
  path: string
  /** Index (staged) status character, e.g. `M`, `A`, `?`, or a space. */
  index: string
  /** Worktree status character, e.g. `M`, `D`, `?`, or a space. */
  worktree: string
}

export interface GitStatus {
  /** False when the project root is not inside a Git work tree. */
  isRepo: boolean
  branch: string
  ahead: number
  behind: number
  entries: GitFileEntry[]
  /** True when the backend stopped listing entries at its cap. */
  truncated: boolean
}

export interface GitCommitResult {
  committed: boolean
  /** Short hash of the new commit. */
  hash: string
  /** First line of the commit output, for the status line. */
  summary: string
}

export interface GitPushResult {
  ok: boolean
  /** Tail of stdout/stderr, so the UI can show what git said. */
  output: string
}
