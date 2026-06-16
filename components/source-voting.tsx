'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUp, ArrowUpRight, BarChart3, Check, CircleUserRound, Database, FileCheck2,
  Gauge, GitFork, LogIn, Plus, SearchCheck, ShieldCheck, Star, Wifi,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-browser'
import type { ExternalSource, PopularitySignal, SourceRequest } from '@/lib/types'
import sourceRegistry from '@/public/data/source-registry.json'

const fallbackRequests = sourceRegistry as ExternalSource[]
const registryById = new Map(fallbackRequests.map((source) => [source.id, source]))
const registryByUrl = new Map(fallbackRequests.map((source) => [source.source_url.toLowerCase(), source]))
const indexingLabels = {
  not_found: 'Not indexed',
  source_candidate_only: 'Candidate only',
  partially_indexed: 'Partial',
  indexed_as_records: 'Indexed records',
  indexed_as_source_release: 'Source release',
}
const actionLabels = {
  monitor_only: 'Monitor',
  source_registry_only: 'Registry only',
  index_metadata: 'Index metadata',
  index_records: 'Index records',
  index_full_text: 'Index full text',
}

export function SourceVoting() {
  const [requests, setRequests] = useState<ExternalSource[]>(fallbackRequests)
  const [session, setSession] = useState<Session | null>(null)
  const [message, setMessage] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [showProposal, setShowProposal] = useState(false)
  const [filters, setFilters] = useState({ status: '', type: '', complexity: '', indexing: '', signal: '' })
  const [sort, setSort] = useState('priority')

  const refresh = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('source_request_feed')
    if (!error && data) setRequests(data.map((row: SourceRequest & { vote_count: number | string }) => {
      const local = registryById.get(row.id) || registryByUrl.get(row.source_url.toLowerCase())
      return {
        ...local,
        ...row,
        vote_count: Number(row.vote_count),
        aliases: local?.aliases || row.aliases || [],
        identifiers: local?.identifiers || row.identifiers || [],
        checks: local?.checks || row.checks || [],
        popularity_signals: local?.popularity_signals || row.popularity_signals || [],
        indexing_status: local?.indexing_status || row.indexing_status,
        recommended_action: row.recommended_action || local?.recommended_action,
        source_type: row.source_type || local?.source_type || row.metadata?.source_kind || 'External source',
      } as ExternalSource
    }))
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      void refresh()
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      void refresh()
    })
    return () => listener.subscription.unsubscribe()
  }, [refresh])

  const vote = async (id: string) => {
    if (!supabase || !session) {
      setShowLogin(true)
      setMessage(supabase ? 'Sign in with an invited account to vote.' : 'Connect Supabase to enable live voting.')
      return
    }
    const { error } = await supabase.rpc('toggle_source_request_vote', { p_source_request_id: id })
    setMessage(error ? error.message : 'Vote updated.')
    if (!error) await refresh()
  }
  const sourceTypes = [...new Set(requests.map((request) => request.source_type).filter(Boolean))].sort()
  const complexities = [...new Set(requests.map((request) => request.metadata?.import_complexity).filter(Boolean))].sort()
  const visibleRequests = requests.filter((request) => (
    (!filters.status || request.status === filters.status)
    && (!filters.type || request.source_type === filters.type)
    && (!filters.complexity || request.metadata?.import_complexity === filters.complexity)
    && (!filters.indexing || request.indexing_status?.indexing_status === filters.indexing)
    && (!filters.signal || (filters.signal === 'yes' ? (request.popularity_signals?.length || 0) > 0 : (request.popularity_signals?.length || 0) === 0))
  )).sort((a, b) => {
    if (sort === 'checked') return String(b.latest_observed_at || '').localeCompare(String(a.latest_observed_at || ''))
    if (sort === 'citations') return signalTotal(b, 'citations') - signalTotal(a, 'citations')
    if (sort === 'downloads') return signalTotal(b, 'downloads') - signalTotal(a, 'downloads')
    if (sort === 'stars') return signalTotal(b, 'stars') - signalTotal(a, 'stars')
    return b.vote_count - a.vote_count || a.title.localeCompare(b.title)
  })

  return (
    <div className="source-workspace">
      <section className="source-toolbar">
        <div>
          <span><Database size={15} /> {supabase ? 'Live Supabase queue' : 'Prepared demonstration queue'}</span>
          <strong>{requests.length} registry sources</strong>
        </div>
        <div>
          {session ? <span className="signed-in"><CircleUserRound size={15} /> {session.user.email}</span> : null}
          <button className="secondary-button" onClick={() => setShowLogin((value) => !value)}><LogIn size={15} /> {session ? 'Account' : 'Sign in to vote'}</button>
          <button className="primary-button" onClick={() => session ? setShowProposal((value) => !value) : setShowLogin(true)}><Plus size={15} /> Propose source</button>
        </div>
      </section>

      <section className="source-controls" aria-label="Source filters">
        <label>Status
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All</option>
            <option value="included">Included</option>
            <option value="approved">Approved</option>
            <option value="under_review">Under review</option>
            <option value="proposed">Proposed</option>
          </select>
        </label>
        <label>Type
          <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
            <option value="">All</option>
            {sourceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label>Indexed
          <select value={filters.indexing} onChange={(event) => setFilters((current) => ({ ...current, indexing: event.target.value }))}>
            <option value="">All</option>
            {Object.entries(indexingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Complexity
          <select value={filters.complexity} onChange={(event) => setFilters((current) => ({ ...current, complexity: event.target.value }))}>
            <option value="">All</option>
            {complexities.map((complexity) => <option key={complexity} value={complexity}>{complexity}</option>)}
          </select>
        </label>
        <label>Signals
          <select value={filters.signal} onChange={(event) => setFilters((current) => ({ ...current, signal: event.target.value }))}>
            <option value="">All</option>
            <option value="yes">Has signals</option>
            <option value="no">No signals</option>
          </select>
        </label>
        <label>Sort
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="priority">Review priority</option>
            <option value="checked">Latest checked</option>
            <option value="citations">Citations</option>
            <option value="downloads">Downloads</option>
            <option value="stars">Stars</option>
          </select>
        </label>
      </section>

      {message ? <div className="notice">{message}<button onClick={() => setMessage('')}>Dismiss</button></div> : null}
      {showLogin ? <LoginPanel session={session} onClose={() => setShowLogin(false)} /> : null}
      {showProposal && session ? <ProposalForm userId={session.user.id} onCreated={() => { setShowProposal(false); void refresh() }} /> : null}

      <section className="source-list">
        {visibleRequests.map((request, index) => (
          <article className="source-card" key={request.id}>
            <button className={`vote-button ${request.user_voted ? 'voted' : ''}`} onClick={() => vote(request.id)}>
              <ArrowUp size={17} /><strong>{request.vote_count}</strong><span>{request.user_voted ? 'Voted' : 'Vote'}</span>
            </button>
            <div className="source-card-body">
              <div className="source-card-top">
                <span className="queue-rank">Priority {String(index + 1).padStart(2, '0')}</span>
                <div className="status-stack"><Status value={request.status} /><IndexingBadge request={request} /></div>
              </div>
              <Link href={`/sources/${request.id}`}><h2>{request.title}</h2></Link>
              <p className="source-publisher">{request.publisher}</p>
              <p>{request.description}</p>
              <SourceMetadata request={request} />
              <div className="source-meta">
                {request.coverage ? <span>{request.coverage}</span> : null}
                {request.formats.map((format) => <span key={format}>{format}</span>)}
                {request.recommended_action ? <span>{actionLabels[request.recommended_action]}</span> : null}
                <a href={request.source_url} rel="noreferrer" target="_blank">Inspect source <ArrowUpRight size={13} /></a>
                <Link href={`/sources/${request.id}`}>Registry record <ArrowUpRight size={13} /></Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <aside className="review-note">
        <ShieldCheck size={18} />
        <div><strong>Votes prioritize review, not automatic inclusion.</strong><p>Admins verify licensing, provenance, duplication, stability, and metadata completeness before importing a source.</p></div>
      </aside>
    </div>
  )
}

function signalTotal(request: SourceRequest, metric: PopularitySignal['metric']) {
  return (request.popularity_signals || [])
    .filter((signal) => signal.metric === metric)
    .reduce((sum, signal) => sum + signal.value, 0)
}

function SourceMetadata({ request }: { request: SourceRequest }) {
  const metadata = request.metadata
  if (!metadata && !request.popularity_signals?.length) return null
  const live = metadata?.live
  const score = Math.round(metadata?.metadata_quality_score || 0)
  const checkedAt = request.latest_observed_at?.slice(0, 10) || (live?.checked_at ? live.checked_at.slice(0, 10) : null)
  const flags = metadata?.quality_flags?.slice(0, 3) || []
  return (
    <div className="source-insights">
      {score ? (
        <div className="source-score" aria-label={`Metadata score ${score}`}>
          <div><Gauge size={14} /><span>Metadata</span><strong>{score}</strong></div>
          <i><b style={{ width: `${Math.min(score, 100)}%` }} /></i>
        </div>
      ) : null}
      <div className="source-signals">
        {metadata?.source_kind ? <span><FileCheck2 size={13} /> {metadata.source_kind}</span> : null}
        {metadata?.import_complexity ? <span>{metadata.import_complexity} import</span> : null}
        {live?.http_status ? <span><Wifi size={13} /> HTTP {live.http_status}</span> : null}
        {checkedAt ? <span>Checked {checkedAt}</span> : null}
        <SignalBadges signals={request.popularity_signals || []} />
      </div>
      {flags.length ? <div className="source-flags">{flags.map((flag) => <span key={flag}>{flag}</span>)}</div> : null}
    </div>
  )
}

function SignalBadges({ signals }: { signals: PopularitySignal[] }) {
  const visible = [
    { metric: 'citations' as const, icon: BarChart3, label: 'citations' },
    { metric: 'downloads' as const, icon: Database, label: 'downloads' },
    { metric: 'stars' as const, icon: Star, label: 'stars' },
    { metric: 'forks' as const, icon: GitFork, label: 'forks' },
  ].map(({ metric, icon: Icon, label }) => ({
    metric,
    Icon,
    label,
    value: signals.filter((signal) => signal.metric === metric).reduce((sum, signal) => sum + signal.value, 0),
  })).filter((item) => item.value > 0)
  return visible.slice(0, 4).map(({ metric, Icon, label, value }) => (
    <span key={metric}><Icon size={13} /> {value.toLocaleString()} {label}</span>
  ))
}

function IndexingBadge({ request }: { request: SourceRequest }) {
  const value = request.indexing_status?.indexing_status
  if (!value) return null
  return <span className={`indexing-status ${value}`}><SearchCheck size={12} /> {indexingLabels[value]}</span>
}

function Status({ value }: { value: SourceRequest['status'] }) {
  const labels = { proposed: 'Proposed', under_review: 'Under review', approved: 'Approved', included: 'Included', rejected: 'Rejected' }
  return <span className={`request-status ${value}`}>{value === 'approved' || value === 'included' ? <Check size={12} /> : null}{labels[value]}</span>
}

function LoginPanel({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (!supabase) return <section className="inline-panel"><h2>Supabase is not configured</h2><p>Add the public Supabase URL and publishable key to enable invite-only sign-in and live votes.</p><button className="secondary-button" onClick={onClose}>Close</button></section>
  const client = supabase
  if (session) return <section className="inline-panel"><h2>Signed in</h2><p>{session.user.email}</p><div className="button-row"><button className="secondary-button" onClick={() => client.auth.signOut()}>Sign out</button><button className="secondary-button" onClick={onClose}>Close</button></div></section>

  return (
    <form className="inline-panel login-form" onSubmit={async (event) => {
      event.preventDefault()
      const { error: signInError } = await client.auth.signInWithPassword({ email, password })
      setError(signInError?.message || '')
      if (!signInError) onClose()
    }}>
      <div><h2>Invited user sign-in</h2><p>Registration is disabled. Accounts are provisioned by an administrator.</p></div>
      <input aria-label="Email" onChange={(event) => setEmail(event.target.value)} placeholder="Email" required type="email" value={email} />
      <input aria-label="Password" onChange={(event) => setPassword(event.target.value)} placeholder="Password" required type="password" value={password} />
      <button className="primary-button" type="submit">Sign in</button>
      {error ? <span className="form-error">{error}</span> : null}
    </form>
  )
}

function ProposalForm({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [error, setError] = useState('')
  return (
    <form className="inline-panel proposal-form" onSubmit={async (event) => {
      event.preventDefault()
      if (!supabase) return
      const form = new FormData(event.currentTarget)
      const { error: insertError } = await supabase.from('source_requests').insert({
        title: form.get('title'),
        publisher: form.get('publisher'),
        description: form.get('description'),
        source_url: form.get('source_url'),
        coverage: form.get('coverage'),
        formats: String(form.get('formats') || '').split(',').map((value) => value.trim()).filter(Boolean),
        submitted_by: userId,
        status: 'proposed',
      })
      setError(insertError?.message || '')
      if (!insertError) onCreated()
    }}>
      <div><h2>Propose a data source</h2><p>Give reviewers enough information to assess relevance and import feasibility.</p></div>
      <input name="title" placeholder="Source title" required />
      <input name="publisher" placeholder="Publisher or steward" />
      <input name="source_url" placeholder="Canonical URL" required type="url" />
      <input name="coverage" placeholder="Geographic or topical coverage" />
      <input name="formats" placeholder="Formats, comma separated (API, CSV, PDF)" />
      <textarea minLength={20} name="description" placeholder="Why should this source be included?" required rows={4} />
      <button className="primary-button" type="submit">Submit proposal</button>
      {error ? <span className="form-error">{error}</span> : null}
    </form>
  )
}
