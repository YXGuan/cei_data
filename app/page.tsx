import { CatalogExplorer } from '@/components/catalog-explorer'
import { getCatalogFacets, searchCatalog } from '@/lib/catalog'
import dashboard from '@/public/data/dashboard.json'
import sourceCandidates from '@/public/data/source-candidates.json'

export default async function Home() {
  const [initial, facets] = await Promise.all([
    searchCatalog({ sort: 'year', limit: 20 }),
    getCatalogFacets(),
  ])
  const totals = dashboard.totals

  return (
    <main>
      <section className="catalog-hero">
        <div className="hero-inner">
          <span className="overline">AI governance evidence infrastructure</span>
          <h1>Find the policy, standard, or principle you need.</h1>
          <p>
            Search a reconciled global corpus, inspect source-level metadata, and trace each record
            back to its provenance.
          </p>
          <div className="hero-stats" aria-label="Catalog summary">
            <div><strong>{totals.statements.toLocaleString()}</strong><span>reconciled records</span></div>
            <div><strong>{totals.countries.toLocaleString()}</strong><span>countries</span></div>
            <div><strong>{totals.languages.toLocaleString()}</strong><span>languages</span></div>
            <div><strong>{sourceCandidates.length.toLocaleString()}</strong><span>third-party source candidates</span></div>
          </div>
        </div>
      </section>
      <CatalogExplorer initial={initial} facets={facets} />
    </main>
  )
}
