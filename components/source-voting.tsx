'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowUp, ArrowUpRight, Check, CircleUserRound, Database, LogIn, Plus, ShieldCheck } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-browser'
import type { SourceRequest } from '@/lib/types'

const fallbackRequests: SourceRequest[] = [
  {
    id: 'fallback-eu', title: 'EU AI Act implementation resources', publisher: 'European Commission',
    description: 'Official implementation materials, codes of practice, and guidance related to the European Union AI Act.',
    source_url: 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai', coverage: 'European Union',
    formats: ['PDF', 'HTML'], status: 'approved', created_at: '2026-06-13T00:00:00Z', vote_count: 31, user_voted: false,
  },
  {
    id: 'fallback-oecd', title: 'OECD AI Policy Observatory', publisher: 'OECD.AI',
    description: 'Policy initiatives, national strategies, and governance instruments from the OECD AI Policy Observatory.',
    source_url: 'https://oecd.ai/en/dashboards/overview', coverage: 'Global policy initiatives',
    formats: ['API', 'HTML'], status: 'under_review', created_at: '2026-06-13T00:00:00Z', vote_count: 24, user_voted: false,
  },
  {
    id: 'fallback-nist', title: 'NIST AI Risk Management Framework resources', publisher: 'NIST',
    description: 'Implementation resources, profiles, and supporting documents associated with the NIST AI Risk Management Framework.',
    source_url: 'https://www.nist.gov/itl/ai-risk-management-framework', coverage: 'United States and international practice',
    formats: ['PDF', 'HTML'], status: 'proposed', created_at: '2026-06-13T00:00:00Z', vote_count: 18, user_voted: false,
  },
]

export function SourceVoting() {
  const [requests, setRequests] = useState(fallbackRequests)
  const [session, setSession] = useState<Session | null>(null)
  const [message, setMessage] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [showProposal, setShowProposal] = useState(false)

  const refresh = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('source_request_feed')
    if (!error && data) setRequests(data.map((row: SourceRequest & { vote_count: number | string }) => ({
      ...row,
      vote_count: Number(row.vote_count),
    })))
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

  return (
    <div className="source-workspace">
      <section className="source-toolbar">
        <div>
          <span><Database size={15} /> {supabase ? 'Live Supabase queue' : 'Prepared demonstration queue'}</span>
          <strong>{requests.length} candidate sources</strong>
        </div>
        <div>
          {session ? <span className="signed-in"><CircleUserRound size={15} /> {session.user.email}</span> : null}
          <button className="secondary-button" onClick={() => setShowLogin((value) => !value)}><LogIn size={15} /> {session ? 'Account' : 'Sign in to vote'}</button>
          <button className="primary-button" onClick={() => session ? setShowProposal((value) => !value) : setShowLogin(true)}><Plus size={15} /> Propose source</button>
        </div>
      </section>

      {message ? <div className="notice">{message}<button onClick={() => setMessage('')}>Dismiss</button></div> : null}
      {showLogin ? <LoginPanel session={session} onClose={() => setShowLogin(false)} /> : null}
      {showProposal && session ? <ProposalForm userId={session.user.id} onCreated={() => { setShowProposal(false); void refresh() }} /> : null}

      <section className="source-list">
        {requests.map((request, index) => (
          <article className="source-card" key={request.id}>
            <button className={`vote-button ${request.user_voted ? 'voted' : ''}`} onClick={() => vote(request.id)}>
              <ArrowUp size={17} /><strong>{request.vote_count}</strong><span>{request.user_voted ? 'Voted' : 'Vote'}</span>
            </button>
            <div className="source-card-body">
              <div className="source-card-top">
                <span className="queue-rank">Priority {String(index + 1).padStart(2, '0')}</span>
                <Status value={request.status} />
              </div>
              <h2>{request.title}</h2>
              <p className="source-publisher">{request.publisher}</p>
              <p>{request.description}</p>
              <div className="source-meta">
                {request.coverage ? <span>{request.coverage}</span> : null}
                {request.formats.map((format) => <span key={format}>{format}</span>)}
                <a href={request.source_url} rel="noreferrer" target="_blank">Inspect source <ArrowUpRight size={13} /></a>
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
