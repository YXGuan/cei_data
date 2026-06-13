import { CatalogExplorer } from '@/components/catalog-explorer'
import { getCatalogFacets, searchCatalog } from '@/lib/catalog'

export default async function Home() {
  const [initial, facets] = await Promise.all([
    searchCatalog({ sort: 'year', limit: 20 }),
    getCatalogFacets(),
  ])

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
            <div><strong>1,666</strong><span>reconciled records</span></div>
            <div><strong>143</strong><span>countries</span></div>
            <div><strong>97</strong><span>languages</span></div>
            <div><strong>4</strong><span>versioned source releases</span></div>
          </div>
        </div>
      </section>
      <CatalogExplorer initial={initial} facets={facets} />
    </main>
  )
}
