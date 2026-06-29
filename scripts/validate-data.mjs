import { readFile } from 'node:fs/promises'

const load = (file) => readFile(new URL(`../public/data/${file}`, import.meta.url), 'utf8').then(JSON.parse)
const [sourceCandidates, sourceRegistry, sourceSignals, sourceIndexing] = await Promise.all([
  load('source-candidates.json'),
  load('source-registry.json'),
  load('source-signals.json'),
  load('source-indexing-status.json'),
])

const failures = []
const assert = (condition, message) => { if (!condition) failures.push(message) }
const unique = (items) => new Set(items).size === items.length
const sourceIds = new Set(sourceCandidates.map((item) => item.id))
const validProviders = new Set(['github', 'huggingface', 'openalex', 'semanticscholar', 'datacite', 'zenodo', 'kaggle'])
const validMetrics = new Set(['stars', 'forks', 'subscribers', 'downloads', 'views', 'citations', 'influential_citations', 'likes', 'unique_views', 'unique_downloads'])
const validIndexing = new Set(['source_candidate_only'])
const validActions = new Set(['monitor_only', 'source_registry_only', 'index_metadata', 'index_records', 'index_full_text'])
const validReviewStatuses = new Set(['needs_review', 'in_progress', 'approved', 'blocked', 'not_applicable'])
const validWisdomTags = new Set(['Human Dignity', 'Power Constraints', 'Deception', 'Stewardship', 'Justice', 'Wisdom'])
const validPersonaKeys = ['builder', 'legal_compliance', 'ministry_civil_society']
const validPersonaValues = new Set(['low', 'medium', 'high'])
const validConfidence = new Set(['High Direct', 'Inferred', 'Contested'])

function isValidSourceReference(value) {
  return /^https:\/\//.test(value) || /^Internal CEI\b/.test(value)
}

assert(sourceCandidates.length >= 200, `source candidate count ${sourceCandidates.length} is lower than expected for Dr. K matrix`)
assert(unique(sourceCandidates.map((item) => item.id)), 'source candidate IDs are not unique')
assert(sourceCandidates.every((item) => isValidSourceReference(item.source_url)), 'one or more source candidates lack an HTTPS URL or internal CEI reference')
assert(sourceCandidates.every((item) => item.title && item.publisher && item.description && item.coverage), 'one or more source candidates lack required metadata')
assert(sourceCandidates.every((item) => item.category && item.url_status && item.notes), 'one or more source candidates lack Dr. K matrix fields')
assert(sourceCandidates.every((item) => Array.isArray(item.formats) && item.formats.length > 0), 'one or more source candidates lack source formats')
assert(sourceCandidates.every((item) => item.metadata?.source_kind && item.metadata?.import_complexity), 'one or more source candidates lack review metadata')
assert(sourceCandidates.every((item) => Number.isInteger(item.metadata?.metadata_quality_score)), 'one or more source candidates lack a metadata quality score')
assert(sourceCandidates.every((item) => validActions.has(item.recommended_action)), 'one or more source candidates lack a valid recommended action')
assert(sourceCandidates.every((item) => validReviewStatuses.has(item.license_review_status) && validReviewStatuses.has(item.dedupe_review_status)), 'one or more source candidates have invalid review statuses')
assert(sourceCandidates.every((item) => Array.isArray(item.wisdom_tags) && item.wisdom_tags.length > 0 && item.wisdom_tags.every((tag) => validWisdomTags.has(tag))), 'one or more source candidates have invalid Wisdom tags')
assert(sourceCandidates.every((item) => validPersonaKeys.every((key) => validPersonaValues.has(item.persona_relevance?.[key]))), 'one or more source candidates lack persona relevance values')
assert(sourceCandidates.every((item) => item.core_constraint && item.required_control && item.evidence_standard && validConfidence.has(item.confidence_rating)), 'one or more source candidates lack crosswalk preview fields')

assert(sourceRegistry.length === sourceCandidates.length, 'source registry count does not match source candidate count')
assert(unique(sourceRegistry.map((item) => item.id)), 'source registry IDs are not unique')
assert(sourceRegistry.every((item) => sourceIds.has(item.id)), 'source registry contains an unknown source ID')
assert(sourceRegistry.every((item) => item.canonical_url && isValidSourceReference(item.canonical_url)), 'one or more registry sources lack a valid canonical reference')
assert(sourceRegistry.every((item) => item.source_type && item.recommended_action && validActions.has(item.recommended_action)), 'one or more registry sources lack a valid recommended action')
assert(sourceRegistry.every((item) => Array.isArray(item.identifiers)), 'one or more registry sources lack identifiers array')
assert(sourceRegistry.every((item) => unique(item.identifiers.map((identifier) => `${identifier.identifier_type}:${identifier.identifier_value}`.toLowerCase()))), 'one or more registry sources have duplicate identifiers')
assert(sourceRegistry.every((item) => item.indexing_status && validIndexing.has(item.indexing_status.indexing_status)), 'one or more registry sources lack a valid indexing status')
assert(sourceRegistry.every((item) => Array.isArray(item.wisdom_tags) && item.wisdom_tags.length > 0), 'one or more registry sources lack Wisdom tags')
assert(sourceRegistry.every((item) => item.core_constraint && item.required_control && item.evidence_standard), 'one or more registry sources lack crosswalk preview fields')

assert(sourceSignals.every((signal) => sourceIds.has(signal.source_id)), 'one or more source signals reference an unknown source')
assert(sourceSignals.every((signal) => validProviders.has(signal.provider)), 'one or more source signals use an unknown provider')
assert(sourceSignals.every((signal) => validMetrics.has(signal.metric)), 'one or more source signals use an unknown metric')
assert(sourceSignals.every((signal) => Number.isFinite(signal.value) && signal.observed_at && !Number.isNaN(Date.parse(signal.observed_at))), 'one or more source signals lack value or timestamp')
assert(sourceSignals.every((signal) => /^https:\/\//.test(signal.url)), 'one or more source signals lack HTTPS URLs')
assert(sourceIndexing.length === sourceCandidates.length, 'source indexing status count does not match source candidate count')
assert(sourceIndexing.every((item) => sourceIds.has(item.source_id)), 'one or more indexing statuses reference an unknown source')
assert(sourceIndexing.every((item) => validIndexing.has(item.indexing_status)), 'one or more indexing statuses use an invalid value')
assert(sourceIndexing.every((item) => item.matched_statement_ids.length === 0), 'Dr. K MVP indexing should not reference archived STMT records')

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(JSON.stringify({
  source_candidates: sourceCandidates.length,
  source_registry_entries: sourceRegistry.length,
  popularity_signals: sourceSignals.length,
  indexing_status: 'source_candidate_only',
  wisdom_tagged_sources: sourceRegistry.filter((source) => source.wisdom_tags.length).length,
  status: 'valid',
}, null, 2))
