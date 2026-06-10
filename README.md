# CEI Governance Atlas

An AI governance evidence explorer that unifies the CEI statements corpus, ontology, unified taxonomy, and statement fingerprints.

## Product Direction

The first release focuses on a coherent workflow:

1. Understand corpus coverage and major governance signals.
2. Search and filter the statement registry.
3. Inspect a statement's metadata, provenance, taxonomy scores, and fingerprint.
4. Compare statements, policy families, sectors, and regions.

The existing source dashboards remain valuable analysis outputs, but they contain different corpus snapshots. This app stores them as versioned dataset releases and analysis runs rather than treating any generated file as the canonical database.

## Stack

- React, TypeScript, Vite
- Recharts for initial visualization
- Supabase: Postgres, full-text search, `pgvector`, row-level security, and future document storage

Supabase is a good starting point at this scale. Postgres is the system of record; derived aggregates can later move to materialized views or an analytics warehouse if query volume requires it.

## What The Data Looks Like

There are three representations, each serving a different purpose:

1. **Supabase is the system of record.** It contains normalized statements, organizations, source provenance, concepts, scores, relationships, fingerprints, and versioned analysis runs.
2. **`public/data` contains small frontend snapshots.** These make the website usable without a database, but they are not the complete research dataset.
3. **The Python exporter builds a portable Hugging Face bundle.** It joins internal UUIDs back to stable `STMT-*` statement keys and human-readable concept keys.

The primary exported statement shape is:

```json
{
  "statement_key": "STMT-0001",
  "title": "OCAP Principles (First Nations Data Governance)",
  "publication_year": 1998,
  "organization": "FNIGC",
  "region": "North America",
  "cluster_label": "International & Intergovernmental",
  "umap_x": 0.1057,
  "umap_y": -9.3322,
  "fingerprint": {"k5": 4, "k8": 7, "top_dimensions": []},
  "top_scores": [
    {"concept_key": "ontology:privacy", "label": "Privacy", "score": 65}
  ]
}
```

Scores and ontology relationships are also available in long form:

```json
{"statement_key":"STMT-0076","concept_key":"ontology:fairness","analysis":{"name":"Statement Ontology Scores","version":"b3-2026-03-15"},"score":5}
{"source_concept_key":"ontology-explorer:transparency","target_concept_key":"ontology-explorer:accountability","relationship_type":"enables"}
```

## Run Locally

```bash
npm install
npm run dev
```

The interface runs with local representative data. To connect Supabase:

```bash
copy .env.example .env.local
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Prepare and Import Source Data

Build the reconciled frontend snapshot directly from all four source repositories:

```bash
npm run data:prepare
```

This fetches the source datasets, reconciles statement keys, and writes:

- `public/data/dashboard.json`: lightweight frontend snapshot
- `public/data/statements.json`: searchable statement registry snapshot
- `public/data/fingerprints.json`: UMAP and cluster snapshot
- `generated/import-summary.json`: import quality report

Validate referential integrity and expected reconciliation counts:

```bash
npm run data:validate
```

The unified taxonomy expands the reconciled registry to 1,666 statements. Of those, 1,405 have fingerprint records. Dashboard B3 metadata is retained as the preferred source for overlapping records, while all source payloads remain available for provenance.

To import the normalized records into Supabase:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
npm run data:import
```

The service-role key is only for the local/server-side importer. Never expose it through a `VITE_` environment variable.

## Python Processing Backend

The `backend/cei_backend` package is the foundation for future enrichment, embeddings, quality checks, scheduled processing, and dataset publication. Install it with:

```bash
uv sync --extra dev
```

Inspect the live database:

```bash
uv run cei-data describe
```

Run the processing API:

```bash
npm run backend
```

The initial endpoints are:

- `GET /health`
- `GET /v1/data/summary`
- `GET /v1/statements/{statement_key}`

## Hugging Face Export

Generate a JSONL dataset bundle and dataset card:

```bash
npm run data:export:hf
```

The ignored `exports/huggingface/cei-governance-atlas` directory contains:

- `statements`: joined statement metadata, fingerprint, cluster, and top scores
- `fingerprints`: full fingerprint and UMAP records
- `statement_scores`: long-form scores suitable for analysis and model training
- `concepts` and `concept_relationships`: ontology and taxonomy graph
- `statement_sources`: original source payloads and provenance
- `dataset_releases`: source release metadata

For Parquet and direct upload support:

```bash
uv sync --extra huggingface
uv run cei-data export-hf --parquet
uv run cei-data upload-hf YOUR_ORG/cei-governance-atlas
```

Before a public upload, review and document the licenses of all four upstream repositories. The generated dataset card intentionally marks the license as `other` until that review is complete.

## Database Setup

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), then:

```bash
supabase init
supabase start
supabase db reset
```

For a hosted project, link it and push the migration:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The initial migration is at `supabase/migrations/202606050001_initial_schema.sql`.

## Data Model

- `dataset_releases`: source repository snapshots and import metadata
- `statements`, `organizations`: normalized public registry
- `statement_sources`: source-level payloads and provenance
- `concepts`: ontology and taxonomy hierarchy
- `concept_relationships`: directed ontology relationships and conditions
- `analysis_runs`: versioned scoring, clustering, and fingerprint methods
- `statement_scores`: statement-to-concept scores
- `statement_fingerprints`: clusters, UMAP coordinates, vectors, and sparse fingerprints

## Source Repositories

- `cjimmylin/cei-statements-dashboard-b3`: statement registry and metadata
- `cjimmylin/cei-fingerprint-explorer`: fingerprint dimensions, clusters, and UMAP analyses
- `cjimmylin/cei-ontology-explorer`: ontology hierarchy and relationships
- `cjimmylin/cei-unified-taxonomy`: cross-sector taxonomy and analysis outputs

## Next Data Phase

Add conflict reporting for fields that differ between source releases, then expose provenance and ontology relationships directly in the statement detail experience.
