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

export type SourceRequestMetadata = {
  source_kind?: string
  update_cadence?: string
  license_status?: string
  import_complexity?: 'low' | 'medium' | 'high' | string
  priority?: 'low' | 'medium' | 'high' | string
  review_checks?: string[]
  known_gaps?: string[]
  metadata_quality_score?: number
  quality_flags?: string[]
  live?: {
    checked_at?: string
    ok?: boolean
    http_status?: number | null
    resolved_url?: string | null
    content_type?: string | null
    last_modified?: string | null
    page_title?: string | null
    meta_description?: string | null
    error?: string
  }
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
  metadata?: SourceRequestMetadata
}
