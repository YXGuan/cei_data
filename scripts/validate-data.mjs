import { readFile } from 'node:fs/promises'

const load = (file) => readFile(new URL(`../public/data/${file}`, import.meta.url), 'utf8').then(JSON.parse)
const [dashboard, statements, fingerprints, sourceCandidates, sourceRegistry, sourceSignals, sourceIndexing, evidenceUnits] = await Promise.all([
  load('dashboard.json'),
  load('statements.json'),
  load('fingerprints.json'),
  load('source-candidates.json'),
  load('source-registry.json'),
  load('source-signals.json'),
  load('source-indexing-status.json'),
  load('evidence-units.json'),
])

const failures = []
const assert = (condition, message) => { if (!condition) failures.push(message) }
const unique = (items) => new Set(items).size === items.length
const statementKeys = new Set(statements.map((item) => item.id))
const sourceIds = new Set(sourceCandidates.map((item) => item.id))
const validProviders = new Set(['github', 'huggingface', 'openalex', 'semanticscholar', 'datacite', 'zenodo', 'kaggle'])
const validMetrics = new Set(['stars', 'forks', 'subscribers', 'downloads', 'views', 'citations', 'influential_citations', 'likes', 'unique_views', 'unique_downloads'])
const validIndexing = new Set(['not_found', 'source_candidate_only', 'partially_indexed', 'indexed_as_records', 'indexed_as_source_release'])
const validActions = new Set(['monitor_only', 'source_registry_only', 'index_metadata', 'index_records', 'index_full_text'])
const validEvidenceKinds = new Set(['metadata', 'abstract', 'source_text', 'concept_scores'])
const validGranularity = new Set(['sentence', 'bullet', 'clause', 'paragraph', 'table_row'])

assert(statements.length === dashboard.totals.statements, `statement count ${statements.length} does not match dashboard ${dashboard.totals.statements}`)
assert(fingerprints.length === dashboard.totals.fingerprinted, `fingerprint count ${fingerprints.length} does not match dashboard ${dashboard.totals.fingerprinted}`)
assert(unique(statements.map((item) => item.id)), 'statement keys are not unique')
assert(unique(fingerprints.map((item) => item.id)), 'fingerprint keys are not unique')
assert(fingerprints.every((item) => statementKeys.has(item.id)), 'one or more fingerprints have no statement record')
assert(statements.filter((item) => item.metadata_status === 'Pending').length === dashboard.totals.fingerprint_only, 'pending metadata count is inconsistent')
assert(new Set(fingerprints.map((item) => item.cluster_number)).size === dashboard.totals.policy_families, 'policy family count is inconsistent')
assert(statements.every((item) => item.title && item.organization && (item.year === null || Number.isInteger(item.year))), 'one or more statements lack required display fields')
assert(sourceCandidates.length >= 5, `source candidate count ${sourceCandidates.length} is lower than expected`)
assert(unique(sourceCandidates.map((item) => item.id)), 'source candidate IDs are not unique')
assert(unique(sourceCandidates.map((item) => item.source_url.toLowerCase())), 'source candidate URLs are not unique')
assert(sourceCandidates.every((item) => /^https:\/\//.test(item.source_url)), 'one or more source candidates do not use HTTPS URLs')
assert(sourceCandidates.every((item) => item.title && item.publisher && item.description && item.coverage), 'one or more source candidates lack required metadata')
assert(sourceCandidates.every((item) => Array.isArray(item.formats) && item.formats.length > 0), 'one or more source candidates lack source formats')
assert(sourceCandidates.every((item) => item.metadata?.source_kind && item.metadata?.import_complexity), 'one or more source candidates lack review metadata')
assert(sourceCandidates.every((item) => Number.isInteger(item.metadata?.metadata_quality_score)), 'one or more source candidates lack a metadata quality score')
assert(sourceRegistry.length === sourceCandidates.length, 'source registry count does not match source candidate count')
assert(unique(sourceRegistry.map((item) => item.id)), 'source registry IDs are not unique')
assert(sourceRegistry.every((item) => sourceIds.has(item.id)), 'source registry contains an unknown source ID')
assert(sourceRegistry.every((item) => item.canonical_url && /^https:\/\//.test(item.canonical_url)), 'one or more registry sources lack HTTPS canonical URLs')
assert(sourceRegistry.every((item) => item.source_type && item.recommended_action && validActions.has(item.recommended_action)), 'one or more registry sources lack a valid recommended action')
assert(sourceRegistry.every((item) => Array.isArray(item.identifiers) && item.identifiers.length > 0), 'one or more registry sources lack identifiers')
assert(sourceRegistry.every((item) => unique(item.identifiers.map((identifier) => `${identifier.identifier_type}:${identifier.identifier_value}`.toLowerCase()))), 'one or more registry sources have duplicate identifiers')
assert(sourceRegistry.every((item) => item.indexing_status && validIndexing.has(item.indexing_status.indexing_status)), 'one or more registry sources lack a valid indexing status')
assert(sourceSignals.every((signal) => sourceIds.has(signal.source_id)), 'one or more source signals reference an unknown source')
assert(sourceSignals.every((signal) => validProviders.has(signal.provider)), 'one or more source signals use an unknown provider')
assert(sourceSignals.every((signal) => validMetrics.has(signal.metric)), 'one or more source signals use an unknown metric')
assert(sourceSignals.every((signal) => Number.isFinite(signal.value) && signal.observed_at && !Number.isNaN(Date.parse(signal.observed_at))), 'one or more source signals lack value or timestamp')
assert(sourceSignals.every((signal) => /^https:\/\//.test(signal.url)), 'one or more source signals lack HTTPS URLs')
assert(sourceIndexing.length === sourceCandidates.length, 'source indexing status count does not match source candidate count')
assert(sourceIndexing.every((item) => sourceIds.has(item.source_id)), 'one or more indexing statuses reference an unknown source')
assert(sourceIndexing.every((item) => validIndexing.has(item.indexing_status)), 'one or more indexing statuses use an invalid value')
assert(sourceIndexing.every((item) => item.indexing_status !== 'indexed_as_records' || item.matched_statement_ids.every((id) => statementKeys.has(id))), 'one or more indexed source statuses reference unknown statements')
assert(sourceIndexing.every((item) => item.indexing_status !== 'indexed_as_records' || item.matched_statement_ids.length > 0), 'one or more indexed_as_records statuses have no matched statements')
assert(sourceIndexing.find((item) => item.source_id === 'agora-ai-governance-regulatory-archive')?.indexing_status === 'not_found', 'AGORA should remain not_found until canonical records are matched')
assert(sourceIndexing.find((item) => item.source_id === 'ai-incident-database')?.indexing_status === 'not_found', 'AI Incident Database should remain not_found until canonical records are matched')
assert(evidenceUnits.length >= statements.length, 'evidence units should include at least one unit per statement')
assert(unique(evidenceUnits.map((item) => item.id)), 'evidence unit IDs are not unique')
assert(evidenceUnits.every((item) => statementKeys.has(item.statement_id)), 'one or more evidence units reference unknown statements')
assert(evidenceUnits.every((item) => validEvidenceKinds.has(item.evidence_kind)), 'one or more evidence units use an invalid evidence kind')
assert(evidenceUnits.every((item) => validGranularity.has(item.granularity)), 'one or more evidence units use an invalid granularity')
assert(evidenceUnits.every((item) => item.chunk_text && item.expanded_context && Number.isInteger(item.token_count) && item.token_count > 0), 'one or more evidence units lack text or token counts')
assert(evidenceUnits.every((item) => Array.isArray(item.section_path) && item.section_path.length > 0), 'one or more evidence units lack section paths')
assert(evidenceUnits.filter((item) => item.evidence_kind === 'abstract').every((item) => item.granularity === 'sentence'), 'abstract evidence units should be sentence-level')

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(JSON.stringify({
  statements: statements.length,
  fingerprints: fingerprints.length,
  metadata_pending: dashboard.totals.fingerprint_only,
  policy_families: dashboard.totals.policy_families,
  third_party_source_candidates: sourceCandidates.length,
  source_registry_entries: sourceRegistry.length,
  popularity_signals: sourceSignals.length,
  evidence_units: evidenceUnits.length,
  status: 'valid',
}, null, 2))
