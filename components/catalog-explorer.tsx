'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Database, FileSearch,
  Filter, Globe2, Landmark, Search, SlidersHorizontal, X,
} from 'lucide-react'
import type { CatalogFacets, CatalogSearch } from '@/lib/types'

type Filters = {
  region: string
  type: string
  binding: string
  organizationType: string
  cluster: string
}

const emptyFilters: Filters = { region: '', type: '', binding: '', organizationType: '', cluster: '' }

export function CatalogExplorer({ initial, facets }: { initial: CatalogSearch; facets: CatalogFacets }) {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [sort, setSort] = useState('relevance')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(initial)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      q: appliedQuery,
      sort,
      page: String(page),
      ...filters,
    })
    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<CatalogSearch>)
      .then((data) => setResult(data))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') console.error(error)
      })
    return () => controller.abort()
  }, [appliedQuery, filters, page, sort])

  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const pages = Math.max(1, Math.ceil(result.total / 20))
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

  return (
    <section className="catalog-shell">
      <form className="search-bar" onSubmit={(event) => {
        event.preventDefault()
        setAppliedQuery(query.trim())
        setPage(1)
      }}>
        <Search size={20} />
        <input
          aria-label="Search catalog"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by policy, organization, concept, or record ID"
          value={query}
        />
        {query ? <button aria-label="Clear query" className="icon-button" onClick={() => setQuery('')} type="button"><X size={16} /></button> : null}
        <button className="search-submit" type="submit">Search</button>
      </form>

      <div className="utility-row">
        <button className="filter-toggle" onClick={() => setShowFilters((value) => !value)} type="button">
          <SlidersHorizontal size={15} /> Filters {activeFilterCount ? <b>{activeFilterCount}</b> : null}
        </button>
        <p><Database size={14} /> Results from <strong>{result.source}</strong></p>
        <Link href="/sources">Review source pipeline <ArrowRight size={14} /></Link>
      </div>

      <div className={`catalog-layout ${showFilters ? 'filters-visible' : ''}`}>
        <aside className="filter-panel">
          <div className="filter-heading"><div><Filter size={15} /><strong>Refine results</strong></div>{activeFilterCount ? <button onClick={clear}>Clear all</button> : null}</div>
          <Facet label="Region" value={filters.region} options={facets.regions} onChange={(value) => updateFilter('region', value)} />
          <Facet label="Instrument type" value={filters.type} options={facets.types} onChange={(value) => updateFilter('type', value)} />
          <Facet label="Binding nature" value={filters.binding} options={facets.bindings} onChange={(value) => updateFilter('binding', value)} />
          <Facet label="Organization type" value={filters.organizationType} options={facets.organizationTypes} onChange={(value) => updateFilter('organizationType', value)} />
          <Facet label="Policy family" value={filters.cluster} options={facets.clusters} onChange={(value) => updateFilter('cluster', value)} />
        </aside>

        <div className="results-column">
          <div className="results-heading">
            <div>
              <strong>{result.total.toLocaleString()}</strong>
              <span>{appliedQuery ? `records matching "${appliedQuery}"` : 'records in the catalog'}</span>
            </div>
            <label>Sort
              <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}>
                <option value="relevance">Relevance</option>
                <option value="year">Newest first</option>
                <option value="title">Title</option>
                <option value="organization">Organization</option>
              </select>
            </label>
          </div>

          <div className="result-list" aria-live="polite">
            {result.items.map((item) => (
              <article className="result-card" key={item.id}>
                <div className="result-topline">
                  <span className="record-key">{item.id}</span>
                  <span className={`metadata-state ${item.metadata_status === 'Pending' ? 'pending' : ''}`}>
                    <CheckCircle2 size={12} /> {item.metadata_status || 'Complete'}
                  </span>
                  <span>{item.year || 'Year unknown'}</span>
                </div>
                <Link href={`/records/${item.id}`}><h2>{item.title}</h2></Link>
                <p className="result-abstract">{item.abstract || 'No summary is currently available for this record.'}</p>
                <div className="result-meta">
                  <span><Landmark size={13} /> {item.organization}</span>
                  <span><Globe2 size={13} /> {item.region}</span>
                  <span><FileSearch size={13} /> {item.type}</span>
                </div>
                <div className="result-footer">
                  <div>{item.scores.slice(0, 3).map((score) => <span key={score.label}>{score.label}</span>)}</div>
                  <Link href={`/records/${item.id}`}>Inspect metadata <ArrowRight size={14} /></Link>
                </div>
              </article>
            ))}
            {!result.items.length ? (
              <div className="empty-state"><FileSearch size={24} /><h2>No records found</h2><p>Try a broader query or remove one of the filters.</p><button onClick={clear}>Reset search</button></div>
            ) : null}
          </div>

          {result.total > 20 ? (
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

function Facet({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="facet">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}
