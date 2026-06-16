import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft, ArrowUpRight, BarChart3, CheckCircle2, Database, FileCheck2,
  Fingerprint, Gauge, Link2, SearchCheck, ShieldCheck,
} from 'lucide-react'
import type { ExternalSource, PopularitySignal } from '@/lib/types'
import sourceRegistry from '@/public/data/source-registry.json'

const sources = sourceRegistry as ExternalSource[]
const actionLabels = {
  monitor_only: 'Monitor only',
  source_registry_only: 'Source registry only',
  index_metadata: 'Index metadata',
  index_records: 'Index records',
  index_full_text: 'Index full text',
}
const indexingLabels = {
  not_found: 'Not found in canonical records',
  source_candidate_only: 'Source candidate only',
  partially_indexed: 'Partially indexed',
  indexed_as_records: 'Indexed as records',
  indexed_as_source_release: 'Indexed as source release',
}

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const source = sources.find((item) => item.id === id)
  if (!source) notFound()
  const check = source.checks[0]

  return (
    <main className="detail-page">
      <Link className="back-link" href="/sources"><ArrowLeft size={15} /> Back to source registry</Link>
      <article className="source-detail">
        <div className="source-detail-main">
          <div className="record-id"><span>{source.id}</span><span>{source.status.replace('_', ' ')}</span></div>
          <h1>{source.title}</h1>
          <p className="record-publisher">{source.publisher}</p>
          <div className="record-tags">
            <span>{source.source_type}</span>
            <span>{source.coverage}</span>
            <span>{actionLabels[source.recommended_action]}</span>
          </div>

          <section>
            <div className="section-heading"><FileCheck2 size={17} /><h2>Review Summary</h2></div>
            <p className="empty-copy">{source.description}</p>
            <div className="decision-grid">
              <Decision label="Indexed status" value={indexingLabels[source.indexing_status.indexing_status]} />
              <Decision label="Recommended action" value={actionLabels[source.recommended_action]} />
              <Decision label="License review" value={source.license_review_status.replace('_', ' ')} />
              <Decision label="Dedupe review" value={source.dedupe_review_status.replace('_', ' ')} />
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
            <div className="section-heading"><SearchCheck size={17} /><h2>Indexing Evidence</h2></div>
            <ul className="evidence-list">
              {source.indexing_status.evidence.map((item) => <li key={item}>{item}</li>)}
            </ul>
            {source.indexing_status.matched_statement_ids.length ? (
              <div className="matched-records">
                {source.indexing_status.matched_statement_ids.slice(0, 12).map((statementId) => (
                  <Link href={`/records/${statementId}`} key={statementId}>{statementId}</Link>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <div className="section-heading"><ShieldCheck size={17} /><h2>Known Gaps</h2></div>
            {source.metadata?.known_gaps?.length ? (
              <ul className="evidence-list">
                {source.metadata.known_gaps.map((gap) => <li key={gap}>{gap}</li>)}
              </ul>
            ) : <p className="empty-copy">No source-specific gaps have been recorded.</p>}
          </section>
        </div>

        <aside className="metadata-panel">
          <h2>Source Metadata</h2>
          <Metadata icon={Database} label="Formats" value={source.formats.join(', ')} />
          <Metadata icon={Gauge} label="Import complexity" value={source.metadata?.import_complexity} />
          <Metadata icon={CheckCircle2} label="Latest check" value={source.latest_observed_at?.slice(0, 10)} />
          <Metadata icon={Fingerprint} label="Identifiers" value={source.identifiers.length.toString()} />
          {check ? <Metadata icon={Link2} label="HTTP check" value={`${check.http_status || 'NA'} ${check.ok ? 'OK' : 'Needs review'}`} /> : null}
          <a className="primary-button full-button" href={source.source_url} rel="noreferrer" target="_blank">
            Open canonical source <ArrowUpRight size={15} />
          </a>
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
