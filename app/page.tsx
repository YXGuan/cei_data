import { SourceMatrixExplorer } from '@/components/source-matrix-explorer'
import { getSourceFacets, searchSources } from '@/lib/source-catalog'

export default async function Home() {
  const [initial, facets] = await Promise.all([
    searchSources({ persona: 'builder', sort: 'relevance', limit: 24 }),
    getSourceFacets(),
  ])

  return (
    <main>
      <section className="catalog-hero">
        <div className="hero-inner">
          <span className="overline">Dr. K source matrix MVP</span>
          <h1>Find the AI governance source worth reviewing next.</h1>
          <p>
            Explore the latest PRD source matrix through persona pathways, Wisdom Layer tags,
            and source-level control/evidence previews before deeper ingestion begins.
          </p>
          <div className="hero-stats" aria-label="Source matrix summary">
            <div><strong>{initial.total.toLocaleString()}</strong><span>matrix sources</span></div>
            <div><strong>{facets.categories.length.toLocaleString()}</strong><span>source categories</span></div>
            <div><strong>{facets.wisdomTags.length.toLocaleString()}</strong><span>wisdom tags</span></div>
            <div><strong>3</strong><span>persona pathways</span></div>
          </div>
        </div>
      </section>
      <SourceMatrixExplorer initial={initial} facets={facets} />
    </main>
  )
}
