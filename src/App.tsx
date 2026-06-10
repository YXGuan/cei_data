import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowUpRight, BookOpen, ChevronDown, Database, FileText,
  Fingerprint, Globe2, LayoutDashboard, Search, ShieldCheck, Sparkles,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import './App.css'
import { loadCatalog, loadDashboard, loadFingerprintPoints, type DashboardData, type FingerprintPoint, type Statement } from './lib/data'

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
    Promise.all([loadCatalog(), loadFingerprintPoints()]).then(([catalogData, pointData]) => {
      setCatalog(catalogData)
      setFingerprintPoints(pointData)
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
          {active === 'Fingerprints' && <FingerprintsPage points={fingerprintPoints} clusters={dashboard?.clusters || []} />}
          {active === 'Ontology' && <OntologyPage themes={themes} />}
        </div>
      </main>
      {selected && <Detail statement={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function PageTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></section>
}

function StatementsPage({ catalog, query, onSelect }: { catalog: Statement[]; query: string; onSelect: (statement: Statement) => void }) {
  const matches = catalog.filter((item) => `${item.title} ${item.organization} ${item.region} ${item.cluster}`.toLowerCase().includes(query.toLowerCase()))
  return <><PageTitle eyebrow="Evidence registry" title="Governance statements" copy="Search the reconciled registry and inspect the evidence behind each governance fingerprint." />
    <div className="registry-summary"><strong>{matches.length.toLocaleString()}</strong><span>matching records</span><i /><span>{catalog.filter(item => item.metadata_status === 'Pending').length} metadata pending</span></div>
    <section className="panel full-registry"><div className="catalog-head"><span>Statement</span><span>Region</span><span>Policy family</span><span>Year</span><span>Status</span><span /></div>
      {matches.slice(0, 100).map(item => <button className="catalog-row" key={item.id} onClick={() => onSelect(item)}><span><strong>{item.title}</strong><small>{item.organization}</small></span><span>{item.region}</span><span>{item.cluster}</span><span>{yearLabel(item.year)}</span><span className={`pill ${item.metadata_status === 'Pending' ? 'pending' : ''}`}>{item.metadata_status}</span><ArrowUpRight size={14} /></button>)}
    </section></>
}

function FingerprintsPage({ points, clusters }: { points: FingerprintPoint[]; clusters: DashboardData['clusters'] }) {
  return <><PageTitle eyebrow="Comparative analysis" title="Policy fingerprints" copy="Explore six policy families derived from weighted governance dimensions and latent semantic features." />
    <section className="cluster-grid">{clusters.map(cluster => <div className="cluster-card" key={cluster.name}><i style={{ background: cluster.color }} /><strong>{cluster.value}</strong><span>{cluster.name}</span></div>)}</section>
    <section className="panel fingerprint-map"><PanelHead title="UMAP policy landscape" sub={`${points.length.toLocaleString()} statements · colored by policy family`} />
      <ResponsiveContainer width="100%" height={520}><ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}><CartesianGrid stroke="#eeecf2" /><XAxis dataKey="x" type="number" hide /><YAxis dataKey="y" type="number" hide /><ZAxis range={[18, 18]} /><Tooltip cursor={{ strokeDasharray: '3 3' }} />
        {clusters.map((cluster, index) => <Scatter key={cluster.name} name={cluster.name} data={points.filter(point => point.cluster_number === index)} fill={cluster.color} fillOpacity={0.62} />)}
      </ScatterChart></ResponsiveContainer>
    </section></>
}

function OntologyPage({ themes }: { themes: { name: string; value: number }[] }) {
  return <><PageTitle eyebrow="Concept system" title="Governance ontology" copy="A concept-level view of the normative principles detected across the focused statements release." />
    <section className="ontology-grid">{themes.map(theme => <div className="ontology-card" key={theme.name}><div><BookOpen size={15} /><span>Ontology concept</span></div><h2>{theme.name}</h2><strong>{theme.value.toFixed(1)}</strong><small>mean corpus score</small><i><b style={{ width: `${Math.min(theme.value * 6, 100)}%` }} /></i></div>)}</section></>
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
