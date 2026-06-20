import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const args = new Map(process.argv.slice(2).map((arg, index, all) =>
  arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true] : [arg, true]
))

const queriesPath = path.resolve(String(args.get('--queries') || 'data/retrieval-eval.seed.json'))
const evidencePath = path.resolve(String(args.get('--evidence') || 'public/data/evidence-units.json'))
const outPath = path.resolve(String(args.get('--out') || 'generated/retrieval-evals/baseline.json'))
const limit = Number(args.get('--limit') || 10)
const falsePositiveThreshold = Number(args.get('--false-positive-threshold') || 14)

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const stopTerms = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'by', 'for', 'from', 'how', 'in', 'into', 'is', 'it',
  'of', 'on', 'or', 'the', 'to', 'what', 'which', 'with',
  'ai', 'artificial', 'intelligence', 'governance', 'policy', 'policies', 'statement', 'statements',
])

function tokenize(value = '') {
  return [...new Set(normalize(value).split(/\s+/).filter((term) => term.length >= 2 && !stopTerms.has(term)))]
}

function buildIdf(evidenceUnits) {
  const documents = evidenceUnits.map((unit) => new Set(tokenize([
    unit.title,
    unit.organization,
    (unit.section_path || []).join(' '),
    unit.chunk_text,
    unit.expanded_context,
  ].join(' '))))
  const df = new Map()
  for (const document of documents) {
    for (const term of document) df.set(term, (df.get(term) || 0) + 1)
  }
  return {
    value(term) {
      return Math.log((documents.length + 1) / ((df.get(term) || 0) + 1)) + 1
    },
  }
}

function coverageScore(terms, haystack, weight, idf) {
  if (!terms.length) return 0
  return terms.reduce((score, term) => (
    haystack.includes(term) ? score + weight * idf.value(term) : score
  ), 0)
}

function coverageRatio(terms, haystack) {
  if (!terms.length) return 0
  return terms.filter((term) => haystack.includes(term)).length / terms.length
}

function matchedTermCount(terms, haystacks) {
  return terms.filter((term) => haystacks.some((haystack) => haystack.includes(term))).length
}

function scoreEvidenceUnit(unit, query, idf) {
  const phrase = normalize(query)
  const terms = tokenize(query)
  const chunk = normalize(unit.chunk_text)
  const context = normalize(unit.expanded_context)
  const title = normalize(unit.title)
  const organization = normalize(unit.organization)
  const section = normalize((unit.section_path || []).join(' '))
  const statementId = normalize(unit.statement_id)
  let score = 0
  const matchedTerms = matchedTermCount(terms, [chunk, context, title, organization, section, statementId])
  const minimumTerms = terms.length <= 2 ? Math.min(1, terms.length) : Math.ceil(terms.length * 0.5)
  if (matchedTerms < minimumTerms) return 0

  if (phrase && statementId === phrase) score += 50
  if (phrase && chunk.includes(phrase)) score += 24
  if (phrase && title.includes(phrase)) score += 18
  if (phrase && context.includes(phrase)) score += 9
  if (phrase && organization.includes(phrase)) score += 8

  score += coverageScore(terms, chunk, 6, idf)
  score += coverageScore(terms, context, 1.5, idf)
  score += coverageScore(terms, title, 8, idf)
  score += coverageScore(terms, organization, 4, idf)
  score += coverageScore(terms, section, 2, idf)
  score += terms.some((term) => statementId === term) ? 25 : 0

  const titleCoverage = coverageRatio(terms, title)
  const chunkCoverage = coverageRatio(terms, chunk)
  const contextCoverage = coverageRatio(terms, context)
  if (titleCoverage >= 0.5) score += titleCoverage * 28
  if (chunkCoverage >= 0.5) score += chunkCoverage * 16
  if (contextCoverage >= 0.65) score += contextCoverage * 8

  if (unit.evidence_kind === 'abstract') score += 1.5
  if (unit.evidence_kind === 'metadata') score += 0.75
  return score
}

function retrieve(evidenceUnits, query, topK, idf) {
  return evidenceUnits
    .map((unit) => ({ ...unit, score: scoreEvidenceUnit(unit, query, idf) }))
    .filter((unit) => unit.score > 0)
    .sort((a, b) => b.score - a.score || (b.year || 0) - (a.year || 0) || a.id.localeCompare(b.id))
    .slice(0, topK)
}

function statementHitAt(items, expected, k) {
  if (!expected.length) return false
  const top = new Set(items.slice(0, k).map((item) => item.statement_id))
  return expected.some((id) => top.has(id))
}

function reciprocalRank(items, expected) {
  if (!expected.length) return 0
  const rank = items.findIndex((item) => expected.includes(item.statement_id))
  return rank === -1 ? 0 : 1 / (rank + 1)
}

const [queries, evidenceUnits] = await Promise.all([
  readFile(queriesPath, 'utf8').then(JSON.parse),
  readFile(evidencePath, 'utf8').then(JSON.parse),
])
const idf = buildIdf(evidenceUnits)

const results = queries.map((query) => {
  const items = retrieve(evidenceUnits, query.query, Math.max(limit, 10), idf)
  const expected = query.expected_statement_ids || []
  const answerable = query.answerable !== false
  return {
    id: query.id,
    query: query.query,
    answerable,
    expected_statement_ids: expected,
    recall_at_5: statementHitAt(items, expected, 5) ? 1 : 0,
    recall_at_10: statementHitAt(items, expected, 10) ? 1 : 0,
    reciprocal_rank: reciprocalRank(items, expected),
    false_positive: !answerable && (items[0]?.score || 0) >= falsePositiveThreshold,
    top_results: items.slice(0, limit).map((item) => ({
      evidence_id: item.id,
      statement_id: item.statement_id,
      title: item.title,
      evidence_kind: item.evidence_kind,
      granularity: item.granularity,
      score: Number(item.score.toFixed(2)),
      chunk_text: item.chunk_text,
    })),
  }
})

const answerableResults = results.filter((result) => result.answerable)
const unanswerableResults = results.filter((result) => !result.answerable)
const average = (items, key) => items.length
  ? Number((items.reduce((sum, item) => sum + item[key], 0) / items.length).toFixed(4))
  : 0
const report = {
  generated_at: new Date().toISOString(),
  query_count: queries.length,
  answerable_query_count: answerableResults.length,
  unanswerable_query_count: unanswerableResults.length,
  metrics: {
    statement_recall_at_5: average(answerableResults, 'recall_at_5'),
    statement_recall_at_10: average(answerableResults, 'recall_at_10'),
    mrr: average(answerableResults, 'reciprocal_rank'),
    unanswerable_false_positive_rate: unanswerableResults.length
      ? Number((unanswerableResults.filter((result) => result.false_positive).length / unanswerableResults.length).toFixed(4))
      : 0,
  },
  config: {
    evidence: path.relative(process.cwd(), evidencePath),
    queries: path.relative(process.cwd(), queriesPath),
    limit,
    false_positive_threshold: falsePositiveThreshold,
  },
  results,
}

await mkdir(path.dirname(outPath), { recursive: true })
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ ...report.metrics, query_count: report.query_count }, null, 2))
