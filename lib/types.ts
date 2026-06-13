export type Score = {
  label: string
  value: number
  color?: string
}

export type CatalogRecord = {
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

export type CatalogFacets = {
  regions: string[]
  types: string[]
  bindings: string[]
  organizationTypes: string[]
  clusters: string[]
}

export type CatalogSearch = {
  items: CatalogRecord[]
  total: number
  source: 'Supabase' | 'Prepared snapshot'
}

export type SourceRequest = {
  id: string
  title: string
  publisher: string | null
  description: string
  source_url: string
  coverage: string | null
  formats: string[]
  status: 'proposed' | 'under_review' | 'approved' | 'included' | 'rejected'
  created_at: string
  vote_count: number
  user_voted: boolean
}
