# CEI AI Governance Database

A searchable AI governance evidence database that unifies the CEI statements corpus, ontology,
unified taxonomy, and statement fingerprints. The product emphasizes retrieval, metadata,
provenance, and a governed workflow for prioritizing new data sources.

## Product Direction

The first release focuses on a coherent workflow:

1. Search and filter the global statement registry.
2. Inspect record metadata, provenance, and governance concepts.
3. Let invited users propose and vote on candidate data sources.
4. Let selected admins review source requests and control inclusion status.

The existing source dashboards remain valuable analysis outputs, but they contain different corpus snapshots. This app stores them as versioned dataset releases and analysis runs rather than treating any generated file as the canonical database.

## Stack

- Next.js 16 App Router and TypeScript
- Supabase: Postgres, Auth, full-text search, `pgvector`, and row-level security
- Vercel for the public Next.js application
- Local Python package for enrichment, quality checks, and portable exports

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

See [`docs/DATA_PROVENANCE.md`](docs/DATA_PROVENANCE.md) for the exact upstream repositories,
pinned commits, selected local import files, and provenance limitations.

## Run Locally

```bash
npm install
npm run dev
```

The application runs at `http://localhost:3000` and uses prepared catalog snapshots when Supabase
is not configured. To connect Supabase:

```bash
copy .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Share The Local App With Cloudflare Tunnel

Start the Next.js app and a temporary Cloudflare Quick Tunnel with one command:

```bash
npm run tunnel:start
```

The command prints a public `https://*.trycloudflare.com` URL. It downloads the official
`cloudflared` Windows executable into the ignored `.tools` directory if it is not installed.

Stop both the tunnel and the managed Next.js process with:

```bash
npm run tunnel:stop
```

Check the current managed tunnel without changing it:

```bash
npm run tunnel:status
```

Quick Tunnel URLs are temporary, change after each restart, and expose the local app publicly while
running. They are appropriate for demos and testing, not production hosting.

## Search And Governance Workflow

- `GET /api/search` is the Next.js backend endpoint for catalog search and facets.
- Supabase `search_statements` provides ranked full-text search when configured.
- `source_requests` stores candidate sources and their review state.
- `source_request_votes` stores one vote per invited user and candidate source.
- `profiles.role = 'admin'` is checked by RLS before review statuses can change.
- There is no public registration UI, and Supabase signup is disabled in `supabase/config.toml`.

Create users through the Supabase dashboard or admin API. Promote selected users after inviting them:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.org';
```

For a hosted Supabase project, also disable public signups in **Authentication > Providers > Email**.

## Prepare and Import Source Data

Build the reconciled frontend snapshot directly from all four source repositories:

```bash
npm run data:prepare
```

When the following original files exist at the repository root, the importer uses them instead of
fetching remote copies:

- `data.js`: CEI Statements Dashboard B3
- `data (1).js`: CEI Fingerprint Explorer
- `data (2).js`: CEI Unified Taxonomy

The importer reconciles statement keys, preserves complete source-level artifacts with checksums,
normalizes the sparse fingerprint heatmap, and writes:

- `public/data/dashboard.json`: lightweight frontend snapshot
- `public/data/statements.json`: searchable statement registry snapshot
- `public/data/fingerprints.json`: UMAP and cluster snapshot
- `public/data/source-candidates.json`: checked third-party source-priority queue
- `generated/import-summary.json`: import quality report
- `generated/source-candidates-summary.json`: third-party source check summary

Validate referential integrity and expected reconciliation counts:

```bash
npm run data:validate
```

The unified taxonomy expands the reconciled registry to 1,666 statements. Of those, 1,405 have fingerprint records. Dashboard B3 metadata is retained as the preferred source for overlapping records, while all source payloads remain available for provenance.

The normalized score table currently contains:

- 6,745 Dashboard B3 ontology scores
- 34,957 unified-taxonomy scores
- 28,188 recovered fingerprint-dimension scores

Refresh only the third-party source-priority queue without rebuilding the full catalog:

```bash
npm run data:sources
```

The source queue starts from `data/source-candidates.seed.json`, fetches each canonical source URL,
records response status, content type, page title, description, and metadata quality flags, then
feeds the `/sources` product surface. These source candidates are review targets, not canonical
statement records, until licensing, duplication, provenance, and metadata mapping are complete.

To import the normalized records into Supabase:

```powershell
$env:SUPABASE_URL_CEI="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY_CEI="your-service-role-key"
npm run data:import
```

The service-role key is only for the local/server-side importer. Never expose it through a `VITE_`
or `NEXT_PUBLIC_` environment variable. Generic `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are still supported as fallbacks, but the CEI-specific names avoid accidental imports into another
Supabase project.

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
- `dataset_artifacts`: complete original source-level datasets and aggregate analyses
- `dataset_releases`: source release metadata
- `dataset_artifacts`: full original source-level datasets, checksums, and aggregate analyses

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
The source voting and admin migration is at
`supabase/migrations/202606130001_source_requests_and_admins.sql`.

## Deploy To Vercel

1. Create and link a hosted Supabase project, then run `supabase db push`.
2. Import this repository into Vercel as a Next.js project.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel.
4. Set the Supabase Auth site URL to the Vercel production URL and add any preview URLs needed for
   invited-user authentication.
5. Deploy. Vercel uses `npm run build`; no service-role key is required by the public application.

Keep `SUPABASE_SERVICE_ROLE_KEY_CEI` only in trusted import/processing environments. Never expose
it through a `NEXT_PUBLIC_` variable.

## Data Model

- `dataset_releases`: source repository snapshots and import metadata
- `statements`, `organizations`: normalized public registry
- `statement_sources`: source-level payloads and provenance
- `concepts`: ontology and taxonomy hierarchy
- `concept_relationships`: directed ontology relationships and conditions
- `analysis_runs`: versioned scoring, clustering, and fingerprint methods
- `statement_scores`: statement-to-concept scores
- `statement_fingerprints`: clusters, UMAP coordinates, vectors, and sparse fingerprints
- `profiles`: invited members and selected admins
- `source_requests`: proposed external data sources and review state
- `source_request_votes`: one vote per invited user and source request

## Source Repositories

- `cjimmylin/cei-statements-dashboard-b3`: statement registry and metadata
- `cjimmylin/cei-fingerprint-explorer`: fingerprint dimensions, clusters, and UMAP analyses
- `cjimmylin/cei-ontology-explorer`: ontology hierarchy and relationships
- `cjimmylin/cei-unified-taxonomy`: cross-sector taxonomy and analysis outputs

## Next Data Phase

Add conflict reporting for fields that differ between source releases, then expose provenance and ontology relationships directly in the statement detail experience.
