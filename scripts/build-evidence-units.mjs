import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const args = new Map(process.argv.slice(2).map((arg, index, all) =>
  arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true] : [arg, true]
))

const statementsPath = path.resolve(String(args.get('--statements') || 'public/data/statements.json'))
const outPath = path.resolve(String(args.get('--out') || 'public/data/evidence-units.json'))
const summaryPath = path.resolve(String(args.get('--summary') || 'generated/evidence-units-summary.json'))
const shouldPush = args.has('--push')

const EVIDENCE_VERSION = 'metadata-abstract-v1'
const MAX_TOKENS = 180

const batches = (items, size = 250) => Array.from(
  { length: Math.ceil(items.length / size) },
  (_, index) => items.slice(index * size, (index + 1) * size),
)

function normalizeText(value = '') {
  return String(value)
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenCount(value = '') {
  const tokens = normalizeText(value).match(/\S+/g)
  return tokens ? tokens.length : 0
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function titleCase(value = '') {
  return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function splitLongSentence(sentence, charStart) {
  const words = sentence.split(/\s+/).filter(Boolean)
  if (words.length <= MAX_TOKENS) {
    return [{ text: sentence, char_start: charStart, char_end: charStart + sentence.length }]
  }

  const spans = []
  for (let index = 0; index < words.length; index += MAX_TOKENS) {
    const text = words.slice(index, index + MAX_TOKENS).join(' ')
    const relativeStart = sentence.indexOf(words[index])
    spans.push({
      text,
      char_start: charStart + Math.max(relativeStart, 0),
      char_end: charStart + Math.max(relativeStart, 0) + text.length,
    })
  }
  return spans
}

function sentenceSpans(text = '') {
  const normalized = normalizeText(text)
  if (!normalized) return []

  const spans = []
  const pattern = /[^.!?]+(?:[.!?]+(?=\s|$)|$)/g
  let match
  while ((match = pattern.exec(normalized))) {
    const raw = match[0]
    const textValue = raw.trim()
    if (!textValue) continue
    const leading = raw.search(/\S/)
    const start = match.index + Math.max(leading, 0)
    spans.push(...splitLongSentence(textValue, start))
  }

  return spans.length ? spans : [{ text: normalized, char_start: 0, char_end: normalized.length }]
}

function baseMetadata(statement) {
  return {
    title: statement.title,
    organization: statement.organization,
    year: statement.year,
    region: statement.region,
    type: statement.type,
    binding: statement.binding,
    cluster: statement.cluster,
    organization_type: statement.organization_type,
    country_code: statement.country_code,
    language_code: statement.language_code,
    source_url: statement.source_url,
  }
}

function unit(statement, fields) {
  const chunkText = normalizeText(fields.chunk_text)
  const expandedContext = normalizeText(fields.expanded_context || chunkText)
  return {
    id: fields.id,
    statement_id: statement.id,
    title: statement.title,
    organization: statement.organization,
    year: statement.year,
    region: statement.region,
    type: statement.type,
    binding: statement.binding,
    source_url: statement.source_url,
    section_path: fields.section_path,
    parent_id: fields.parent_id || null,
    evidence_kind: fields.evidence_kind,
    granularity: fields.granularity,
    chunk_text: chunkText,
    expanded_context: expandedContext,
    char_start: fields.char_start ?? null,
    char_end: fields.char_end ?? null,
    token_count: tokenCount(chunkText),
    content_hash: hash(`${fields.evidence_kind}\n${chunkText}\n${expandedContext}`),
    metadata: {
      ...baseMetadata(statement),
      evidence_version: EVIDENCE_VERSION,
      ...(fields.metadata || {}),
    },
  }
}

function metadataUnit(statement) {
  const parts = [
    statement.title,
    `Organization: ${statement.organization}`,
    statement.year ? `Publication year: ${statement.year}` : null,
    statement.region ? `Region: ${statement.region}` : null,
    statement.type ? `Instrument type: ${statement.type}` : null,
    statement.binding ? `Binding nature: ${statement.binding}` : null,
    statement.cluster ? `Policy family: ${statement.cluster}` : null,
  ].filter(Boolean)

  return unit(statement, {
    id: `EV-${statement.id}-META`,
    section_path: ['Catalog metadata'],
    evidence_kind: 'metadata',
    granularity: 'paragraph',
    chunk_text: `${parts.join('. ')}.`,
  })
}

function conceptUnit(statement) {
  if (!statement.scores?.length) return null
  const scores = statement.scores
    .slice(0, 8)
    .map((score) => `${score.label} ${score.value}`)
    .join(', ')
  return unit(statement, {
    id: `EV-${statement.id}-CONCEPTS`,
    section_path: ['Derived governance concepts'],
    evidence_kind: 'concept_scores',
    granularity: 'paragraph',
    chunk_text: `Top governance concepts for ${statement.title}: ${scores}.`,
    metadata: { scores: statement.scores },
  })
}

function abstractUnits(statement) {
  const abstract = normalizeText(statement.abstract || '')
  if (!abstract) return []
  const parentId = `EV-${statement.id}-ABSTRACT`
  return sentenceSpans(abstract).map((span, index) => unit(statement, {
    id: `EV-${statement.id}-ABS-${String(index + 1).padStart(3, '0')}`,
    section_path: ['Record summary'],
    parent_id: parentId,
    evidence_kind: 'abstract',
    granularity: 'sentence',
    chunk_text: span.text,
    expanded_context: abstract,
    char_start: span.char_start,
    char_end: span.char_end,
  }))
}

function buildEvidenceUnits(statements) {
  return statements.flatMap((statement) => [
    metadataUnit(statement),
    conceptUnit(statement),
    ...abstractUnits(statement),
  ].filter(Boolean))
}

async function allRows(queryFactory) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await queryFactory(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

async function pushEvidenceUnits(evidenceUnits) {
  const url = process.env.SUPABASE_URL_CEI || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY_CEI || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL_CEI and SUPABASE_SERVICE_ROLE_KEY_CEI are required for --push '
      + '(generic SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are also supported).',
    )
  }

  const db = createClient(url, key, { auth: { persistSession: false } })
  const statementRows = await allRows((from, to) => db.from('statements').select('id,statement_key').range(from, to))
  const statementIds = new Map(statementRows.map((row) => [row.statement_key, row.id]))
  const rows = evidenceUnits.map((item) => ({
    evidence_key: item.id,
    statement_id: statementIds.get(item.statement_id),
    parent_evidence_key: item.parent_id,
    source_url: item.source_url,
    section_path: item.section_path,
    evidence_kind: item.evidence_kind,
    granularity: item.granularity,
    chunk_text: item.chunk_text,
    expanded_context: item.expanded_context,
    char_start: item.char_start,
    char_end: item.char_end,
    token_count: item.token_count,
    content_hash: item.content_hash,
    metadata: item.metadata,
  }))
  const missing = rows.filter((row) => !row.statement_id)
  if (missing.length) throw new Error(`Missing statement IDs for ${missing.length} evidence units`)

  for (const batch of batches(rows)) {
    const { error } = await db.from('statement_evidence_units').upsert(batch, { onConflict: 'evidence_key' })
    if (error) throw error
  }
}

const statements = JSON.parse(await readFile(statementsPath, 'utf8'))
const evidenceUnits = buildEvidenceUnits(statements)
const payload = JSON.stringify(evidenceUnits)
const byKind = Object.fromEntries([...new Set(evidenceUnits.map((item) => item.evidence_kind))].sort().map((kind) => [
  kind,
  evidenceUnits.filter((item) => item.evidence_kind === kind).length,
]))
const byGranularity = Object.fromEntries([...new Set(evidenceUnits.map((item) => item.granularity))].sort().map((granularity) => [
  granularity,
  evidenceUnits.filter((item) => item.granularity === granularity).length,
]))

const summary = {
  generated_at: new Date().toISOString(),
  evidence_version: EVIDENCE_VERSION,
  statements: statements.length,
  evidence_units: evidenceUnits.length,
  by_kind: byKind,
  by_granularity: byGranularity,
  average_tokens: Math.round(evidenceUnits.reduce((sum, item) => sum + item.token_count, 0) / evidenceUnits.length),
  sha256: hash(payload),
  outputs: {
    evidence_units: path.relative(process.cwd(), outPath),
  },
  pushed: shouldPush,
}

await mkdir(path.dirname(outPath), { recursive: true })
await mkdir(path.dirname(summaryPath), { recursive: true })
await writeFile(outPath, `${payload}\n`)
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)
if (shouldPush) await pushEvidenceUnits(evidenceUnits)

console.log(JSON.stringify({
  ...summary,
  average_tokens: summary.average_tokens,
}, null, 2))

export { buildEvidenceUnits, sentenceSpans }
