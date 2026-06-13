import { SourceVoting } from '@/components/source-voting'

export default function SourcesPage() {
  return (
    <main className="content-page source-page">
      <section className="page-intro split-intro">
        <div>
          <span className="overline">Community prioritization</span>
          <h1>Help decide what enters the index next.</h1>
        </div>
        <p>
          Vote for sources with the greatest research value. Votes inform the review queue;
          inclusion still requires provenance, licensing, and metadata-quality checks.
        </p>
      </section>
      <SourceVoting />
    </main>
  )
}
