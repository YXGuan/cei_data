import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const args = new Map(process.argv.slice(2).map((arg, index, all) =>
  arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true] : [arg, true]
))

const sourcePath = path.resolve(String(args.get('--sources') || 'public/data/source-candidates.json'))
const outPath = path.resolve(String(args.get('--out') || 'generated/source-indexing-status.json'))
const publicOutPath = path.resolve(String(args.get('--public-out') || 'public/data/source-indexing-status.json'))

const sources = JSON.parse(await readFile(sourcePath, 'utf8'))
const checkedAt = new Date().toISOString()
const statuses = sources.map((source) => ({
  source_id: source.id,
  indexing_status: 'source_candidate_only',
  matched_statement_ids: [],
  matched_statement_count: 0,
  partial_statement_ids: [],
  partial_statement_count: 0,
  evidence: [
    'Dr. K source matrix is the active MVP dataset.',
    'Legacy STMT record matching is archived and not used for this MVP view.',
    'Record-level extraction can be added after source licensing, dedupe, and crosswalk review.',
  ],
  checked_at: checkedAt,
}))

const payload = JSON.stringify(statuses, null, 2)
const summary = {
  generated_at: checkedAt,
  sources: sources.length,
  statuses: {
    source_candidate_only: statuses.length,
  },
  sha256: createHash('sha256').update(payload).digest('hex'),
  outputs: {
    source_indexing_status: path.relative(process.cwd(), outPath),
    public_source_indexing_status: path.relative(process.cwd(), publicOutPath),
  },
}

await mkdir(path.dirname(outPath), { recursive: true })
await mkdir(path.dirname(publicOutPath), { recursive: true })
await writeFile(outPath, `${payload}\n`)
await writeFile(publicOutPath, `${payload}\n`)

console.log(JSON.stringify(summary, null, 2))
