import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { CatalogFacets, CatalogRecord, CatalogSearch } from '@/lib/types'

export type SearchParams = {
  query?: string
  region?: string
  type?: string
  binding?: string
  organizationType?: string
  cluster?: string
  sort?: 'relevance' | 'year' | 'title' | 'organization'
  page?: number
  limit?: number
}

let catalogCache: CatalogRecord[] | null = null

async function localCatalog() {
  if (catalogCache) return catalogCache
  const file = await readFile(path.join(process.cwd(), 'public', 'data', 'statements.json'), 'utf8')
  catalogCache = JSON.parse(file) as CatalogRecord[]
  return catalogCache
}

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
}

function databaseValue(value?: string) {
  return value ? value.toLowerCase().replaceAll(' ', '_') : null
}

function titleCase(value?: string | null) {
  return (value || 'Unknown').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function mapDatabaseRow(row: Record<string, unknown>): CatalogRecord {
  return {
    id: String(row.statement_key),
    title: String(row.title),
    organization: String(row.organization || 'Unknown organization'),
    year: row.publication_year ? Number(row.publication_year) : null,
    region: String(row.region || 'Unknown'),
    type: titleCase(String(row.statement_type || '')),
    binding: titleCase(String(row.binding_nature || '')),
    cluster: String(row.cluster_label || 'Not fingerprinted'),
    metadata_status: row.lifecycle_status === 'metadata_pending' ? 'Pending' : 'Complete',
    organization_type: titleCase(String(row.organization_type || '')),
    organization_subtype: titleCase(String(row.organization_subtype || '')),
    geographic_scope: titleCase(String(row.geographic_scope || '')),
    country_code: row.country_code ? String(row.country_code) : null,
    language_code: row.language_code ? String(row.language_code) : null,
    source_url: row.source_url ? String(row.source_url) : null,
    abstract: row.abstract ? String(row.abstract) : null,
    word_count: row.word_count ? Number(row.word_count) : null,
    scores: ((row.top_scores || []) as { label: string; score: number; color?: string }[]).map((score) => ({
      label: score.label,
      value: Number(score.score),
      color: score.color,
    })),
  }
}

export async function searchCatalog(params: SearchParams = {}): Promise<CatalogSearch> {
  const limit = Math.min(Math.max(params.limit || 20, 1), 100)
  const page = Math.max(params.page || 1, 1)
  const offset = (page - 1) * limit
  const supabase = serverSupabase()

  if (supabase) {
    const { data, error } = await supabase.rpc('search_statements', {
      p_query: params.query || '',
      p_region: params.region || null,
      p_statement_type: databaseValue(params.type),
      p_binding_nature: databaseValue(params.binding),
      p_cluster_label: params.cluster || null,
      p_organization_type: databaseValue(params.organizationType),
      p_sort: params.sort || (params.query ? 'relevance' : 'year'),
      p_limit: limit,
      p_offset: offset,
    })
    if (!error) {
      return {
        items: data.map((row: Record<string, unknown>) => mapDatabaseRow(row)),
        total: Number(data[0]?.total_count || 0),
        source: 'Supabase',
      }
    }
  }

  const query = (params.query || '').trim().toLowerCase()
  const terms = query.split(/\s+/).filter(Boolean)
  const catalog = await localCatalog()
  const matches = catalog.map((item) => {
    const haystack = [
      item.id, item.title, item.organization, item.abstract, item.region, item.type,
      item.binding, item.cluster, item.organization_type, item.organization_subtype,
      ...item.scores.map((score) => score.label),
    ].join(' ').toLowerCase()
    const rank = terms.reduce((sum, term) => (
      sum
      + (item.title.toLowerCase().includes(term) ? 5 : 0)
      + (item.organization.toLowerCase().includes(term) ? 3 : 0)
      + (haystack.includes(term) ? 1 : 0)
    ), 0)
    return { item, haystack, rank }
  }).filter(({ item, haystack }) => (
    terms.every((term) => haystack.includes(term))
    && (!params.region || item.region === params.region)
    && (!params.type || item.type === params.type)
    && (!params.binding || item.binding === params.binding)
    && (!params.organizationType || item.organization_type === params.organizationType)
    && (!params.cluster || item.cluster === params.cluster)
  ))

  matches.sort((a, b) => {
    if (params.sort === 'title') return a.item.title.localeCompare(b.item.title)
    if (params.sort === 'organization') return a.item.organization.localeCompare(b.item.organization)
    if (params.sort === 'year' || !query) return (b.item.year || 0) - (a.item.year || 0)
    return b.rank - a.rank || (b.item.year || 0) - (a.item.year || 0)
  })

  return {
    items: matches.slice(offset, offset + limit).map(({ item }) => item),
    total: matches.length,
    source: 'Prepared snapshot',
  }
}

export async function getCatalogFacets(): Promise<CatalogFacets> {
  const catalog = await localCatalog()
  const unique = (key: keyof CatalogRecord) => [...new Set(
    catalog.map((item) => String(item[key] || '')).filter(Boolean),
  )].sort()
  return {
    regions: unique('region'),
    types: unique('type'),
    bindings: unique('binding'),
    organizationTypes: unique('organization_type'),
    clusters: unique('cluster'),
  }
}

export async function getCatalogRecord(statementKey: string) {
  const supabase = serverSupabase()
  if (supabase) {
    const { data, error } = await supabase.from('statement_explorer')
      .select('*')
      .eq('statement_key', statementKey)
      .maybeSingle()
    if (!error && data) return mapDatabaseRow(data)
  }
  return (await localCatalog()).find((item) => item.id === statementKey) || null
}
