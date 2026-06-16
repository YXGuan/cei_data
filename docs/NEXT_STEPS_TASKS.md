# Next Steps Tasks

Objective: make the product a durable AI governance source registry with external popularity
signals, clear indexing status, and selective deeper ingestion.

## Phase 1: Source Registry Foundation

- [x] Create a structured source registry model.
  - Replace loose `source_requests.metadata` usage with explicit source fields where possible.
  - Keep `metadata` for provider-specific raw details and temporary enrichment data.
- [x] Add Supabase tables:
  - `external_sources`
  - `external_source_identifiers`
  - `external_source_checks`
  - `external_source_popularity_signals`
  - `external_source_indexing_status`
- [x] Add TypeScript types for:
  - `ExternalSource`
  - `ExternalSourceIdentifier`
  - `ExternalSourceCheck`
  - `PopularitySignal`
  - `IndexingStatus`
- [x] Migrate existing `source_requests` seed data into the new registry shape.
- [x] Preserve compatibility with the existing `/sources` page while the schema changes.

Acceptance criteria:

- `npm run build` passes.
- Existing source cards still render.
- Each source has a canonical URL, publisher, coverage, formats, status, and review metadata.

## Phase 2: Popularity Signal Collection

- [x] Add `npm run data:signals`.
- [x] Create `scripts/collect-source-signals.mjs`.
- [x] Create provider modules:
  - `scripts/lib/providers/github.mjs`
  - `scripts/lib/providers/huggingface.mjs`
  - `scripts/lib/providers/openalex.mjs`
  - `scripts/lib/providers/semanticscholar.mjs`
  - `scripts/lib/providers/datacite.mjs`
- [x] Create identifier extraction helpers:
  - GitHub repo URLs
  - Hugging Face dataset URLs
  - DOI URLs
  - OpenAlex IDs
  - Semantic Scholar paper IDs
- [x] Store raw observed signals in `generated/source-signals.json`.
- [x] Add optional Supabase push mode for signals.

Signal shape:

```ts
type PopularitySignal = {
  source_id: string
  provider: 'github' | 'huggingface' | 'openalex' | 'semanticscholar' | 'datacite' | 'zenodo' | 'kaggle'
  metric: 'stars' | 'forks' | 'subscribers' | 'downloads' | 'views' | 'citations' | 'likes'
  value: number
  observed_at: string
  url: string
  raw_payload?: unknown
}
```

Acceptance criteria:

- Signals are provider-attributed and timestamped.
- Missing provider matches do not fail the run.
- No single homemade popularity score is required.
- `/sources` can display available signal badges.

## Phase 3: Indexed Status Detection

- [x] Add a local matcher comparing source candidates to `public/data/statements.json`.
- [x] Match using:
  - exact canonical URL
  - normalized URL host and path
  - title aliases
  - publisher aliases
  - known source identifiers
- [x] Emit `generated/source-indexing-status.json`.
- [x] Add status values:
  - `not_found`
  - `source_candidate_only`
  - `partially_indexed`
  - `indexed_as_records`
  - `indexed_as_source_release`
- [x] Add matched `STMT-*` IDs when available.

Acceptance criteria:

- OECD.AI Policy Navigator is not marked as canonical records unless direct matches exist.
- Existing CEI source releases are marked as source releases.
- Sources with no match, such as AGORA or AI Incident Database, are clearly marked `not_found`.

## Phase 4: Product UI

- [x] Update `/sources` cards with:
  - popularity signal badges
  - indexed status badge
  - recommended action badge
  - latest checked date
- [x] Add filters:
  - status
  - source type
  - import complexity
  - indexed status
  - has popularity signals
- [x] Add sorting:
  - review priority
  - latest checked
  - citations
  - downloads
  - stars
- [x] Add source detail route:
  - `app/sources/[id]/page.tsx`
- [x] Source detail page should show:
  - source metadata
  - identifiers
  - live checks
  - popularity signals
  - indexing status
  - known gaps
  - related `STMT-*` matches
  - recommended next action

Acceptance criteria:

- `/sources` remains scan-friendly on desktop and mobile.
- Detail page provides enough context for an admin to decide whether to ingest.
- No visual overlap or text overflow at common viewport widths.

## Phase 5: Admin Review Workflow

- [x] Extend admin review fields:
  - `admin_notes`
  - `license_review_status`
  - `dedupe_review_status`
  - `recommended_action`
  - `assigned_reviewer`
  - `reviewed_at`
- [x] Add allowed recommended actions:
  - `monitor_only`
  - `source_registry_only`
  - `index_metadata`
  - `index_records`
  - `index_full_text`
- [x] Update admin console to edit review fields.
- [x] Keep source inclusion status separate from recommended action.

Acceptance criteria:

- Admins can record why a source should or should not be ingested.
- Review status, indexing status, and recommended action are visually distinct.
- Public users cannot edit review fields.

## Phase 6: Selective Ingestion Rules

- [x] Define ingestion decision rules.
- [x] Prefer `index_metadata` when:
  - source is popular
  - license is unclear
  - record-level extraction is expensive
- [x] Prefer `index_records` when:
  - structured metadata is available
  - license allows reuse
  - dedupe matching is practical
- [x] Prefer `source_registry_only` when:
  - source is a trend report, index, or benchmark
  - rows are not primary policy statements
- [x] Prefer `monitor_only` when:
  - source is adjacent to the product scope
  - data quality is too low
  - import path is unstable

Acceptance criteria:

- Every source has a suggested next action.
- Suggested action can be overridden by admins.
- Docs explain why full-text ingestion is selective.

## Phase 7: Validation And Docs

- [x] Extend `npm run data:validate`.
- [x] Validate:
  - unique source IDs
  - unique canonical URLs
  - valid HTTPS URLs
  - valid provider names
  - valid metric names
  - signal timestamps
  - no duplicate identifiers per source
  - indexed status values are valid
  - `indexed_as_records` has at least one matched statement
- [x] Update `docs/DATA_PROVENANCE.md`.
- [x] Update `README.md`.
- [x] Add a short methodology note explaining:
  - external popularity signals are ingested, not invented
  - metrics are not directly comparable across providers
  - raw provider counts are shown with provenance and timestamp

Acceptance criteria:

- `npm run data:validate` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Docs distinguish source registry, popularity signals, and canonical statement indexing.

## Suggested Implementation Order

1. Add types and JSON shape for source registry.
2. Add `collect-source-signals.mjs`.
3. Implement GitHub and OpenAlex providers first.
4. Add source indexing-status matcher.
5. Update `/sources` cards with badges.
6. Add `/sources/[id]` detail page.
7. Add Supabase migration.
8. Add admin review fields.
9. Extend validation.
10. Update docs.

## Initial Sources To Add Or Recheck

- [x] AI Incident Database
- [x] AGORA AI Governance and Regulatory Archive
- [x] OECD.AI Index
- [x] OECD.AI Policy Navigator
- [x] Stanford AI Index
- [x] Global Index on Responsible AI
- [x] CAIDP Artificial Intelligence and Democratic Values Index
- [x] DataCite or Zenodo DOI-backed datasets relevant to AI governance
