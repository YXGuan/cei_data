import { Database, FileSearch, GitMerge, ShieldCheck } from 'lucide-react'

const steps = [
  {
    icon: GitMerge,
    title: 'Reconcile',
    copy: 'Stable statement keys merge overlapping records while preserving every source payload and release.',
  },
  {
    icon: FileSearch,
    title: 'Describe',
    copy: 'Metadata covers organizations, geography, instrument type, binding nature, language, and provenance.',
  },
  {
    icon: Database,
    title: 'Index',
    copy: 'Postgres full-text search combines titles, abstracts, full text, organizations, and scored concepts.',
  },
  {
    icon: ShieldCheck,
    title: 'Govern',
    copy: 'Source proposals and votes are public; inclusion decisions and metadata changes remain admin-controlled.',
  },
]

export default function MethodologyPage() {
  return (
    <main className="content-page">
      <section className="page-intro">
        <span className="overline">How the index works</span>
        <h1>Built for retrieval, traceability, and careful expansion.</h1>
        <p>
          Supabase Postgres is the system of record. Prepared snapshots keep the public catalog
          useful during development and provide a portable fallback when the database is unavailable.
        </p>
      </section>
      <section className="method-grid">
        {steps.map(({ icon: Icon, title, copy }, index) => (
          <article key={title}>
            <span className="method-number">0{index + 1}</span>
            <Icon size={20} />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <section className="architecture-card">
        <div><span>Public product</span><strong>Next.js on Vercel</strong></div>
        <i />
        <div><span>System of record</span><strong>Supabase Postgres + Auth + RLS</strong></div>
        <i />
        <div><span>Processing</span><strong>Local Python + versioned imports</strong></div>
      </section>
    </main>
  )
}
