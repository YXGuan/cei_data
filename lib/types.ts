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
export type WisdomTag =
  | 'Human Dignity'
  | 'Power Constraints'
  | 'Deception'
  | 'Stewardship'
  | 'Justice'
  | 'Wisdom'

export type PersonaKey = 'builder' | 'legal_compliance' | 'ministry_civil_society'
export type PersonaRelevance = Record<PersonaKey, 'low' | 'medium' | 'high'>
export type ConfidenceRating = 'High Direct' | 'Inferred' | 'Contested'

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
  category?: string
  url_status?: string
  notes?: string
  wisdom_tags?: WisdomTag[]
  persona_relevance?: Partial<PersonaRelevance>
  core_constraint?: string
  required_control?: string
  evidence_standard?: string
  confidence_rating?: ConfidenceRating
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
  category?: string
  url_status?: string
  notes?: string
  wisdom_tags?: WisdomTag[]
  persona_relevance?: PersonaRelevance
  core_constraint?: string
  required_control?: string
  evidence_standard?: string
  confidence_rating?: ConfidenceRating
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
  category: string
  url_status: string
  notes: string
  wisdom_tags: WisdomTag[]
  persona_relevance: PersonaRelevance
  core_constraint: string
  required_control: string
  evidence_standard: string
  confidence_rating: ConfidenceRating
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
