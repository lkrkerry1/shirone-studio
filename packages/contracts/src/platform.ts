import type { HostBridge } from './host'

export interface ProblemRef {
  platform: string
  id: string
  contestId?: string
  index?: string
  url: string
}

export interface ProblemMeta {
  platform: string
  problemId: string
  contestId?: string
  index?: string
  title: string
  displayTitle: string
  contestTitle?: string
  url: string
  tags?: string[]
}

export interface PlatformAdapter {
  id: string
  name: string
  slugPrefix: string
  supportsContest: boolean
  parseInput(input: string): ProblemRef | null
  fetchProblem(host: HostBridge, ref: ProblemRef): Promise<ProblemMeta>
  suggestSlug(meta: ProblemMeta): string
  suggestTitle(meta: ProblemMeta): string
  suggestedTags(meta: ProblemMeta): string[]
}
