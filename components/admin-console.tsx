'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { CheckCircle2, LockKeyhole, LogOut, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase-browser'
import type { RecommendedAction, ReviewStatus, SourceRequest } from '@/lib/types'

const reviewOptions: ReviewStatus[] = ['needs_review', 'in_progress', 'approved', 'blocked', 'not_applicable']
const actionOptions: RecommendedAction[] = ['monitor_only', 'source_registry_only', 'index_metadata', 'index_records', 'index_full_text']

export function AdminConsole() {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [requests, setRequests] = useState<SourceRequest[]>([])
  const [message, setMessage] = useState('')

  const load = useCallback(async (nextSession: Session | null) => {
    if (!supabase || !nextSession) {
      setIsAdmin(false)
      setRequests([])
      return
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', nextSession.user.id).maybeSingle()
    const admin = profile?.role === 'admin'
    setIsAdmin(admin)
    if (!admin) return
    const { data } = await supabase.rpc('source_request_feed')
    setRequests((data || []).map((row: SourceRequest & { vote_count: number | string }) => ({
      ...row,
      vote_count: Number(row.vote_count),
    })))
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      void load(data.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      void load(nextSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [load])

  if (!supabase) return <AdminState icon={ShieldAlert} title="Supabase is not configured" copy="Configure the public Supabase environment variables to use the admin queue." />
  if (!session) return <AdminLogin />
  if (!isAdmin) return <AdminState icon={LockKeyhole} title="Admin access required" copy={`The signed-in profile ${session.user.email} has not been promoted to admin.`} />
  const client = supabase

  const updateStatus = async (id: string, status: string) => {
    const { error } = await client.from('source_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setMessage(error?.message || 'Review status updated.')
    if (!error) await load(session)
  }
  const updateReview = async (id: string, patch: Partial<SourceRequest>) => {
    const now = new Date().toISOString()
    const { error } = await client.from('source_requests').update({
      ...patch,
      assigned_reviewer: session.user.id,
      reviewed_at: now,
      updated_at: now,
    }).eq('id', id)
    setMessage(error?.message || 'Review field updated.')
    if (!error) await load(session)
  }

  return (
    <section className="admin-console">
      <div className="admin-toolbar">
        <div><CheckCircle2 size={16} /><span>Authenticated admin</span><strong>{session.user.email}</strong></div>
        <button className="secondary-button" onClick={() => client.auth.signOut()}><LogOut size={14} /> Sign out</button>
      </div>
      {message ? <div className="notice">{message}<button onClick={() => setMessage('')}>Dismiss</button></div> : null}
      <div className="admin-table">
        <div className="admin-row admin-head"><span>Candidate source</span><span>Votes</span><span>Status</span><span>Recommended action</span><span>License</span><span>Dedupe</span><span>Notes</span></div>
        {requests.map((request) => (
          <div className="admin-row" key={request.id}>
            <span><strong>{request.title}</strong><small>{request.publisher}</small></span>
            <strong>{request.vote_count}</strong>
            <select aria-label={`Change status for ${request.title}`} onChange={(event) => updateStatus(request.id, event.target.value)} value={request.status}>
              <option value="proposed">Proposed</option>
              <option value="under_review">Under review</option>
              <option value="approved">Approved</option>
              <option value="included">Included</option>
              <option value="rejected">Rejected</option>
            </select>
            <select aria-label={`Recommended action for ${request.title}`} onChange={(event) => updateReview(request.id, { recommended_action: event.target.value as RecommendedAction })} value={request.recommended_action || 'source_registry_only'}>
              {actionOptions.map((action) => <option key={action} value={action}>{action.replaceAll('_', ' ')}</option>)}
            </select>
            <select aria-label={`License review for ${request.title}`} onChange={(event) => updateReview(request.id, { license_review_status: event.target.value as ReviewStatus })} value={request.license_review_status || 'needs_review'}>
              {reviewOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
            </select>
            <select aria-label={`Dedupe review for ${request.title}`} onChange={(event) => updateReview(request.id, { dedupe_review_status: event.target.value as ReviewStatus })} value={request.dedupe_review_status || 'needs_review'}>
              {reviewOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
            </select>
            <input
              aria-label={`Admin notes for ${request.title}`}
              defaultValue={request.admin_notes || ''}
              onBlur={(event) => {
                if (event.currentTarget.value !== (request.admin_notes || '')) {
                  void updateReview(request.id, { admin_notes: event.currentTarget.value })
                }
              }}
              placeholder="Review note"
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  return (
    <form className="admin-login" onSubmit={async (event) => {
      event.preventDefault()
      if (!supabase) return
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      setError(signInError?.message || '')
    }}>
      <LockKeyhole size={22} />
      <h2>Admin sign-in</h2>
      <p>There is no public registration flow.</p>
      <input onChange={(event) => setEmail(event.target.value)} placeholder="Email" required type="email" value={email} />
      <input onChange={(event) => setPassword(event.target.value)} placeholder="Password" required type="password" value={password} />
      <button className="primary-button" type="submit">Sign in</button>
      {error ? <span className="form-error">{error}</span> : null}
    </form>
  )
}

function AdminState({ icon: Icon, title, copy }: { icon: typeof LockKeyhole; title: string; copy: string }) {
  return <section className="admin-state"><Icon size={24} /><h2>{title}</h2><p>{copy}</p></section>
}
