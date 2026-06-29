import { SourceMatrixExplorer } from '@/components/source-matrix-explorer'
import { getSourceFacets, searchSources } from '@/lib/source-catalog'

export default async function SourcesPage() {
  const [initial, facets] = await Promise.all([
    searchSources({ persona: 'legal_compliance', sort: 'relevance', limit: 24 }),
    getSourceFacets(),
  ])

  return (
    <main className="content-page source-page">
      <section className="page-intro split-intro">
        <div>
          <span className="overline">Source matrix</span>
          <h1>Review Dr. K’s source priorities, Wisdom tags, and crosswalk previews.</h1>
        </div>
        <p>
          This MVP treats the PRD source URL matrix as canonical active data. Legacy statement and
          fingerprint snapshots are archived until record-level ingestion is intentionally reopened.
        </p>
      </section>
      <SourceMatrixExplorer initial={initial} facets={facets} />
    </main>
  )
}
