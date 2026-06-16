import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { normalizeComparable, normalizeHost, normalizePath, normalizeUrl } from './lib/source-identifiers.mjs'

const args = new Map(process.argv.slice(2).map((arg, index, all) =>
  arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true] : [arg, true]
))

const sourcePath = path.resolve(String(args.get('--sources') || 'public/data/source-candidates.json'))
const statementsPath = path.resolve(String(args.get('--statements') || 'public/data/statements.json'))
const outPath = path.resolve(String(args.get('--out') || 'generated/source-indexing-status.json'))
const publicOutPath = path.resolve(String(args.get('--public-out') || 'public/data/source-indexing-status.json'))

function sourceAliases(source) {
  return [
    source.title,
    source.publisher,
    ...(source.aliases || []),
    ...(source.identifiers || []).map((identifier) => identifier.identifier_value),
  ].filter(Boolean).map(normalizeComparable).filter((value) => value.length >= 4)
}

function sourceReleaseStatus(source) {
  const sourceKind = normalizeComparable(source.source_type || source.metadata?.source_kind)
  if (sourceKind.includes('cei source release')) {
    return {
      indexing_status: 'indexed_as_source_release',
      evidence: ['This source is one of the pinned CEI upstream releases imported by scripts/import-cei.mjs.'],
    }
  }
  return null
}

function classify(source, statements) {
  const release = sourceReleaseStatus(source)
  if (release) {
    return {
      source_id: source.id,
      ...release,
      matched_statement_ids: [],
      matched_statement_count: 0,
      checked_at: new Date().toISOString(),
    }
  }

  const canonicalUrl = normalizeUrl(source.source_url || source.canonical_url)
  const canonicalPath = canonicalUrl ? normalizePath(canonicalUrl) : ''
  const canonicalHost = canonicalUrl ? normalizeHost(canonicalUrl) : ''
  const aliases = sourceAliases(source)
  const exactMatches = []
  const titleMatches = []
  const domainMatches = []

  for (const statement of statements) {
    const statementUrl = normalizeUrl(statement.source_url)
    const statementPath = statementUrl ? normalizePath(statementUrl) : ''
    if (canonicalPath && statementPath && canonicalPath === statementPath) exactMatches.push(statement)

    const title = normalizeComparable(statement.title)
    const organization = normalizeComparable(statement.organization)
    if (aliases.some((alias) => alias && (title === alias || organization === alias))) titleMatches.push(statement)

    if (canonicalHost && statementUrl && normalizeHost(statementUrl) === canonicalHost) {
      domainMatches.push(statement)
    }
  }

  const directMatches = [...new Map([...exactMatches, ...titleMatches].map((item) => [item.id, item])).values()]
  const partialMatches = domainMatches.filter((item) => !directMatches.some((match) => match.id === item.id))
  let indexingStatus = 'not_found'
  const evidence = []

  if (directMatches.length) {
    indexingStatus = 'indexed_as_records'
    evidence.push(`Found ${directMatches.length} direct URL/title match${directMatches.length === 1 ? '' : 'es'} in the statement registry.`)
  } else if (partialMatches.length) {
    indexingStatus = 'partially_indexed'
    evidence.push(`Found ${partialMatches.length} same-domain statement record${partialMatches.length === 1 ? '' : 's'}, but no direct source match.`)
  } else {
    evidence.push('No direct URL, title, alias, publisher, or same-domain statement match was found in the prepared catalog.')
  }

  return {
    source_id: source.id,
    indexing_status: indexingStatus,
    matched_statement_ids: directMatches.slice(0, 25).map((item) => item.id),
    matched_statement_count: directMatches.length,
    partial_statement_ids: partialMatches.slice(0, 25).map((item) => item.id),
    partial_statement_count: partialMatches.length,
    evidence,
    checked_at: new Date().toISOString(),
  }
}

const [sources, statements] = await Promise.all([
  readFile(sourcePath, 'utf8').then(JSON.parse),
  readFile(statementsPath, 'utf8').then(JSON.parse),
])

const statuses = sources.map((source) => classify(source, statements))
const payload = JSON.stringify(statuses, null, 2)
const summary = {
  generated_at: new Date().toISOString(),
  sources: sources.length,
  statuses: Object.fromEntries([...new Set(statuses.map((item) => item.indexing_status))].sort().map((status) => [
    status,
    statuses.filter((item) => item.indexing_status === status).length,
  ])),
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
