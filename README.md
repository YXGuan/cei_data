# CEI AI Governance Source Matrix

This branch is a one-week MVP rebased on Dr. K's latest PRD and source URL matrix.
The active product dataset is the PRD source matrix, not the archived CEI statement
and fingerprint corpus.

## Current MVP

The app helps reviewers triage AI governance sources before record-level ingestion:

1. Choose a persona pathway: Builder/Product, Legal & Compliance, or Ministry & Civil Society.
2. Search and filter Dr. K's source matrix.
3. Review Wisdom Layer tags, source status, import complexity, and recommended action.
4. Inspect source-level crosswalk previews: core constraint, required control, and evidence standard.
5. Export the current pathway as Markdown or CSV.

## Stack

- Next.js 16 App Router and TypeScript
- Prepared JSON snapshots in `public/data`
- Supabase-ready source review/admin types and pages
- Vercel-ready frontend

The MVP intentionally keeps the existing Next.js/Supabase/static-snapshot stack. See
[`docs/architecture/mvp-stack-rebuttal.md`](docs/architecture/mvp-stack-rebuttal.md)
for why GCP/Firestore/Vertex is not the immediate MVP stack.

## Active Data

- Canonical seed: `data/drk-source-matrix.seed.json`
- PRD inputs: `docs/prd/`
- Generated active artifacts:
  - `public/data/source-candidates.json`
  - `public/data/source-signals.json`
  - `public/data/source-indexing-status.json`
  - `public/data/source-registry.json`

The prior CEI corpus files are retained under `archive/legacy-cei-corpus/` for reference.
They are not used by search, source pages, validation, or visible navigation in this MVP.

## Run Locally

```bash
npm install
npm run data:sources
npm run dev
```

The application runs at `http://localhost:3000`.

## Data Commands

```bash
npm run data:sources
npm run data:signals
npm run data:indexing
npm run data:registry
npm run data:validate
```

`npm run data:sources` regenerates the active source artifacts from
`data/drk-source-matrix.seed.json`.

`npm run data:prepare` is now an alias for the source-matrix pipeline. Legacy CEI corpus import is
archived for this MVP.

## Verification

```bash
npm run data:validate
npm run lint
npm run build
```

Manual checks:

- Homepage shows the Dr. K source matrix, not the old statement catalog.
- `/api/search` returns source matrix records only.
- Persona selection changes search prompts and result framing.
- Source detail pages show URL status, notes, Wisdom tags, crosswalk preview, and recommended action.
- Markdown and CSV exports include only filtered Dr. K matrix sources.
