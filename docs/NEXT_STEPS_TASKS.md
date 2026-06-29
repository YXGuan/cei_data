# Next Steps Tasks

Objective: turn Dr. K's source URL matrix into a durable source-review MVP before restarting
record-level ingestion.

## Completed In This Branch

- [x] Archive the prior CEI statement/fingerprint/dashboard corpus under `archive/legacy-cei-corpus/`.
- [x] Convert Dr. K's source URL matrix into `data/drk-source-matrix.seed.json`.
- [x] Regenerate active `public/data/source-*` artifacts from the Dr. K seed only.
- [x] Replace the homepage catalog with a persona-guided source matrix.
- [x] Add Wisdom Layer tags and source-level crosswalk preview fields.
- [x] Add Markdown and CSV exports for filtered source pathways.
- [x] Add the MVP stack rebuttal memo.

## Next Review Tasks

- [ ] Human-review the rule-seeded Wisdom tags for the first 25 priority sources.
- [ ] Human-review the crosswalk preview fields for the same priority set.
- [ ] Decide which sources should move from `source_registry_only` to `index_metadata`.
- [ ] Confirm license/reuse terms for high-priority official sources.
- [ ] Decide whether internal CEI / Dr. K materials should remain an internal source reference or get a public canonical URL.
- [ ] Add reviewer notes and owner assignments in Supabase once hosted credentials are configured.

## Future Implementation Tasks

- [ ] Add a structured source-edit/admin UI for Wisdom tags and crosswalk fields.
- [ ] Add a reviewed/unreviewed state separate from `confidence_rating`.
- [ ] Add source grouping for duplicate URLs that intentionally appear in multiple PRD categories.
- [ ] Add record-level ingestion only after licensing, dedupe, and source priority are reviewed.
- [ ] Evaluate LLM-assisted enrichment after a human-reviewed gold set exists.
- [ ] Revisit GCP/Firestore/Vertex only after the MVP validates source review and RAG need.

## Acceptance Checks

- `npm run data:sources`
- `npm run data:validate`
- `npm run lint`
- `npm run build`

Manual checks:

- Homepage and `/sources` show Dr. K matrix sources only.
- `/api/search` returns source records, not `STMT-*` records.
- Source detail pages show URL status, notes, Wisdom tags, crosswalk preview, and recommended action.
- Markdown and CSV exports include filtered Dr. K matrix sources.
