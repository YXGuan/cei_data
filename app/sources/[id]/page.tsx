import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft, ArrowUpRight, BarChart3, CheckCircle2, Database, FileCheck2,
  Gauge, Layers3, Link2, Route, ShieldCheck, Sparkles, UsersRound,
} from 'lucide-react'
import { getSource } from '@/lib/source-catalog'
import type { PopularitySignal } from '@/lib/types'

const actionLabels = {
  monitor_only: 'Monitor only',
  source_registry_only: 'Source registry only',
  index_metadata: 'Index metadata',
  index_records: 'Index records',
  index_full_text: 'Index full text',
}

const personaLabels = {
  builder: 'Builder / Product',
  legal_compliance: 'Legal & Compliance',
  ministry_civil_society: 'Ministry & Civil Society',
}

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const source = await getSource(id)
  if (!source) notFound()
  const check = source.checks[0]

  return (
    <main className="detail-page">
      <Link className="back-link" href="/sources"><ArrowLeft size={15} /> Back to source matrix</Link>
      <article className="source-detail">
        <div className="source-detail-main">
          <div className="record-id"><span>{source.id}</span><span>{source.confidence_rating} crosswalk</span></div>
          <h1>{source.title}</h1>
          <p className="record-publisher">{source.publisher}</p>
          <div className="record-tags">
            <span>{source.category}</span>
            <span>{source.source_type}</span>
            <span>{source.url_status}</span>
          </div>

          <section>
            <div className="section-heading"><FileCheck2 size={17} /><h2>Review Summary</h2></div>
            <p className="empty-copy">{source.description}</p>
            <div className="decision-grid">
              <Decision label="Recommended action" value={actionLabels[source.recommended_action]} />
              <Decision label="Import complexity" value={source.metadata?.import_complexity || 'Not recorded'} />
              <Decision label="License review" value={source.license_review_status.replaceAll('_', ' ')} />
              <Decision label="Dedupe review" value={source.dedupe_review_status.replaceAll('_', ' ')} />
            </div>
          </section>

          <section>
            <div className="section-heading"><Sparkles size={17} /><h2>Wisdom Layer Tags</h2></div>
            <div className="wisdom-tags detail-tags">
              {source.wisdom_tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </section>

          <section>
            <div className="section-heading"><Route size={17} /><h2>Crosswalk Preview</h2></div>
            <div className="crosswalk-detail">
              <Decision label="Core constraint" value={source.core_constraint} />
              <Decision label="Required control" value={source.required_control} />
              <Decision label="Evidence standard" value={source.evidence_standard} />
              <Decision label="Confidence" value={source.confidence_rating} />
            </div>
          </section>

          <section>
            <div className="section-heading"><UsersRound size={17} /><h2>Persona Relevance</h2></div>
            <div className="persona-fit-grid">
              {Object.entries(source.persona_relevance).map(([key, value]) => (
                <div className={`persona-fit ${value}`} key={key}>
                  <span>{personaLabels[key as keyof typeof personaLabels]}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="section-heading"><BarChart3 size={17} /><h2>Popularity Signals</h2></div>
            {source.popularity_signals.length ? (
              <div className="signal-grid">
                {compactSignals(source.popularity_signals).map((signal) => (
                  <a href={signal.url} key={`${signal.provider}-${signal.metric}`} rel="noreferrer" target="_blank">
                    <span>{signal.provider}</span>
                    <strong>{signal.value.toLocaleString()}</strong>
                    <small>{signal.metric.replaceAll('_', ' ')}</small>
                  </a>
                ))}
              </div>
            ) : <p className="empty-copy">No external popularity signals have been collected for this source yet.</p>}
          </section>

          <section>
            <div className="section-heading"><ShieldCheck size={17} /><h2>Notes And Gaps</h2></div>
            <p className="empty-copy">{source.notes}</p>
            {source.metadata?.known_gaps?.length ? (
              <ul className="evidence-list">
                {source.metadata.known_gaps.map((gap) => <li key={gap}>{gap}</li>)}
              </ul>
            ) : null}
          </section>
        </div>

        <aside className="metadata-panel">
          <h2>Source Metadata</h2>
          <Metadata icon={Database} label="Formats" value={source.formats.join(', ')} />
          <Metadata icon={Layers3} label="Category" value={source.category} />
          <Metadata icon={Gauge} label="Import complexity" value={source.metadata?.import_complexity} />
          <Metadata icon={CheckCircle2} label="Latest check" value={source.latest_observed_at?.slice(0, 10)} />
          {check ? <Metadata icon={Link2} label="Live check" value={check.ok ? `HTTP ${check.http_status} OK` : check.content_type || 'Not fetched'} /> : null}
          {isExternalUrl(source.source_url) ? (
            <a className="primary-button full-button" href={source.source_url} rel="noreferrer" target="_blank">
              Open source <ArrowUpRight size={15} />
            </a>
          ) : (
            <div className="internal-source-note">{source.source_url}</div>
          )}
          <div className="identifier-list">
            {source.identifiers.map((identifier) => (
              <a href={identifier.url || source.source_url} key={`${identifier.identifier_type}-${identifier.identifier_value}`} rel="noreferrer" target="_blank">
                <span>{identifier.identifier_type}</span>
                <strong>{identifier.identifier_value}</strong>
              </a>
            ))}
          </div>
        </aside>
      </article>
    </main>
  )
}

function compactSignals(signals: PopularitySignal[]) {
  const byMetric = new Map<string, PopularitySignal>()
  signals.forEach((signal) => {
    const key = `${signal.provider}-${signal.metric}`
    const current = byMetric.get(key)
    if (!current || signal.value > current.value) byMetric.set(key, signal)
  })
  return [...byMetric.values()].sort((a, b) => b.value - a.value).slice(0, 8)
}

function Decision({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>
}

function Metadata({ icon: Icon, label, value }: { icon: typeof Database; label: string; value?: string | null }) {
  return (
    <div className="metadata-row">
      <Icon size={15} /><div><span>{label}</span><strong>{value || 'Not recorded'}</strong></div>
    </div>
  )
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value)
}
