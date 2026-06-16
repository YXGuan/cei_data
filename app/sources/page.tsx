import { SourceVoting } from '@/components/source-voting'

export default function SourcesPage() {
  return (
    <main className="content-page source-page">
      <section className="page-intro split-intro">
        <div>
          <span className="overline">Source registry</span>
          <h1>Review source coverage, popularity signals, and indexing status.</h1>
        </div>
        <p>
          Sources are checked for live availability, external traction, provenance, licensing risk,
          dedupe status, and the right level of ingestion before they enter the catalog.
        </p>
      </section>
      <SourceVoting />
    </main>
  )
}
