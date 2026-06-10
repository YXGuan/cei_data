import { supabase } from './supabase'

export type Score = { label: string; value: number; color?: string }
export type Statement = {
  id: string
  title: string
  organization: string
  year: number | null
  region: string
  type: string
  binding: string
  cluster: string
  scores: Score[]
  metadata_status?: string
  organization_type?: string
  organization_subtype?: string
  geographic_scope?: string
  country_code?: string | null
  language_code?: string | null
  source_url?: string | null
  abstract?: string | null
  word_count?: number | null
}
export type FingerprintPoint = { id: string; cluster: string; cluster_number: number; x: number; y: number }
export type FingerprintAnalytics = {
  meta: Record<string, number>
  silhouettes: { kValues: number[]; v1: number[]; v2: number[] }
  blendSweep: Record<string, number>
  layers: { id: string; name: string; color: string; total: number; retained: number; retPct: number; mean: number }[]
  layerCorr: { ids: string[]; matrix: number[][] }
  dimensions: { f: string; d: string; l: string; r: boolean; w: number; s: number }[]
  clusters: Record<string, { donut: { name: string; value: number; itemStyle: { color: string } }[]; signatures: { label: string; count: number; top5: { f: string; v: number }[] }[] }>
  temporal: {
    years: number[]; counts: number[]; cumulative: number[]; driftYears: number[]; driftValues: number[]
    clusterTimeSeries: { name: string; data: number[]; color: string }[]
  }
  robustness?: Record<string, unknown>
}
export type OntologyAnalytics = {
  l2_labels: string[]
  heatmaps: Record<string, { rows: (string | number)[]; matrix: number[][] }>
  correlation: number[][]
  coactivation: number[][]
  temporal: { years: number[]; fields: string[]; labels: string[]; series: Record<string, number[]> }
  network: {
    nodes: { id: string; name: string; category: number; symbolSize: number; level: number }[]
    edges: { source: string; target: string; relType: string; condition?: string }[]
  }
  ontology?: { relationships_table?: { source: string; source_label: string; target: string; target_label: string; type: string; condition?: string }[] }
  leaf_stats?: { id: string; label: string; l2_parent: string; l2_label: string; l3_parent: string; l3_label: string; mean_score: number; strong: number; activated: number }[]
  supplementary?: Record<string, unknown>
}
export type AnalyticsData = { fingerprint: FingerprintAnalytics; ontology: OntologyAnalytics }
export type DashboardData = {
  generated: string
  totals: {
    statements: number
    complete_metadata: number
    fingerprint_only: number
    countries: number
    organizations: number
    languages: number
    legally_binding: number
    policy_families: number
    silhouette: number
  }
  trend: { year: string; statements: number }[]
  sectors: { name: string; value: number; color?: string }[]
  clusters: { name: string; value: number; color: string }[]
  themes: { name: string; value: number }[]
  featured: Statement[]
}

const colors = ['#6d5dfc', '#12b886', '#228be6', '#f59f00', '#d8d6e3', '#d6336c']
const titleCase = (value?: string | null) => (value || 'Unknown').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
// Supabase view rows are normalized into the strict Statement contract below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapStatement = (row: Record<string, any>): Statement => ({
  id: row.statement_key, title: row.title, organization: row.organization || 'Unknown organization',
  year: row.publication_year, region: row.region || 'Unknown', type: titleCase(row.statement_type),
  binding: titleCase(row.binding_nature), cluster: row.cluster_label || 'Not fingerprinted',
  metadata_status: row.lifecycle_status === 'metadata_pending' ? 'Pending' : 'Complete',
  organization_type: titleCase(row.organization_type), organization_subtype: titleCase(row.organization_subtype),
  geographic_scope: titleCase(row.geographic_scope), country_code: row.country_code,
  language_code: row.language_code, source_url: row.source_url, abstract: row.abstract, word_count: row.word_count,
  scores: (row.top_scores || []).map((score: { label: string; score: number; color?: string }, index: number) => ({
    label: score.label, value: Number(score.score), color: score.color || colors[index],
  })),
})

export async function loadDashboard(): Promise<{ data: DashboardData; source: 'Supabase' | 'Source snapshot' }> {
  const snapshot = await fetch('/data/dashboard.json').then((response) => {
    if (!response.ok) throw new Error('Prepared dashboard snapshot is missing. Run npm run data:prepare.')
    return response.json() as Promise<DashboardData>
  })
  snapshot.sectors = snapshot.sectors.slice(0, 5).map((sector, index) => ({ ...sector, color: colors[index] }))
  snapshot.featured = snapshot.featured.map((item) => ({
    ...item,
    scores: item.scores.map((score, index) => ({ ...score, color: colors[index] })),
  }))
  if (!supabase) return { data: snapshot, source: 'Source snapshot' }

  const [summaryResult, statementsResult] = await Promise.all([
    supabase.rpc('dashboard_summary'),
    supabase.from('statement_explorer').select('*').order('publication_year', { ascending: false }).limit(30),
  ])
  if (summaryResult.error || statementsResult.error) {
    console.warn('Supabase is configured but dashboard queries failed; using prepared snapshot.', summaryResult.error || statementsResult.error)
    return { data: snapshot, source: 'Source snapshot' }
  }
  const summary = summaryResult.data as Record<string, number>
  const featured = statementsResult.data.map((row) => ({
    id: row.statement_key,
    title: row.title,
    organization: row.organization || 'Unknown organization',
    year: row.publication_year,
    region: row.region || 'Unknown',
    type: titleCase(row.statement_type),
    binding: titleCase(row.binding_nature),
    cluster: row.cluster_label || 'Not fingerprinted',
    scores: (row.top_scores || []).map((score: { label: string; score: number; color?: string }, index: number) => ({
      label: score.label, value: Number(score.score), color: score.color || colors[index],
    })),
  }))
  return {
    source: 'Supabase',
    data: {
      ...snapshot,
      totals: {
        ...snapshot.totals,
        statements: summary.statements,
        countries: summary.countries,
        organizations: summary.organizations,
        languages: summary.languages,
        legally_binding: summary.legally_binding,
        fingerprint_only: summary.metadata_pending,
        complete_metadata: summary.statements - summary.metadata_pending,
      },
      featured,
    },
  }
}

export async function loadCatalog(): Promise<Statement[]> {
  if (!supabase) return fetch('/data/statements.json').then((response) => response.json())
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('statement_explorer').select('*').order('publication_year', { ascending: false }).range(from, from + 999)
    if (error) return fetch('/data/statements.json').then((response) => response.json())
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows.map(mapStatement)
}

export async function loadAnalytics(): Promise<AnalyticsData> {
  const fallback = () => fetch('/data/analytics.json').then((response) => response.json() as Promise<AnalyticsData>)
  if (!supabase) return fallback()
  const { data, error } = await supabase.from('dataset_artifacts')
    .select('artifact_key,payload,dataset_releases!inner(slug)')
    .in('dataset_releases.slug', ['fingerprints-2026-03-15', 'ontology-ont3'])
  if (error || !data?.length) return fallback()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bySlug = Object.fromEntries(data.map((row: any) => [row.dataset_releases.slug, row.payload]))
  const fp = bySlug['fingerprints-2026-03-15']
  const ont = bySlug['ontology-ont3']
  if (!fp || !ont) return fallback()
  return {
    fingerprint: {
      meta: fp.meta, silhouettes: fp.silhouettes, blendSweep: fp.blendSweep, layers: fp.layers,
      layerCorr: fp.layerCorr, dimensions: fp.dimensions, clusters: fp.clusters, temporal: fp.temporal,
      robustness: fp.robustness,
    },
    ontology: {
      l2_labels: ont.l2_labels, heatmaps: ont.heatmaps, correlation: ont.correlation,
      coactivation: ont.coactivation, temporal: ont.temporal, network: ont.network,
      ontology: ont.ontology, leaf_stats: ont.leaf_stats, supplementary: ont.supplementary,
    },
  }
}

export async function loadFingerprintPoints(): Promise<FingerprintPoint[]> {
  if (!supabase) return fetch('/data/fingerprints.json').then((response) => response.json())
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('latest_statement_fingerprints').select('statement_id,cluster_label,cluster_number,umap_x,umap_y').range(from, from + 999)
    if (error) return fetch('/data/fingerprints.json').then((response) => response.json())
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows.map((row) => ({ id: row.statement_id, cluster: row.cluster_label, cluster_number: row.cluster_number, x: row.umap_x, y: row.umap_y }))
}
