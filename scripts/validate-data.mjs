import { readFile } from 'node:fs/promises'

const load = (file) => readFile(new URL(`../public/data/${file}`, import.meta.url), 'utf8').then(JSON.parse)
const [dashboard, statements, fingerprints] = await Promise.all([
  load('dashboard.json'),
  load('statements.json'),
  load('fingerprints.json'),
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

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(JSON.stringify({
  statements: statements.length,
  fingerprints: fingerprints.length,
  metadata_pending: dashboard.totals.fingerprint_only,
  policy_families: dashboard.totals.policy_families,
  status: 'valid',
}, null, 2))
