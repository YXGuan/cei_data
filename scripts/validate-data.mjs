import { readFile } from 'node:fs/promises'

const load = (file) => readFile(new URL(`../public/data/${file}`, import.meta.url), 'utf8').then(JSON.parse)
const [dashboard, statements, fingerprints, sourceCandidates] = await Promise.all([
  load('dashboard.json'),
  load('statements.json'),
  load('fingerprints.json'),
  load('source-candidates.json'),
])

const failures = []
const assert = (condition, message) => { if (!condition) failures.push(message) }
const unique = (items) => new Set(items).size === items.length
const statementKeys = new Set(statements.map((item) => item.id))

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
  status: 'valid',
}, null, 2))
