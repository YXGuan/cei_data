import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { extractIdentifiers, normalizeComparable } from './lib/source-identifiers.mjs'

const args = new Map(process.argv.slice(2).map((arg, index, all) =>
  arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true] : [arg, true]
))

const sourcePath = path.resolve(String(args.get('--sources') || 'public/data/source-candidates.json'))
const signalsPath = path.resolve(String(args.get('--signals') || 'public/data/source-signals.json'))
const indexingPath = path.resolve(String(args.get('--indexing') || 'public/data/source-indexing-status.json'))
const outPath = path.resolve(String(args.get('--out') || 'public/data/source-registry.json'))
const summaryPath = path.resolve(String(args.get('--summary') || 'generated/source-registry-summary.json'))

async function loadOptionalJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

function recommendedAction(source, indexingStatus, signals) {
  if (source.recommended_action) return source.recommended_action
  const sourceType = normalizeComparable(source.source_type || source.metadata?.source_kind)
  const license = normalizeComparable(source.license_review_status || source.metadata?.license_status)
  const formats = (source.formats || []).join(' ').toLowerCase()
  const hasSignals = signals.length > 0

  if (indexingStatus === 'indexed_as_source_release') return 'source_registry_only'
  if (indexingStatus === 'indexed_as_records') return 'source_registry_only'
  if (sourceType.includes('incident')) return 'monitor_only'
  if (sourceType.includes('index') || sourceType.includes('trend report') || sourceType.includes('comparative')) {
    return 'source_registry_only'
  }
  if (license.includes('review') || source.metadata?.import_complexity === 'high') return 'index_metadata'
  if (formats.includes('data') || formats.includes('api') || formats.includes('bulk')) return 'index_records'
  return hasSignals ? 'index_metadata' : 'source_registry_only'
}

function latestObserved(source, signals, indexing) {
  return [
    source.metadata?.live?.checked_at,
    indexing?.checked_at,
    ...signals.map((signal) => signal.observed_at),
  ].filter(Boolean).sort().at(-1) || null
}

const [sources, signals, indexingStatuses] = await Promise.all([
  readFile(sourcePath, 'utf8').then(JSON.parse),
  loadOptionalJson(signalsPath, []),
  loadOptionalJson(indexingPath, []),
])

const signalsBySource = new Map()
signals.forEach((signal) => {
  const items = signalsBySource.get(signal.source_id) || []
  items.push(signal)
  signalsBySource.set(signal.source_id, items)
})
const indexingBySource = new Map(indexingStatuses.map((status) => [status.source_id, status]))

const registry = sources.map((source) => {
  const sourceSignals = signalsBySource.get(source.id) || []
  const indexing = indexingBySource.get(source.id) || {
    source_id: source.id,
    indexing_status: 'not_found',
    matched_statement_ids: [],
    matched_statement_count: 0,
    evidence: ['Indexing status has not been generated yet.'],
    checked_at: null,
  }
  const identifiers = extractIdentifiers(source)
  const checks = source.metadata?.live ? [{
    provider: 'canonical_url',
    checked_at: source.metadata.live.checked_at,
    ok: Boolean(source.metadata.live.ok),
    http_status: source.metadata.live.http_status ?? null,
    resolved_url: source.metadata.live.resolved_url ?? source.source_url,
    content_type: source.metadata.live.content_type ?? null,
    last_modified: source.metadata.live.last_modified ?? null,
    page_title: source.metadata.live.page_title ?? null,
    meta_description: source.metadata.live.meta_description ?? null,
  }] : []

  return {
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    description: source.description,
    source_url: source.source_url,
    canonical_url: source.canonical_url || source.source_url,
    source_type: source.source_type || source.metadata?.source_kind || 'External source',
    coverage: source.coverage,
    category: source.category || source.metadata?.category || source.coverage,
    url_status: source.url_status || source.metadata?.url_status || 'Unreviewed',
    notes: source.notes || source.metadata?.notes || source.description,
    wisdom_tags: source.wisdom_tags || source.metadata?.wisdom_tags || [],
    persona_relevance: source.persona_relevance || source.metadata?.persona_relevance || {},
    core_constraint: source.core_constraint || source.metadata?.core_constraint || '',
    required_control: source.required_control || source.metadata?.required_control || '',
    evidence_standard: source.evidence_standard || source.metadata?.evidence_standard || '',
    confidence_rating: source.confidence_rating || source.metadata?.confidence_rating || 'Inferred',
    formats: source.formats || [],
    status: source.status,
    created_at: source.created_at,
    vote_count: Number(source.vote_count || 0),
    user_voted: Boolean(source.user_voted),
    aliases: source.aliases || [],
    identifiers,
    checks,
    popularity_signals: sourceSignals,
    indexing_status: indexing,
    latest_observed_at: latestObserved(source, sourceSignals, indexing),
    license_review_status: source.license_review_status || 'needs_review',
    dedupe_review_status: source.dedupe_review_status || 'needs_review',
    recommended_action: recommendedAction(source, indexing.indexing_status, sourceSignals),
    admin_notes: source.admin_notes || null,
    reviewed_at: source.reviewed_at || null,
    metadata: source.metadata || {},
  }
})

registry.sort((a, b) => (
  (b.status === 'included' ? 1 : 0) - (a.status === 'included' ? 1 : 0)
  || b.vote_count - a.vote_count
  || a.title.localeCompare(b.title)
))

const payload = JSON.stringify(registry, null, 2)
const summary = {
  generated_at: new Date().toISOString(),
  sources: registry.length,
  signals: signals.length,
  statuses: Object.fromEntries([...new Set(registry.map((source) => source.indexing_status.indexing_status))].sort().map((status) => [
    status,
    registry.filter((source) => source.indexing_status.indexing_status === status).length,
  ])),
  recommended_actions: Object.fromEntries([...new Set(registry.map((source) => source.recommended_action))].sort().map((action) => [
    action,
    registry.filter((source) => source.recommended_action === action).length,
  ])),
  sha256: createHash('sha256').update(payload).digest('hex'),
  outputs: {
    source_registry: path.relative(process.cwd(), outPath),
  },
}

await mkdir(path.dirname(outPath), { recursive: true })
await mkdir(path.dirname(summaryPath), { recursive: true })
await writeFile(outPath, `${payload}\n`)
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)

console.log(JSON.stringify(summary, null, 2))
