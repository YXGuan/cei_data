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

export type EvidenceGranularity = 'sentence' | 'bullet' | 'clause' | 'paragraph' | 'table_row'

export type EvidenceKind = 'metadata' | 'abstract' | 'source_text' | 'concept_scores'

export type EvidenceUnit = {
  id: string
  statement_id: string
  title: string
  organization: string
  year: number | null
  region: string
  type: string
  binding: string
  source_url?: string | null
  section_path: string[]
  parent_id?: string | null
  evidence_kind: EvidenceKind
  granularity: EvidenceGranularity
  chunk_text: string
  expanded_context: string
  char_start?: number | null
  char_end?: number | null
  token_count: number
  content_hash: string
  metadata: Record<string, unknown>
}

export type RetrievedEvidenceUnit = EvidenceUnit & {
  score: number
  score_breakdown: Record<string, number>
}

export type RetrievalSearch = {
  items: RetrievedEvidenceUnit[]
  total: number
  source: 'Supabase' | 'Prepared evidence snapshot'
}

export type SourceStatus = 'proposed' | 'under_review' | 'approved' | 'included' | 'rejected'

export type PopularitySignalProvider =
  | 'github'
  | 'huggingface'
  | 'openalex'
  | 'semanticscholar'
  | 'datacite'
  | 'zenodo'
  | 'kaggle'

export type PopularitySignalMetric =
  | 'stars'
  | 'forks'
  | 'subscribers'
  | 'downloads'
  | 'views'
  | 'citations'
  | 'influential_citations'
  | 'likes'
  | 'unique_views'
  | 'unique_downloads'

export type IndexingStatusValue =
  | 'not_found'
  | 'source_candidate_only'
  | 'partially_indexed'
  | 'indexed_as_records'
  | 'indexed_as_source_release'

export type RecommendedAction =
  | 'monitor_only'
  | 'source_registry_only'
  | 'index_metadata'
  | 'index_records'
  | 'index_full_text'

export type ReviewStatus = 'needs_review' | 'in_progress' | 'approved' | 'blocked' | 'not_applicable'

export type ExternalSourceIdentifier = {
  identifier_type: string
  identifier_value: string
  url?: string | null
}

export type ExternalSourceCheck = {
  provider: string
  checked_at?: string | null
  ok: boolean
  http_status?: number | null
  resolved_url?: string | null
  content_type?: string | null
  last_modified?: string | null
  page_title?: string | null
  meta_description?: string | null
}

export type PopularitySignal = {
  source_id: string
  provider: PopularitySignalProvider
  metric: PopularitySignalMetric
  value: number
  observed_at: string
  url: string
  raw_payload?: unknown
}

export type IndexingStatus = {
  source_id: string
  indexing_status: IndexingStatusValue
  matched_statement_ids: string[]
  matched_statement_count: number
  partial_statement_ids?: string[]
  partial_statement_count?: number
  evidence: string[]
  checked_at?: string | null
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
  canonical_url?: string
  source_type?: string
  coverage: string | null
  formats: string[]
  status: SourceStatus
  created_at: string
  vote_count: number
  user_voted: boolean
  aliases?: string[]
  identifiers?: ExternalSourceIdentifier[]
  checks?: ExternalSourceCheck[]
  popularity_signals?: PopularitySignal[]
  indexing_status?: IndexingStatus
  latest_observed_at?: string | null
  license_review_status?: ReviewStatus
  dedupe_review_status?: ReviewStatus
  recommended_action?: RecommendedAction
  assigned_reviewer?: string | null
  admin_notes?: string | null
  reviewed_at?: string | null
  metadata?: SourceRequestMetadata
}

export type ExternalSource = SourceRequest & {
  canonical_url: string
  source_type: string
  aliases: string[]
  identifiers: ExternalSourceIdentifier[]
  checks: ExternalSourceCheck[]
  popularity_signals: PopularitySignal[]
  indexing_status: IndexingStatus
  latest_observed_at: string | null
  license_review_status: ReviewStatus
  dedupe_review_status: ReviewStatus
  recommended_action: RecommendedAction
}
