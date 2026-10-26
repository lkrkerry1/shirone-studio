import { describe, expect, it } from 'vitest'
import { Context } from '@shirone-studio/kernel'
import type { GitStatus } from '@shirone-studio/contracts'
import { GitService } from './index'

const status: GitStatus = {
  isRepo: true,
  branch: 'main',
  ahead: 1,
  behind: 0,
  entries: [{ path: 'posts/a.md', index: ' ', worktree: 'M' }],
  truncated: false,
}

function fakeHost(calls: string[]) {
  return {
    gitStatus: async (root: string) => {
      calls.push(`status:${root}`)
      return status
    },
    gitStage: async (root: string, paths: string[]) => {
      calls.push(`stage:${root}:${paths.join(',')}`)
      return status
    },
    gitUnstage: async (root: string, paths: string[]) => {
      calls.push(`unstage:${root}:${paths.join(',')}`)
      return status
    },
    gitCommit: async (root: string, message: string, paths: string[]) => {
      calls.push(`commit:${root}:${message}:${paths.join(',')}`)
      return { committed: true, hash: 'abc1234', summary: '[main abc1234] msg' }
    },
    gitPush: async (root: string) => {
      calls.push(`push:${root}`)
      return { ok: true, output: 'ok' }
    },
    gitDiff: async (root: string, path: string, staged: boolean) => {
      calls.push(`diff:${root}:${path}:${staged}`)
      return 'diff --git a/x b/x'
    },
  }
}

describe('git service', () => {
  it('delegates every operation to the host bridge', async () => {
    const calls: string[] = []
    const ctx = new Context() as Context & { git: GitService }
    ctx.provide('host', fakeHost(calls))
    await ctx.plugin(GitService)

    expect(await ctx.git.status('C:/blog')).toEqual(status)
    await ctx.git.stage('C:/blog', ['posts/a.md'])
    await ctx.git.unstage('C:/blog', ['posts/a.md'])
    expect(await ctx.git.commit('C:/blog', 'msg', ['posts/a.md'])).toMatchObject({
      committed: true,
      hash: 'abc1234',
    })
    expect(await ctx.git.push('C:/blog')).toEqual({ ok: true, output: 'ok' })
    expect(await ctx.git.diff('C:/blog', 'posts/a.md', true)).toContain('diff --git')

    expect(calls).toEqual([
      'status:C:/blog',
      'stage:C:/blog:posts/a.md',
      'unstage:C:/blog:posts/a.md',
      'commit:C:/blog:msg:posts/a.md',
      'push:C:/blog',
      'diff:C:/blog:posts/a.md:true',
    ])
  })
})
