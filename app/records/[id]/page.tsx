import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, BookOpenText, Calendar, Database, FileText, Globe2, Landmark } from 'lucide-react'
import { getCatalogRecord } from '@/lib/catalog'

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const record = await getCatalogRecord(id)
  if (!record) notFound()

  return (
    <main className="detail-page">
      <Link className="back-link" href="/"><ArrowLeft size={15} /> Back to catalog</Link>
      <article className="record-detail">
        <div className="record-detail-main">
          <div className="record-id"><span>{record.id}</span><span>{record.metadata_status || 'Complete'} metadata</span></div>
          <h1>{record.title}</h1>
          <p className="record-publisher">{record.organization}</p>
          <div className="record-tags">
            <span>{record.type}</span><span>{record.binding}</span><span>{record.cluster}</span>
          </div>
          <section className="abstract-section">
            <div className="section-heading"><BookOpenText size={17} /><h2>Summary</h2></div>
            <p>{record.abstract || 'No abstract has been added for this record yet.'}</p>
          </section>
          <section>
            <div className="section-heading"><Database size={17} /><h2>Top governance concepts</h2></div>
            {record.scores.length ? (
              <div className="score-list">
                {record.scores.map((score) => (
                  <div className="score-item" key={score.label}>
                    <span>{score.label}</span><strong>{score.value}</strong>
                    <i><b style={{ width: `${Math.min(score.value, 100)}%` }} /></i>
                  </div>
                ))}
              </div>
            ) : <p className="empty-copy">No scored concepts are available for this record.</p>}
          </section>
        </div>
        <aside className="metadata-panel">
          <h2>Record metadata</h2>
          <Metadata icon={Landmark} label="Organization type" value={record.organization_type} />
          <Metadata icon={Calendar} label="Publication year" value={record.year?.toString()} />
          <Metadata icon={Globe2} label="Region / country" value={[record.region, record.country_code].filter(Boolean).join(' · ')} />
          <Metadata icon={FileText} label="Scope" value={record.geographic_scope} />
          <Metadata icon={BookOpenText} label="Language" value={record.language_code?.toUpperCase()} />
          {record.word_count ? <Metadata icon={FileText} label="Word count" value={record.word_count.toLocaleString()} /> : null}
          {record.source_url ? (
            <a className="primary-button full-button" href={record.source_url} rel="noreferrer" target="_blank">
              Open original source <ArrowUpRight size={15} />
            </a>
          ) : null}
        </aside>
      </article>
    </main>
  )
}

function Metadata({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value?: string | null }) {
  return (
    <div className="metadata-row">
      <Icon size={15} /><div><span>{label}</span><strong>{value || 'Not recorded'}</strong></div>
    </div>
  )
}
