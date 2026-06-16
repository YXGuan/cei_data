import { SourceVoting } from '@/components/source-voting'

export default function SourcesPage() {
  return (
    <main className="content-page source-page">
      <section className="page-intro split-intro">
        <div>
          <span className="overline">Third-party source pipeline</span>
          <h1>Review the evidence sources that can expand the index.</h1>
        </div>
        <p>
          Candidate sources are checked for live availability, import complexity, provenance,
          licensing risk, and metadata completeness before they enter the catalog.
        </p>
      </section>
      <SourceVoting />
    </main>
  )
}
