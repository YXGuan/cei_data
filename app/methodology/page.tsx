import { BarChart3, BookMarked, FileSearch, GitMerge, ShieldCheck } from 'lucide-react'

const steps = [
  {
    icon: BookMarked,
    title: 'Seed',
    copy: 'Dr. K’s PRD source URL matrix is the canonical active MVP dataset for source review.',
  },
  {
    icon: FileSearch,
    title: 'Check',
    copy: 'Each source is normalized, live-checked when public, and tagged with URL status, format, category, and review fields.',
  },
  {
    icon: ShieldCheck,
    title: 'Tag',
    copy: 'Human/rule-seeded Wisdom Layer tags and persona relevance guide triage before LLM enrichment is introduced.',
  },
  {
    icon: GitMerge,
    title: 'Crosswalk',
    copy: 'Source-level previews connect a governance source to a core constraint, required control, and evidence standard.',
  },
  {
    icon: BarChart3,
    title: 'Prioritize',
    copy: 'Signals and review metadata support source prioritization without treating archived legacy records as active data.',
  },
]

export default function MethodologyPage() {
  return (
    <main className="content-page">
      <section className="page-intro">
        <span className="overline">How the MVP works</span>
        <h1>Built around source triage before record-level ingestion.</h1>
        <p>
          The current MVP intentionally starts with Dr. K’s source matrix rather than the older
          CEI statement snapshots. That keeps the team focused on source quality, persona fit,
          Wisdom Layer review, and the minimum crosswalk needed for useful governance decisions.
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
        <div><span>Active data</span><strong>Dr. K source matrix snapshots</strong></div>
        <i />
        <div><span>Review workflow</span><strong>Supabase-ready registry + admin fields</strong></div>
      </section>
      <section className="method-note">
        <h2>Archived CEI corpus</h2>
        <p>
          The prior statement, fingerprint, dashboard, and source-candidate files are retained under
          `archive/legacy-cei-corpus/` for reference. They are not used by search, source pages,
          validation, or visible navigation in this MVP.
        </p>
      </section>
    </main>
  )
}
