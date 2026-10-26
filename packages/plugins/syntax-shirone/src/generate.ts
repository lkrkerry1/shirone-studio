import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { shironeSyntaxSpecs } from './specs'

const target = resolve(process.cwd(), 'docs/syntax-reference.md')
mkdirSync(dirname(target), { recursive: true })
const rows = shironeSyntaxSpecs
  .map(
    (spec) =>
      `| \`${spec.id}\` | ${spec.category} | ${spec.name} | [${spec.docsPath}](${spec.docsPath}) | ${spec.preview} | ${spec.mask.join(', ') || '—'} |`,
  )
  .join('\n')

const content = `# Shirone Markdown Syntax Reference

Generated from \`packages/plugins/syntax-shirone/src/specs.ts\`. Do not edit by hand;
run \`pnpm docs:syntax\`.

| id | category | name | docs | preview | mask |
| --- | --- | --- | --- | --- | --- |
${rows}

## Notes

- \`preview\` is the editor preview support level: full, partial, placeholder or none.
- \`mask\` lists syntax tokens excluded from formatting checks. Container bodies still get linted.
`

writeFileSync(target, content, 'utf8')
console.log(`Wrote ${target} (${shironeSyntaxSpecs.length} syntax specs)`)
