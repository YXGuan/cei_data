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
}
export type FingerprintPoint = { id: string; cluster: string; cluster_number: number; x: number; y: number }
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
  return rows.map((row) => ({
    id: row.statement_key, title: row.title, organization: row.organization || 'Unknown organization',
    year: row.publication_year, region: row.region || 'Unknown', type: titleCase(row.statement_type),
    binding: titleCase(row.binding_nature), cluster: row.cluster_label || 'Not fingerprinted',
    metadata_status: row.lifecycle_status === 'metadata_pending' ? 'Pending' : 'Complete',
    scores: (row.top_scores || []).map((score: { label: string; score: number; color?: string }, index: number) => ({
      label: score.label, value: Number(score.score), color: score.color || colors[index],
    })),
  }))
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
