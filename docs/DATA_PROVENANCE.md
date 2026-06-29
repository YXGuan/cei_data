# Data Provenance

The current MVP uses Dr. K's source URL matrix as the active product dataset.
The earlier CEI statement/fingerprint/dashboard corpus is archived and no longer powers search,
validation, routing, or visible navigation.

## Active Source

| Dataset | Location | Role |
| --- | --- | --- |
| Product Requirements Document | `docs/prd/[CEI AI Governance Database] Product Requirement Document (PRD) (06.27.2026).docx` | Product direction and feature priorities |
| Source URL Validation Matrix | `docs/prd/CEI_AI_Governance_Database_Source_URLs_DrK_June_2026 (Created by Dr. K) (06.27.2026).docx` | Canonical source list for the MVP |
| Normalized source seed | `data/drk-source-matrix.seed.json` | Structured source registry seed |

The source matrix table was converted into structured JSON with one row per source. Repeated table
headers were removed.

## Generated Active Artifacts

`npm run data:sources` writes:

- `public/data/source-candidates.json`
- `public/data/source-signals.json`
- `public/data/source-indexing-status.json`
- `public/data/source-registry.json`
- `generated/source-candidates-summary.json`
- `generated/source-signals.json`
- `generated/source-indexing-status.json`
- `generated/source-registry-summary.json`

Each source preserves the PRD matrix fields: title, source reference, category, URL status, notes,
format, recommended action, import complexity, license review status, and dedupe review status.

## Human/Rule-Seeded Enrichment

The MVP adds deterministic first-pass fields so the product can be used before LLM enrichment:

- `wisdom_tags`: one or more of Human Dignity, Power Constraints, Deception, Stewardship, Justice, Wisdom
- `persona_relevance`: Builder/Product, Legal & Compliance, and Ministry & Civil Society relevance
- `core_constraint`
- `required_control`
- `evidence_standard`
- `confidence_rating`

`confidence_rating` is `Inferred` unless a reviewer explicitly upgrades or disputes the mapping.

## Archived Legacy Corpus

Archived files live under `archive/legacy-cei-corpus/`:

- root `data*.js` CEI corpus inputs
- generated `dashboard.json`, `statements.json`, `fingerprints.json`, and `analytics.json`
- prior source-candidate seed data

These files are kept for reference and possible future reconciliation. They are not active MVP
data and should not be reintroduced without an explicit ingestion decision.

## Important Limitation

The current app is a source-review matrix, not a canonical record-level policy database.
Source-level crosswalk fields are useful for triage, but record-level extraction, licensing review,
deduplication, full-text storage, and audited statement keys remain future work.
