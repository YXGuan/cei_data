import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowUpRight, BookOpen, ChevronDown, Database, FileText,
  Fingerprint, Globe2, LayoutDashboard, Search, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  Legend, Line, LineChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import './App.css'
import { loadAnalytics, loadCatalog, loadDashboard, loadFingerprintPoints, type AnalyticsData, type DashboardData, type FingerprintAnalytics, type FingerprintPoint, type OntologyAnalytics, type Statement } from './lib/data'

const fallbackStatements: Statement[] = [
  { id: 'STMT-0419', title: 'EU AI Pact 2024', organization: 'European Commission / AI Office', year: 2024, region: 'Europe', type: 'Legislation', binding: 'Legally binding', cluster: 'Regulatory governance', scores: [{ label: 'Governance', value: 45, color: '#6d5dfc' }, { label: 'Procedural', value: 35, color: '#12b886' }, { label: 'Geopolitical', value: 24, color: '#f59f00' }] },
  { id: 'STMT-1070', title: 'Disability-Inclusive AI Act: Implementation Guide', organization: 'European Disability Forum', year: 2024, region: 'Europe', type: 'Framework', binding: 'Advisory', cluster: 'Rights & justice', scores: [{ label: 'Rights', value: 45, color: '#e8590c' }, { label: 'Governance', value: 43, color: '#6d5dfc' }, { label: 'Procedural', value: 39, color: '#12b886' }] },
  { id: 'STMT-0413', title: 'EDPB Opinion 28/2024 on AI Models', organization: 'European Data Protection Board', year: 2024, region: 'Europe', type: 'Opinion', binding: 'Legally binding', cluster: 'Regulatory governance', scores: [{ label: 'Governance', value: 43, color: '#6d5dfc' }, { label: 'Procedural', value: 40, color: '#12b886' }, { label: 'Rights', value: 37, color: '#e8590c' }] },
  { id: 'STMT-1163', title: 'Resolution on Technology, AI and Teaching Profession', organization: 'Education International', year: 2024, region: 'Global', type: 'Resolution', binding: 'Voluntary', cluster: 'Labor & society', scores: [{ label: 'Procedural', value: 51, color: '#12b886' }, { label: 'Society / labor', value: 49, color: '#228be6' }, { label: 'Ethics', value: 44, color: '#d6336c' }] },
  { id: 'STMT-0414', title: 'Church Council AI Issue Paper', organization: 'Evangelical Lutheran Church in America', year: 2024, region: 'North America', type: 'Position paper', binding: 'Advisory', cluster: 'Values & dignity', scores: [{ label: 'Ethics', value: 29, color: '#d6336c' }, { label: 'Values', value: 26, color: '#f59f00' }, { label: 'Procedural', value: 23, color: '#12b886' }] },
]

const fallbackTrend = [
  { year: '2018', statements: 85 }, { year: '2019', statements: 121 },
  { year: '2020', statements: 77 }, { year: '2021', statements: 117 },
  { year: '2022', statements: 76 }, { year: '2023', statements: 293 },
  { year: '2024', statements: 445 }, { year: '2025', statements: 342 },
  { year: '2026', statements: 55 },
]

const fallbackSectors = [
  { name: 'Government', value: 458, color: '#6d5dfc' },
  { name: 'Civil society', value: 280, color: '#12b886' },
  { name: 'Professional', value: 225, color: '#228be6' },
  { name: 'Religious', value: 185, color: '#f59f00' },
  { name: 'Other', value: 518, color: '#d8d6e3' },
]

const fallbackThemes = [
  { name: 'Transparency', value: 72 }, { name: 'Accountability', value: 68 },
  { name: 'Safety', value: 64 }, { name: 'Human oversight', value: 57 },
  { name: 'Privacy', value: 51 }, { name: 'Fairness', value: 46 },
]

const nav = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Statements', icon: FileText },
  { label: 'Fingerprints', icon: Fingerprint }, { label: 'Ontology', icon: BookOpen },
]
const yearLabel = (year: number | null) => year ?? 'Unknown'

function App() {
  const [active, setActive] = useState('Overview')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Statement | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [catalog, setCatalog] = useState<Statement[]>([])
  const [fingerprintPoints, setFingerprintPoints] = useState<FingerprintPoint[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [dataSource, setDataSource] = useState('Loading source data')
  useEffect(() => {
    loadDashboard().then(({ data, source }) => {
      setDashboard(data)
      setDataSource(source)
    }).catch((error) => {
      console.error(error)
      setDataSource('Representative fallback')
    })
  }, [])
  useEffect(() => {
    Promise.all([loadCatalog(), loadFingerprintPoints(), loadAnalytics()]).then(([catalogData, pointData, analyticsData]) => {
      setCatalog(catalogData)
      setFingerprintPoints(pointData)
      setAnalytics(analyticsData)
    }).catch(console.error)
  }, [])
  const statements = dashboard?.featured || fallbackStatements
  const trend = dashboard?.trend || fallbackTrend
  const sectors = dashboard?.sectors || fallbackSectors
  const themes = dashboard?.themes || fallbackThemes
  const totals = dashboard?.totals
  const filtered = useMemo(() => statements.filter((item) =>
    `${item.title} ${item.organization} ${item.region}`.toLowerCase().includes(query.toLowerCase())
  ), [query, statements])

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">CEI</div><div><strong>Governance Atlas</strong><span>Evidence intelligence</span></div></div>
        <nav>{nav.map(({ label, icon: Icon }) => <button key={label} className={active === label ? 'active' : ''} onClick={() => setActive(label)}><Icon size={17} />{label}</button>)}</nav>
        <div className="sidebar-note"><Database size={17} /><div><strong>{dataSource}</strong><span>{totals ? `${totals.complete_metadata.toLocaleString()} complete · ${totals.fingerprint_only} pending` : 'Loading corpus'}</span></div><span className="live-dot" /></div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand">CEI Atlas</div>
          <div className="global-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search policies, organizations, concepts..." /><kbd>⌘ K</kbd></div>
          <button className="source-button"><Database size={16} /> Data sources <ChevronDown size={14} /></button>
        </header>

        <div className="content">
          {active === 'Overview' && <>
          <section className="hero-copy">
            <div><span className="eyebrow"><Sparkles size={14} /> AI governance intelligence</span><h1>See how the world<br /><em>governs AI.</em></h1><p>Explore the policies, principles, and institutional positions shaping responsible AI across sectors and regions.</p></div>
            <div className="snapshot"><span>Reconciled corpus snapshot</span><strong>{(totals?.statements || 1405).toLocaleString()} <small>statements</small></strong><div><span>{totals?.countries || 111} countries</span><span>{totals?.languages || 48} languages</span><span>{totals?.fingerprint_only || 229} metadata pending</span></div></div>
          </section>

          <section className="metric-grid">
            <Metric icon={FileText} label="Reconciled statements" value={(totals?.statements || 1405).toLocaleString()} note={`${totals?.complete_metadata || 1176} complete metadata records`} tone="violet" />
            <Metric icon={Globe2} label="Global coverage" value={String(totals?.countries || 111)} note="countries represented" tone="green" />
            <Metric icon={ShieldCheck} label="Legally binding" value={String(totals?.legally_binding || 61)} note="in focused statements release" tone="orange" />
            <Metric icon={Fingerprint} label="Policy families" value={String(totals?.policy_families || 6)} note={`silhouette score ${totals?.silhouette || 0.62}`} tone="blue" />
          </section>

          <section className="chart-grid">
            <div className="panel trend-panel">
              <PanelHead title="Governance activity" sub="Statements published by year" action="Explore timeline" />
              <ResponsiveContainer width="100%" height={245}><AreaChart data={trend}><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6d5dfc" stopOpacity={0.28}/><stop offset="100%" stopColor="#6d5dfc" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#eceaf1" /><XAxis dataKey="year" axisLine={false} tickLine={false} fontSize={11} /><YAxis hide /><Tooltip /><Area type="monotone" dataKey="statements" stroke="#6d5dfc" strokeWidth={2.5} fill="url(#fill)" /></AreaChart></ResponsiveContainer>
            </div>
            <div className="panel">
              <PanelHead title="Who is governing?" sub="Statements by sector" />
              <div className="sector-wrap"><ResponsiveContainer width="48%" height={210}><PieChart><Pie data={sectors} dataKey="value" innerRadius={58} outerRadius={82} paddingAngle={2}>{sectors.map((s) => <Cell key={s.name} fill={s.color || '#d8d6e3'} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="legend">{sectors.map(s => <div key={s.name}><i style={{ background: s.color || '#d8d6e3' }} /><span>{s.name}</span><strong>{s.value}</strong></div>)}</div></div>
            </div>
          </section>

          <section className="lower-grid">
            <div className="panel themes-panel">
              <PanelHead title="Most visible governance themes" sub="Share of scored statements with meaningful activation" />
              <ResponsiveContainer width="100%" height={235}><BarChart data={themes} layout="vertical" margin={{ left: 5, right: 25 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={105} fontSize={12} /><Tooltip /><Bar dataKey="value" fill="#6d5dfc" radius={[0, 5, 5, 0]} barSize={10} /></BarChart></ResponsiveContainer>
            </div>
            <div className="panel registry">
              <PanelHead title="Statement registry" sub={`${filtered.length} featured records · ${query ? 'filtered' : 'recent'}`} action="View all statements" />
              <div className="table-head"><span>Statement</span><span>Year</span><span>Binding</span><span /></div>
              {filtered.slice(0, 4).map(item => <button className="record" key={item.id} onClick={() => setSelected(item)}><span><strong>{item.title}</strong><small>{item.organization}</small></span><span>{yearLabel(item.year)}</span><span className={`pill ${item.binding === 'Legally binding' ? 'binding' : ''}`}>{item.binding}</span><ArrowUpRight size={15} /></button>)}
            </div>
          </section>

          <section className="provenance"><Activity size={16} /><span><strong>Data provenance:</strong> unified from the CEI statements dashboard, fingerprint explorer, ontology explorer, and taxonomy analyses.</span><button>Review methodology <ArrowUpRight size={14} /></button></section>
          </>}
          {active === 'Statements' && <StatementsPage catalog={catalog} query={query} onSelect={setSelected} />}
          {active === 'Fingerprints' && <FingerprintsPage points={fingerprintPoints} clusters={dashboard?.clusters || []} catalog={catalog} analytics={analytics?.fingerprint} onSelect={setSelected} />}
          {active === 'Ontology' && <OntologyPage themes={themes} analytics={analytics?.ontology} />}
        </div>
      </main>
      {selected && <Detail statement={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function PageTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></section>
}

function LegacyFingerprintsPage({ points, clusters }: { points: FingerprintPoint[]; clusters: DashboardData['clusters'] }) {
  return <><PageTitle eyebrow="Comparative analysis" title="Policy fingerprints" copy="Explore six policy families derived from weighted governance dimensions and latent semantic features." />
    <section className="cluster-grid">{clusters.map(cluster => <div className="cluster-card" key={cluster.name}><i style={{ background: cluster.color }} /><strong>{cluster.value}</strong><span>{cluster.name}</span></div>)}</section>
    <section className="panel fingerprint-map"><PanelHead title="UMAP policy landscape" sub={`${points.length.toLocaleString()} statements · colored by policy family`} />
      <ResponsiveContainer width="100%" height={520}><ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}><CartesianGrid stroke="#eeecf2" /><XAxis dataKey="x" type="number" hide /><YAxis dataKey="y" type="number" hide /><ZAxis range={[18, 18]} /><Tooltip cursor={{ strokeDasharray: '3 3' }} />
        {clusters.map((cluster, index) => <Scatter key={cluster.name} name={cluster.name} data={points.filter(point => point.cluster_number === index)} fill={cluster.color} fillOpacity={0.62} />)}
      </ScatterChart></ResponsiveContainer>
    </section></>
}

function LegacyOntologyPage({ themes }: { themes: { name: string; value: number }[] }) {
  return <><PageTitle eyebrow="Concept system" title="Governance ontology" copy="A concept-level view of the normative principles detected across the focused statements release." />
    <section className="ontology-grid">{themes.map(theme => <div className="ontology-card" key={theme.name}><div><BookOpen size={15} /><span>Ontology concept</span></div><h2>{theme.name}</h2><strong>{theme.value.toFixed(1)}</strong><small>mean corpus score</small><i><b style={{ width: `${Math.min(theme.value * 6, 100)}%` }} /></i></div>)}</section></>
}
void LegacyFingerprintsPage
void LegacyOntologyPage

function Facet({ label, value, options, onChange, allLabel = 'All' }: { label: string; value: string; options: string[]; onChange: (value: string) => void; allLabel?: string }) {
  return <label className="facet"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="">{allLabel}</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>
}

function StatementsPage({ catalog, query, onSelect }: { catalog: Statement[]; query: string; onSelect: (statement: Statement) => void }) {
  const [filters, setFilters] = useState({ region: '', type: '', binding: '', cluster: '', org: '' })
  const [sort, setSort] = useState('year')
  const [page, setPage] = useState(0)
  const values = (key: keyof Statement) => [...new Set(catalog.map(item => String(item[key] || '')).filter(Boolean))].sort()
  const matches = catalog.filter(item => `${item.title} ${item.organization} ${item.abstract || ''}`.toLowerCase().includes(query.toLowerCase())
    && (!filters.region || item.region === filters.region) && (!filters.type || item.type === filters.type)
    && (!filters.binding || item.binding === filters.binding) && (!filters.cluster || item.cluster === filters.cluster)
    && (!filters.org || item.organization_type === filters.org))
    .sort((a, b) => sort === 'year' ? (b.year || 0) - (a.year || 0) : String(a[sort as 'title' | 'organization']).localeCompare(String(b[sort as 'title' | 'organization'])))
  const pages = Math.max(1, Math.ceil(matches.length / 25))
  const setFilter = (key: keyof typeof filters, value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(0) }
  return <><PageTitle eyebrow="Evidence registry" title="Governance statements" copy="Filter, sort, search, and inspect the complete reconciled statement registry." />
    <section className="filter-panel"><div className="facet-grid">
      <Facet label="Region" value={filters.region} options={values('region')} onChange={value => setFilter('region', value)} />
      <Facet label="Organization type" value={filters.org} options={values('organization_type')} onChange={value => setFilter('org', value)} />
      <Facet label="Instrument" value={filters.type} options={values('type')} onChange={value => setFilter('type', value)} />
      <Facet label="Binding nature" value={filters.binding} options={values('binding')} onChange={value => setFilter('binding', value)} />
      <Facet label="Policy family" value={filters.cluster} options={values('cluster')} onChange={value => setFilter('cluster', value)} />
      <Facet label="Sort by" value={sort} options={['year', 'title', 'organization']} allLabel="Choose" onChange={setSort} />
    </div>{Object.values(filters).some(Boolean) && <button className="clear-filters" onClick={() => setFilters({ region: '', type: '', binding: '', cluster: '', org: '' })}><X size={13} /> Clear filters</button>}</section>
    <div className="registry-summary"><strong>{matches.length.toLocaleString()}</strong><span>matching records</span><i /><span>{catalog.filter(item => item.metadata_status === 'Pending').length} metadata pending</span><span className="page-status">Page {page + 1} of {pages}</span></div>
    <section className="panel full-registry"><div className="catalog-head"><span>Statement</span><span>Region</span><span>Policy family</span><span>Year</span><span>Status</span><span /></div>{matches.slice(page * 25, page * 25 + 25).map(item => <button className="catalog-row" key={item.id} onClick={() => onSelect(item)}><span><strong>{item.title}</strong><small>{item.organization} · {item.organization_type}</small></span><span>{item.region}</span><span>{item.cluster}</span><span>{yearLabel(item.year)}</span><span className={`pill ${item.metadata_status === 'Pending' ? 'pending' : ''}`}>{item.metadata_status}</span><ArrowUpRight size={14} /></button>)}</section>
    <div className="pagination"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>{page + 1} / {pages}</span><button disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button></div></>
}

function ExplorerTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return <div className="explorer-tabs">{tabs.map(tab => <button key={tab} className={active === tab ? 'active' : ''} onClick={() => onChange(tab)}>{tab}</button>)}</div>
}

function ChartPanel({ title, children }: { title: string; children: React.ReactElement }) {
  return <div className="panel"><PanelHead title={title} sub="Source analysis artifact" /><ResponsiveContainer width="100%" height={320}>{children}</ResponsiveContainer></div>
}

function FingerprintsPage({ points, clusters, catalog, analytics, onSelect }: { points: FingerprintPoint[]; clusters: DashboardData['clusters']; catalog: Statement[]; analytics?: FingerprintAnalytics; onSelect: (statement: Statement) => void }) {
  const [tab, setTab] = useState('Landscape')
  const [family, setFamily] = useState('')
  const [dimQuery, setDimQuery] = useState('')
  const catalogById = useMemo(() => new Map(catalog.map(item => [item.id, item])), [catalog])
  const visible = family ? points.filter(point => point.cluster === family) : points
  const dims = (analytics?.dimensions || []).filter(item => `${item.f} ${item.d} ${item.l}`.toLowerCase().includes(dimQuery.toLowerCase()))
  const temporal = analytics?.temporal.years.map((year, i) => ({ year, statements: analytics.temporal.counts[i], ...Object.fromEntries(analytics.temporal.clusterTimeSeries.map(series => [series.name, series.data[i]])) })) || []
  return <><PageTitle eyebrow="Comparative analysis" title="Policy fingerprints" copy="Explore the schema, policy families, UMAP landscape, temporal shifts, and clustering method." /><ExplorerTabs tabs={['Landscape', 'Clusters', 'Dimensions', 'Temporal', 'Methodology']} active={tab} onChange={setTab} />
    {tab === 'Landscape' && <><section className="filter-panel"><Facet label="Policy family" value={family} options={clusters.map(item => item.name)} onChange={setFamily} /></section><section className="cluster-grid">{clusters.map(cluster => <button className="cluster-card" key={cluster.name} onClick={() => setFamily(family === cluster.name ? '' : cluster.name)}><i style={{ background: cluster.color }} /><strong>{cluster.value}</strong><span>{cluster.name}</span></button>)}</section><section className="panel fingerprint-map"><PanelHead title="UMAP policy landscape" sub={`${visible.length.toLocaleString()} statements · select a point for evidence details`} /><ResponsiveContainer width="100%" height={520}><ScatterChart><XAxis dataKey="x" type="number" hide /><YAxis dataKey="y" type="number" hide /><ZAxis range={[22, 22]} /><Tooltip />{clusters.map((cluster, index) => <Scatter key={cluster.name} name={cluster.name} data={visible.filter(point => point.cluster_number === index)} fill={cluster.color} fillOpacity={0.68} onClick={point => { const item = catalogById.get(String((point as unknown as FingerprintPoint).id)); if (item) onSelect(item) }} />)}</ScatterChart></ResponsiveContainer></section></>}
    {tab === 'Clusters' && <><section className="metric-grid"><Metric icon={Fingerprint} label="Optimal families" value={String(analytics?.meta.optimalK || 6)} note="selected by silhouette" tone="violet" /><Metric icon={Activity} label="Silhouette" value={String(analytics?.meta.silhouetteV2 || .62)} note="weighted fingerprint" tone="green" /><Metric icon={Database} label="Dimensions retained" value={String(analytics?.meta.nRetained || 159)} note="interpretable dimensions" tone="orange" /><Metric icon={FileText} label="Mapped statements" value={points.length.toLocaleString()} note="fingerprint corpus" tone="blue" /></section><section className="chart-grid"><ChartPanel title="Cluster quality sweep"><LineChart data={analytics?.silhouettes.kValues.map((k, i) => ({ k: `k=${k}`, weighted: analytics.silhouettes.v2[i], baseline: analytics.silhouettes.v1[i] })) || []}><CartesianGrid vertical={false} /><XAxis dataKey="k" /><YAxis /><Tooltip /><Legend /><Line dataKey="weighted" stroke="#6d5dfc" /><Line dataKey="baseline" stroke="#aaa5b8" /></LineChart></ChartPanel><ChartPanel title="Family distribution"><PieChart><Pie data={clusters} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>{clusters.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /><Legend /></PieChart></ChartPanel></section><section className="signature-grid">{(analytics?.clusters.k6.signatures || []).map(sig => <div className="panel signature" key={sig.label}><h3>{sig.label}</h3><span>{sig.count} statements</span>{sig.top5.map(item => <div key={item.f}><small>{item.f.replaceAll('_', ' ')}</small><strong>{item.v}</strong></div>)}</div>)}</section></>}
    {tab === 'Dimensions' && <><section className="filter-panel"><label className="facet grow"><span>Search dimensions</span><input value={dimQuery} onChange={event => setDimQuery(event.target.value)} placeholder="Search field, layer, or definition" /></label></section><section className="panel dimension-table"><div className="dimension-row head"><span>Dimension</span><span>Layer</span><span>Retained</span><span>Weight</span><span>Std. dev.</span></div>{dims.slice(0, 120).map(item => <details key={item.f}><summary className="dimension-row"><strong>{item.f.replace(/^fp_/, '').replaceAll('_', ' ')}</strong><span>{item.l}</span><span>{item.r ? 'Yes' : 'No'}</span><span>{item.w?.toFixed(4)}</span><span>{item.s?.toFixed(3)}</span></summary><p>{item.d}</p></details>)}</section></>}
    {tab === 'Temporal' && <section className="chart-grid"><ChartPanel title="Fingerprint volume"><AreaChart data={temporal}><XAxis dataKey="year" /><YAxis /><Tooltip /><Area dataKey="statements" stroke="#6d5dfc" fill="#ddd8ff" /></AreaChart></ChartPanel><ChartPanel title="Policy family adoption"><LineChart data={temporal}><XAxis dataKey="year" /><YAxis /><Tooltip /><Legend />{analytics?.temporal.clusterTimeSeries.map(series => <Line key={series.name} dataKey={series.name} stroke={series.color} dot={false} />)}</LineChart></ChartPanel></section>}
    {tab === 'Methodology' && <section className="method-grid">{[['1. Sparse fingerprint', `${analytics?.meta.nDimsV1 || 374} governance dimensions score each statement.`], ['2. Feature selection', `${analytics?.meta.nRetained || 159} dimensions retain the strongest signal.`], ['3. Semantic blend', 'A 10% latent semantic component improves separation.'], ['4. Clustering and UMAP', 'k-means selects six families and UMAP projects the landscape.']].map(item => <div className="panel" key={item[0]}><h2>{item[0]}</h2><p>{item[1]}</p></div>)}</section>}
  </>
}

function OntologyPage({ themes, analytics }: { themes: { name: string; value: number }[]; analytics?: OntologyAnalytics }) {
  const [tab, setTab] = useState('Concepts')
  const [group, setGroup] = useState('org_type')
  const [matrix, setMatrix] = useState<'correlation' | 'coactivation'>('correlation')
  const [concept, setConcept] = useState('')
  const leaves = (analytics?.leaf_stats || []).filter(item => !concept || item.l3_parent === concept)
  const conceptOptions = [...new Map((analytics?.leaf_stats || []).map(item => [item.l3_parent, item.l3_label])).entries()]
  const temporal = analytics?.temporal.years.map((year, i) => ({ year, ...Object.fromEntries(analytics.temporal.fields.map(field => [field, analytics.temporal.series[field][i]])) })) || []
  const relations = analytics?.ontology?.relationships_table || []
  return <><PageTitle eyebrow="Concept system" title="Governance ontology" copy="Explore concepts, cross-dimensional patterns, typed relationships, and temporal adoption." /><ExplorerTabs tabs={['Concepts', 'Crosswalk', 'Co-occurrence', 'Relationships', 'Temporal', 'Deep dive']} active={tab} onChange={setTab} />
    {tab === 'Concepts' && <section className="ontology-grid">{themes.map(theme => <div className="ontology-card" key={theme.name}><div><BookOpen size={15} /><span>Normative concept</span></div><h2>{theme.name}</h2><strong>{theme.value.toFixed(1)}</strong><small>mean corpus score</small><i><b style={{ width: `${Math.min(theme.value, 100)}%` }} /></i></div>)}</section>}
    {tab === 'Crosswalk' && <><section className="filter-panel"><Facet label="Compare by" value={group} allLabel="Choose" options={['org_type', 'region', 'year', 'binding_nature']} onChange={setGroup} /></section><Heatmap labels={analytics?.l2_labels || []} rows={analytics?.heatmaps[group]?.rows || []} matrix={analytics?.heatmaps[group]?.matrix || []} /></>}
    {tab === 'Co-occurrence' && <><section className="filter-panel"><Facet label="Matrix" value={matrix} allLabel="Choose" options={['correlation', 'coactivation']} onChange={value => setMatrix(value as typeof matrix)} /></section><Heatmap labels={analytics?.l2_labels || []} rows={analytics?.l2_labels || []} matrix={analytics?.[matrix] || []} compact /></>}
    {tab === 'Relationships' && <section className="panel relationship-list"><PanelHead title="Cross-cutting relationship network" sub={`${analytics?.network.nodes.length || 0} concepts · ${relations.length} typed relationships`} />{relations.map((item, i) => <div className="relationship-row" key={`${item.source}-${item.target}-${i}`}><strong>{item.source_label}</strong><span>{item.type.replaceAll('_', ' ')}</span><strong>{item.target_label}</strong><small>{item.condition || ''}</small></div>)}</section>}
    {tab === 'Temporal' && <section className="panel"><PanelHead title="Temporal concept adoption" sub="Mean ontology scores by publication year" /><ResponsiveContainer width="100%" height={520}><LineChart data={temporal}><CartesianGrid vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip /><Legend />{analytics?.temporal.fields.map((field, i) => <Line key={field} dataKey={field} name={analytics.temporal.labels[i]} stroke={['#6d5dfc','#12b886','#228be6','#f59f00','#d6336c','#15aabf','#e8590c','#868e96'][i]} dot={false} />)}</LineChart></ResponsiveContainer></section>}
    {tab === 'Deep dive' && <><section className="filter-panel"><Facet label="Concept family" value={concept} options={conceptOptions.map(item => item[0])} onChange={setConcept} /></section><section className="panel leaf-list"><div className="leaf-row head"><span>Concept</span><span>Parent</span><span>Mean</span><span>Activated</span><span>Strong</span></div>{leaves.sort((a, b) => b.mean_score - a.mean_score).map(item => <div className="leaf-row" key={item.id}><strong>{item.label}</strong><span>{item.l3_label}</span><span>{item.mean_score.toFixed(1)}</span><span>{item.activated}</span><span>{item.strong}</span></div>)}</section></>}
  </>
}

function Heatmap({ labels, rows, matrix, compact = false }: { labels: string[]; rows: (string | number)[]; matrix: number[][]; compact?: boolean }) {
  const flat = matrix.flat(), min = Math.min(...flat, 0), max = Math.max(...flat, 1)
  const color = (value: number) => `hsl(${260 - ((value - min) / (max - min || 1)) * 115} 65% ${94 - ((value - min) / (max - min || 1)) * 48}%)`
  return <section className={`panel heatmap-scroll ${compact ? 'compact' : ''}`}><div className="heatmap-table" style={{ gridTemplateColumns: `150px repeat(${labels.length}, minmax(${compact ? 35 : 48}px, 1fr))` }}><span />{labels.map(label => <strong className="heatmap-col" key={label}>{label}</strong>)}{rows.flatMap((row, ri) => [<strong className="heatmap-row" key={`r-${row}`}>{String(row).replaceAll('_', ' ')}</strong>, ...labels.map((label, ci) => <span className="heat-cell" key={`${row}-${label}`} style={{ background: color(matrix[ri]?.[ci] || 0) }} title={`${row} × ${label}: ${matrix[ri]?.[ci] ?? 0}`}>{compact ? '' : matrix[ri]?.[ci]?.toFixed(1)}</span>)])}</div></section>
}

function Metric({ icon: Icon, label, value, note, tone }: { icon: typeof FileText; label: string; value: string; note: string; tone: string }) {
  return <div className="metric"><div className={`metric-icon ${tone}`}><Icon size={18} /></div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
}

function PanelHead({ title, sub, action }: { title: string; sub: string; action?: string }) {
  return <div className="panel-head"><div><h2>{title}</h2><p>{sub}</p></div>{action && <button>{action} <ArrowUpRight size={14} /></button>}</div>
}

function Detail({ statement, onClose }: { statement: Statement; onClose: () => void }) {
  return <div className="overlay" onClick={onClose}><aside className="detail" onClick={e => e.stopPropagation()}><button className="close" onClick={onClose}>×</button><span className="eyebrow">{statement.id} · {yearLabel(statement.year)}</span><h2>{statement.title}</h2><p className="org">{statement.organization}</p><div className="detail-meta"><div><span>Region</span><strong>{statement.region}</strong></div><div><span>Instrument</span><strong>{statement.type}</strong></div><div><span>Binding nature</span><strong>{statement.binding}</strong></div><div><span>Policy family</span><strong>{statement.cluster}</strong></div></div><h3>Governance fingerprint</h3><p className="explain">Strongest taxonomy dimensions detected in this statement.</p>{statement.scores.map(s => <div className="score" key={s.label}><div><span>{s.label}</span><strong>{s.value}</strong></div><div><i style={{ width: `${s.value * 1.8}%`, background: s.color }} /></div></div>)}<button className="primary">Open full statement <ArrowUpRight size={15} /></button></aside></div>
}

export default App
