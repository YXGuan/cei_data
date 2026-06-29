'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, BookMarked, ChevronLeft, ChevronRight, Download,
  FileDown, FileSearch, Filter, Scale, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, UsersRound, X,
} from 'lucide-react'
import type { SourceFacets, SourceSearch } from '@/lib/source-catalog'
import type { ExternalSource, PersonaKey } from '@/lib/types'

type Filters = {
  category: string
  wisdomTag: string
  action: string
  complexity: string
  status: string
}

const emptyFilters: Filters = { category: '', wisdomTag: '', action: '', complexity: '', status: '' }
const personas: {
  key: PersonaKey
  title: string
  icon: typeof Sparkles
  prompt: string
  framing: string
}[] = [
  {
    key: 'builder',
    title: 'Builder / Product',
    icon: Sparkles,
    prompt: 'Search for a launch risk, control, model type, or evidence artifact',
    framing: 'Prioritizes sources that translate governance into controls, tests, monitoring, and launch evidence.',
  },
  {
    key: 'legal_compliance',
    title: 'Legal & Compliance',
    icon: Scale,
    prompt: 'Search for a jurisdiction, obligation, standard, or audit requirement',
    framing: 'Prioritizes laws, standards, regulator guidance, enforcement context, and compliance evidence.',
  },
  {
    key: 'ministry_civil_society',
    title: 'Ministry & Civil Society',
    icon: UsersRound,
    prompt: 'Search for a community, moral concern, vulnerability, or plain-language guidance',
    framing: 'Prioritizes ethics, dignity, vulnerability, social impact, and non-technical governance resources.',
  },
]

const actionLabels: Record<string, string> = {
  monitor_only: 'Monitor',
  source_registry_only: 'Registry only',
  index_metadata: 'Index metadata',
  index_records: 'Index records',
  index_full_text: 'Index full text',
}

export function SourceMatrixExplorer({ initial, facets }: { initial: SourceSearch; facets: SourceFacets }) {
  const [persona, setPersona] = useState<PersonaKey>('builder')
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [sort, setSort] = useState('relevance')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(initial)
  const [showFilters, setShowFilters] = useState(false)
  const selectedPersona = useMemo(() => personas.find((item) => item.key === persona) || personas[0], [persona])

  useEffect(() => {
    const controller = new AbortController()
    const params = searchParams({ appliedQuery, filters, page, persona, sort })
    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<SourceSearch>)
      .then((data) => setResult(data))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') console.error(error)
      })
    return () => controller.abort()
  }, [appliedQuery, filters, page, persona, sort])

  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const pages = Math.max(1, Math.ceil(result.total / 24))
  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }
  const clear = () => {
    setQuery('')
    setAppliedQuery('')
    setFilters(emptyFilters)
    setSort('relevance')
    setPage(1)
  }
  const exportResults = async (format: 'markdown' | 'csv') => {
    const params = searchParams({ appliedQuery, filters, page: 1, persona, sort, limit: 500 })
    const data = await fetch(`/api/search?${params}`).then((response) => response.json() as Promise<SourceSearch>)
    downloadFile(
      format === 'markdown' ? markdownBrief(data.items, selectedPersona.title) : csvChecklist(data.items, selectedPersona.title),
      format === 'markdown' ? 'cei-source-brief.md' : 'cei-source-checklist.csv',
      format === 'markdown' ? 'text/markdown' : 'text/csv',
    )
  }

  return (
    <section className="source-matrix-shell">
      <div className="persona-gate" aria-label="Persona pathway">
        {personas.map(({ key, title, icon: Icon, framing }) => (
          <button className={persona === key ? 'active' : ''} key={key} onClick={() => { setPersona(key); setPage(1) }} type="button">
            <Icon size={18} />
            <span>{title}</span>
            <small>{framing}</small>
          </button>
        ))}
      </div>

      <form className="search-bar source-search" onSubmit={(event) => {
        event.preventDefault()
        setAppliedQuery(query.trim())
        setPage(1)
      }}>
        <Search size={20} />
        <input
          aria-label="Search source matrix"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selectedPersona.prompt}
          value={query}
        />
        {query ? <button aria-label="Clear query" className="icon-button" onClick={() => setQuery('')} type="button"><X size={16} /></button> : null}
        <button className="search-submit" type="submit">Search</button>
      </form>

      <div className="utility-row source-utility">
        <button className="filter-toggle" onClick={() => setShowFilters((value) => !value)} type="button">
          <SlidersHorizontal size={15} /> Filters {activeFilterCount ? <b>{activeFilterCount}</b> : null}
        </button>
        <p><BookMarked size={14} /> Results from <strong>{result.source}</strong></p>
        <button className="secondary-button" onClick={() => exportResults('markdown')} type="button"><FileDown size={14} /> Markdown</button>
        <button className="secondary-button" onClick={() => exportResults('csv')} type="button"><Download size={14} /> CSV</button>
      </div>

      <div className={`catalog-layout ${showFilters ? 'filters-visible' : ''}`}>
        <aside className="filter-panel">
          <div className="filter-heading"><div><Filter size={15} /><strong>Refine sources</strong></div>{activeFilterCount ? <button onClick={clear}>Clear all</button> : null}</div>
          <Facet label="Category" value={filters.category} options={facets.categories} onChange={(value) => updateFilter('category', value)} />
          <Facet label="Wisdom tag" value={filters.wisdomTag} options={facets.wisdomTags} onChange={(value) => updateFilter('wisdomTag', value)} />
          <Facet label="Action" value={filters.action} options={facets.actions} optionLabels={actionLabels} onChange={(value) => updateFilter('action', value)} />
          <Facet label="Complexity" value={filters.complexity} options={facets.complexities} onChange={(value) => updateFilter('complexity', value)} />
          <Facet label="Review status" value={filters.status} options={facets.statuses} onChange={(value) => updateFilter('status', value)} />
        </aside>

        <div className="results-column">
          <div className="results-heading">
            <div>
              <strong>{result.total.toLocaleString()}</strong>
              <span>{appliedQuery ? `sources matching "${appliedQuery}"` : 'sources in Dr. K matrix'}</span>
            </div>
            <label>Sort
              <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}>
                <option value="relevance">Persona relevance</option>
                <option value="category">Category</option>
                <option value="title">Title</option>
                <option value="latest">Latest checked</option>
              </select>
            </label>
          </div>

          <div className="persona-framing">
            <ShieldCheck size={16} />
            <span>{selectedPersona.framing}</span>
          </div>

          <div className="source-matrix-list" aria-live="polite">
            {result.items.map((source) => <SourceCard key={source.id} persona={persona} source={source} />)}
            {!result.items.length ? (
              <div className="empty-state"><FileSearch size={24} /><h2>No sources found</h2><p>Try a broader query or remove one of the filters.</p><button onClick={clear}>Reset search</button></div>
            ) : null}
          </div>

          {result.total > 24 ? (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={15} /> Previous</button>
              <span>Page <strong>{page}</strong> of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight size={15} /></button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function SourceCard({ source, persona }: { source: ExternalSource; persona: PersonaKey }) {
  const relevance = source.persona_relevance?.[persona] || 'medium'
  return (
    <article className="source-matrix-card">
      <div className="source-matrix-top">
        <span className="queue-rank">{source.category}</span>
        <span className={`persona-relevance ${relevance}`}>{relevance} fit</span>
      </div>
      <Link href={`/sources/${source.id}`}><h2>{source.title}</h2></Link>
      <p className="source-publisher">{source.publisher}</p>
      <p>{source.description}</p>
      <div className="wisdom-tags">
        {source.wisdom_tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
      <div className="crosswalk-preview">
        <div><span>Core constraint</span><strong>{source.core_constraint}</strong></div>
        <div><span>Required control</span><strong>{source.required_control}</strong></div>
        <div><span>Evidence</span><strong>{source.evidence_standard}</strong></div>
      </div>
      <div className="source-meta">
        <span>{source.url_status}</span>
        <span>{actionLabels[source.recommended_action] || source.recommended_action}</span>
        <span>{source.confidence_rating}</span>
        {isExternalUrl(source.source_url) ? <a href={source.source_url} rel="noreferrer" target="_blank">Open source <ArrowUpRight size={13} /></a> : null}
        <Link href={`/sources/${source.id}`}>Inspect source <ArrowRight size={13} /></Link>
      </div>
    </article>
  )
}

function Facet({
  label,
  value,
  options,
  optionLabels,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  optionLabels?: Record<string, string>
  onChange: (value: string) => void
}) {
  return (
    <label className="facet">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{optionLabels?.[option] || option.replaceAll('_', ' ')}</option>)}
      </select>
    </label>
  )
}

function searchParams({
  appliedQuery,
  filters,
  limit,
  page,
  persona,
  sort,
}: {
  appliedQuery: string
  filters: Filters
  limit?: number
  page: number
  persona: PersonaKey
  sort: string
}) {
  return new URLSearchParams({
    q: appliedQuery,
    persona,
    sort,
    page: String(page),
    ...(limit ? { limit: String(limit) } : {}),
    ...filters,
  })
}

function markdownBrief(items: ExternalSource[], persona: string) {
  const lines = [
    `# CEI Source Matrix Brief`,
    '',
    `Persona pathway: ${persona}`,
    `Sources exported: ${items.length}`,
    '',
  ]
  for (const source of items) {
    lines.push(`## ${source.title}`)
    lines.push(`- Category: ${source.category}`)
    lines.push(`- Publisher: ${source.publisher}`)
    lines.push(`- URL status: ${source.url_status}`)
    lines.push(`- Recommended action: ${source.recommended_action.replaceAll('_', ' ')}`)
    lines.push(`- Wisdom tags: ${source.wisdom_tags.join(', ')}`)
    lines.push(`- Core constraint: ${source.core_constraint}`)
    lines.push(`- Required control: ${source.required_control}`)
    lines.push(`- Evidence standard: ${source.evidence_standard}`)
    lines.push(`- Confidence: ${source.confidence_rating}`)
    if (isExternalUrl(source.source_url)) lines.push(`- Source: ${source.source_url}`)
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}

function csvChecklist(items: ExternalSource[], persona: string) {
  const rows = [
    ['persona', 'id', 'title', 'category', 'publisher', 'source_url', 'url_status', 'recommended_action', 'wisdom_tags', 'core_constraint', 'required_control', 'evidence_standard', 'confidence_rating'],
    ...items.map((source) => [
      persona,
      source.id,
      source.title,
      source.category,
      source.publisher || '',
      source.source_url,
      source.url_status,
      source.recommended_action,
      source.wisdom_tags.join('; '),
      source.core_constraint,
      source.required_control,
      source.evidence_standard,
      source.confidence_rating,
    ]),
  ]
  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`
}

function csvEscape(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value)
}
