import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ExternalSource, PersonaKey, WisdomTag } from '@/lib/types'

export type SourceSearchParams = {
  query?: string
  persona?: PersonaKey | ''
  category?: string
  action?: string
  wisdomTag?: string
  complexity?: string
  status?: string
  sort?: 'relevance' | 'title' | 'category' | 'latest'
  page?: number
  limit?: number
}

export type SourceSearch = {
  items: ExternalSource[]
  total: number
  source: 'Dr. K source matrix'
}

export type SourceFacets = {
  categories: string[]
  actions: string[]
  wisdomTags: WisdomTag[]
  complexities: string[]
  statuses: string[]
}

let sourceCache: ExternalSource[] | null = null

export async function getSources() {
  if (sourceCache) return sourceCache
  const file = await readFile(path.join(process.cwd(), 'public', 'data', 'source-registry.json'), 'utf8')
  sourceCache = JSON.parse(file) as ExternalSource[]
  return sourceCache
}

function searchableText(source: ExternalSource) {
  return [
    source.id,
    source.title,
    source.publisher,
    source.description,
    source.source_type,
    source.coverage,
    source.category,
    source.url_status,
    source.notes,
    source.recommended_action,
    source.core_constraint,
    source.required_control,
    source.evidence_standard,
    ...(source.formats || []),
    ...(source.wisdom_tags || []),
  ].filter(Boolean).join(' ').toLowerCase()
}

function categoryOf(source: ExternalSource) {
  return source.category || source.coverage || 'Uncategorized'
}

function personaBoost(source: ExternalSource, persona?: PersonaKey | '') {
  if (!persona) return 0
  const value = source.persona_relevance?.[persona]
  if (value === 'high') return 6
  if (value === 'medium') return 2
  return -2
}

export async function searchSources(params: SourceSearchParams = {}): Promise<SourceSearch> {
  const limit = Math.min(Math.max(params.limit || 24, 1), 500)
  const page = Math.max(params.page || 1, 1)
  const offset = (page - 1) * limit
  const terms = (params.query || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  const sources = await getSources()

  const matches = sources.map((item) => {
    const haystack = searchableText(item)
    const rank = terms.reduce((sum, term) => (
      sum
      + (item.title.toLowerCase().includes(term) ? 5 : 0)
      + (String(item.publisher || '').toLowerCase().includes(term) ? 3 : 0)
      + (haystack.includes(term) ? 1 : 0)
    ), 0) + personaBoost(item, params.persona)
    return { item, haystack, rank }
  }).filter(({ item, haystack }) => (
    terms.every((term) => haystack.includes(term))
    && (!params.category || categoryOf(item) === params.category)
    && (!params.action || item.recommended_action === params.action)
    && (!params.wisdomTag || item.wisdom_tags.includes(params.wisdomTag as WisdomTag))
    && (!params.complexity || item.metadata?.import_complexity === params.complexity)
    && (!params.status || item.status === params.status)
  ))

  matches.sort((a, b) => {
    if (params.sort === 'title') return a.item.title.localeCompare(b.item.title)
    if (params.sort === 'category') return categoryOf(a.item).localeCompare(categoryOf(b.item)) || a.item.title.localeCompare(b.item.title)
    if (params.sort === 'latest') return String(b.item.latest_observed_at || '').localeCompare(String(a.item.latest_observed_at || ''))
    return b.rank - a.rank || categoryOf(a.item).localeCompare(categoryOf(b.item)) || a.item.title.localeCompare(b.item.title)
  })

  return {
    items: matches.slice(offset, offset + limit).map(({ item }) => item),
    total: matches.length,
    source: 'Dr. K source matrix',
  }
}

export async function getSourceFacets(): Promise<SourceFacets> {
  const sources = await getSources()
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort()
  return {
    categories: unique(sources.map(categoryOf)),
    actions: unique(sources.map((source) => source.recommended_action)),
    wisdomTags: unique(sources.flatMap((source) => source.wisdom_tags)) as WisdomTag[],
    complexities: unique(sources.map((source) => source.metadata?.import_complexity || '')),
    statuses: unique(sources.map((source) => source.status)),
  }
}

export async function getSource(id: string) {
  return (await getSources()).find((source) => source.id === id) || null
}
