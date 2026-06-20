import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { EvidenceUnit, RetrievalSearch, RetrievedEvidenceUnit } from '@/lib/types'

export type RetrieveParams = {
  query?: string
  region?: string
  type?: string
  binding?: string
  organizationType?: string
  evidenceKind?: string
  limit?: number
}

let evidenceCache: EvidenceUnit[] | null = null

async function localEvidenceUnits() {
  if (evidenceCache) return evidenceCache
  const file = await readFile(path.join(process.cwd(), 'public', 'data', 'evidence-units.json'), 'utf8')
  evidenceCache = JSON.parse(file) as EvidenceUnit[]
  return evidenceCache
}

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
}

function databaseValue(value?: string) {
  return value ? value.toLowerCase().replaceAll(' ', '_') : null
}

function normalize(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const stopTerms = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'by', 'for', 'from', 'how', 'in', 'into', 'is', 'it',
  'of', 'on', 'or', 'the', 'to', 'what', 'which', 'with',
  'ai', 'artificial', 'intelligence', 'governance', 'policy', 'policies', 'statement', 'statements',
])

function tokenize(value = '') {
  return [...new Set(normalize(value).split(/\s+/).filter((term) => term.length >= 2 && !stopTerms.has(term)))]
}

function buildIdf(evidenceUnits: EvidenceUnit[]) {
  const documents = evidenceUnits.map((unit) => new Set(tokenize([
    unit.title,
    unit.organization,
    unit.section_path.join(' '),
    unit.chunk_text,
    unit.expanded_context,
  ].join(' '))))
  const df = new Map<string, number>()
  for (const document of documents) {
    for (const term of document) df.set(term, (df.get(term) || 0) + 1)
  }
  return {
    size: documents.length,
    value(term: string) {
      return Math.log((documents.length + 1) / ((df.get(term) || 0) + 1)) + 1
    },
  }
}

function coverageScore(terms: string[], haystack: string, weight: number, idf: ReturnType<typeof buildIdf>) {
  if (!terms.length) return 0
  return terms.reduce((score, term) => (
    haystack.includes(term) ? score + weight * idf.value(term) : score
  ), 0)
}

function coverageRatio(terms: string[], haystack: string) {
  if (!terms.length) return 0
  return terms.filter((term) => haystack.includes(term)).length / terms.length
}

function matchedTermCount(terms: string[], haystacks: string[]) {
  return terms.filter((term) => haystacks.some((haystack) => haystack.includes(term))).length
}

function scoreEvidenceUnit(unit: EvidenceUnit, query: string, idf: ReturnType<typeof buildIdf>) {
  const phrase = normalize(query)
  const terms = tokenize(query)
  const chunk = normalize(unit.chunk_text)
  const context = normalize(unit.expanded_context)
  const title = normalize(unit.title)
  const organization = normalize(unit.organization)
  const section = normalize(unit.section_path.join(' '))
  const statementId = normalize(unit.statement_id)
  const breakdown = {
    phrase: 0,
    text: 0,
    metadata: 0,
    coverage: 0,
    kind_boost: 0,
  }

  const matchedTerms = matchedTermCount(terms, [chunk, context, title, organization, section, statementId])
  const minimumTerms = terms.length <= 2 ? Math.min(1, terms.length) : Math.ceil(terms.length * 0.5)
  if (matchedTerms < minimumTerms) {
    return {
      score: 0,
      breakdown: { ...breakdown, matched_terms: matchedTerms },
    }
  }

  if (phrase && statementId === phrase) breakdown.phrase += 50
  if (phrase && chunk.includes(phrase)) breakdown.phrase += 24
  if (phrase && title.includes(phrase)) breakdown.phrase += 18
  if (phrase && context.includes(phrase)) breakdown.phrase += 9
  if (phrase && organization.includes(phrase)) breakdown.phrase += 8

  breakdown.text += coverageScore(terms, chunk, 6, idf)
  breakdown.text += coverageScore(terms, context, 1.5, idf)
  breakdown.metadata += coverageScore(terms, title, 8, idf)
  breakdown.metadata += coverageScore(terms, organization, 4, idf)
  breakdown.metadata += coverageScore(terms, section, 2, idf)
  breakdown.metadata += terms.some((term) => statementId === term) ? 25 : 0

  const titleCoverage = coverageRatio(terms, title)
  const chunkCoverage = coverageRatio(terms, chunk)
  const contextCoverage = coverageRatio(terms, context)
  if (titleCoverage >= 0.5) breakdown.coverage += titleCoverage * 28
  if (chunkCoverage >= 0.5) breakdown.coverage += chunkCoverage * 16
  if (contextCoverage >= 0.65) breakdown.coverage += contextCoverage * 8

  if (unit.evidence_kind === 'abstract') breakdown.kind_boost += 1.5
  if (unit.evidence_kind === 'metadata') breakdown.kind_boost += 0.75

  return {
    score: breakdown.phrase + breakdown.text + breakdown.metadata + breakdown.coverage + breakdown.kind_boost,
    breakdown: { ...breakdown, matched_terms: matchedTerms },
  }
}

function diversify(items: RetrievedEvidenceUnit[], limit: number) {
  const selected: RetrievedEvidenceUnit[] = []
  const perStatement = new Map<string, number>()
  for (const item of items) {
    const count = perStatement.get(item.statement_id) || 0
    if (count >= 2) continue
    selected.push(item)
    perStatement.set(item.statement_id, count + 1)
    if (selected.length >= limit) return selected
  }
  for (const item of items) {
    if (selected.some((selectedItem) => selectedItem.id === item.id)) continue
    selected.push(item)
    if (selected.length >= limit) return selected
  }
  return selected
}

function mapDatabaseRow(row: Record<string, unknown>): RetrievedEvidenceUnit {
  const score = Number(row.combined_rank || 0)
  return {
    id: String(row.evidence_key),
    statement_id: String(row.statement_key),
    title: String(row.title),
    organization: String(row.organization || 'Unknown organization'),
    year: row.publication_year ? Number(row.publication_year) : null,
    region: String(row.region || 'Unknown'),
    type: String(row.statement_type || 'Unknown'),
    binding: String(row.binding_nature || 'Unknown'),
    source_url: row.source_url ? String(row.source_url) : null,
    section_path: (row.section_path || []) as string[],
    parent_id: row.parent_evidence_key ? String(row.parent_evidence_key) : null,
    evidence_kind: String(row.evidence_kind) as RetrievedEvidenceUnit['evidence_kind'],
    granularity: String(row.granularity) as RetrievedEvidenceUnit['granularity'],
    chunk_text: String(row.chunk_text),
    expanded_context: String(row.expanded_context),
    char_start: row.char_start === null ? null : Number(row.char_start),
    char_end: row.char_end === null ? null : Number(row.char_end),
    token_count: Number(row.token_count || 0),
    content_hash: String(row.content_hash),
    metadata: (row.metadata || {}) as Record<string, unknown>,
    score,
    score_breakdown: {
      lexical: Number(row.lexical_rank || 0),
      semantic: Number(row.semantic_rank || 0),
      combined: score,
    },
  }
}

export async function retrieveEvidence(params: RetrieveParams = {}): Promise<RetrievalSearch> {
  const limit = Math.min(Math.max(params.limit || 10, 1), 50)
  const query = (params.query || '').trim()
  const supabase = serverSupabase()

  if (supabase) {
    const { data, error } = await supabase.rpc('retrieve_evidence_units', {
      p_query: query,
      p_region: params.region || null,
      p_statement_type: databaseValue(params.type),
      p_binding_nature: databaseValue(params.binding),
      p_organization_type: databaseValue(params.organizationType),
      p_evidence_kind: params.evidenceKind || null,
      p_limit: limit,
    })
    if (!error && data) {
      return {
        items: data.map((row: Record<string, unknown>) => mapDatabaseRow(row)),
        total: data.length,
        source: 'Supabase',
      }
    }
  }

  const evidenceUnits = await localEvidenceUnits()
  const idf = buildIdf(evidenceUnits)
  const scored = evidenceUnits
    .filter((item) => (
      (!params.region || item.region === params.region)
      && (!params.type || item.type === params.type)
      && (!params.binding || item.binding === params.binding)
      && (!params.organizationType || item.metadata.organization_type === params.organizationType)
      && (!params.evidenceKind || item.evidence_kind === params.evidenceKind)
    ))
    .map((item) => {
      const { score, breakdown } = scoreEvidenceUnit(item, query, idf)
      return {
        ...item,
        score,
        score_breakdown: breakdown,
      }
    })
    .filter((item) => !query || item.score > 0)
    .sort((a, b) => b.score - a.score || (b.year || 0) - (a.year || 0) || a.id.localeCompare(b.id))

  return {
    items: diversify(scored, limit),
    total: scored.length,
    source: 'Prepared evidence snapshot',
  }
}
