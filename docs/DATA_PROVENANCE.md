# Data Provenance

The current catalog reconciles four upstream CEI analysis repositories maintained by `cjimmylin`.
This repository does not independently scrape all original policy publishers.

## Upstream Sources

| Dataset | Upstream repository | Pinned commit | Imported content |
| --- | --- | --- | --- |
| CEI Statements Dashboard B3 | [`cjimmylin/cei-statements-dashboard-b3`](https://github.com/cjimmylin/cei-statements-dashboard-b3) | `d68460fb20ede1cc2d43ec693e9008129da67083` | 1,176 statement records, organizations, abstracts, source URLs, instrument metadata, and ontology scores |
| CEI Fingerprint Explorer | [`cjimmylin/cei-fingerprint-explorer`](https://github.com/cjimmylin/cei-fingerprint-explorer) | `90195c5954c048cbbb59c834c8a26970f12d332a` | 1,405 UMAP points, policy-family clusters, fingerprint dimensions, and dimension scores |
| CEI Ontology Explorer | [`cjimmylin/cei-ontology-explorer`](https://github.com/cjimmylin/cei-ontology-explorer) | `1bceb6db04595ebebaf86231bbf2dfb1dbbb464b` | Embedded ontology concepts, typed relationships, crosswalks, and aggregate analyses |
| CEI Unified Taxonomy | [`cjimmylin/cei-unified-taxonomy`](https://github.com/cjimmylin/cei-unified-taxonomy) | `0e3b6d7d53f6b0c1206cba80a89b0b1f0e6f043e` | The broadest 1,666-record registry plus unified taxonomy and ontology scores |

The source repository commits are recorded in `supabase/seed.sql`.

## What Generated The Current Prepared Catalog

`npm run data:prepare` runs `scripts/import-cei.mjs`. The importer uses local root-level copies when
they exist, and otherwise downloads the upstream GitHub files.

For the current generated snapshot, the selected inputs were:

| Import role | Selected input |
| --- | --- |
| Statements | `data.js` |
| Fingerprints | `data (1).js` |
| Ontology | Upstream `cei-ontology-explorer/main/index.html`, parsed from its embedded `const D` object |
| Unified taxonomy | `data (2).js` |

The three root-level data files entered this repository in commit
`1446d7ad67997badc1c905323fed2d50e5828e88` on June 10, 2026. Their filenames and importer mapping
associate them with the upstream repositories above, but the root files themselves do not contain
additional provenance proving which exact upstream commit produced each copy.

## Reconciliation Output

The current prepared output contains:

- 1,666 reconciled statements
- 1,405 fingerprints
- 469 concepts
- 66 ontology relationships
- 28,188 fingerprint-dimension scores
- 34,957 unified-taxonomy scores
- 15 source registry entries, including 4 included CEI source releases and 11 external review targets
- 23 provider-attributed popularity signals for source prioritization

`generated/import-summary.json` records artifact checksums and counts for the most recent import.
`generated/source-candidates-summary.json` records the latest third-party source metadata check.
`generated/source-signals.json` records raw provider popularity payloads for audit.
`generated/source-registry-summary.json` records the latest joined source registry build.
`statement_sources` and `dataset_artifacts` preserve original source payloads after a Supabase import.

## Third-Party Source Candidates

`npm run data:sources` starts from `data/source-candidates.seed.json`, checks canonical public
source pages for the governed expansion queue, collects external popularity signals, checks local
indexing status, and builds `public/data/source-registry.json`. The current registry includes
official or well-known resources from the European Commission, OECD.AI, NIST, the Council of Europe,
UNESCO, the Global Center on AI Governance, the Center for AI and Digital Policy, Stanford HAI, the
Responsible AI Collaborative, and the Emerging Technology Observatory.

These candidates are not merged into the canonical statement registry by the metadata checker. They
remain review targets until the project confirms license/reuse terms, stable record-level import
paths, duplicate matching against existing `STMT-*` records, and the correct representation for
indexes or trend datasets that are not primary policy statements.

## Popularity Signals

The source registry imports external popularity signals instead of creating a local popularity
index from scratch. Provider-specific signals include GitHub stars and forks, Zenodo views and
downloads, DataCite DOI metrics, and OpenAlex citation counts when a source exposes matching
identifiers. Counts are stored with provider, metric, URL, and observation timestamp.

These signals are evidence for prioritization only. They are not directly comparable across
providers, and the product intentionally avoids collapsing them into a single popularity score.

## Selective Ingestion

`public/data/source-indexing-status.json` compares registry sources to the prepared `STMT-*`
catalog. Sources can be `not_found`, `partially_indexed`, `indexed_as_records`, or
`indexed_as_source_release`. AGORA and AI Incident Database currently remain `not_found` in the
canonical statement registry, while the four CEI upstream repositories are marked as source
releases.

Recommended actions separate source monitoring from ingestion. The registry favors:

- `index_metadata` when a source is high value but license or dedupe status still needs review
- `index_records` when structured source records are reusable and matchable
- `source_registry_only` for trend reports, benchmarks, indexes, and already imported releases
- `monitor_only` for adjacent datasets that may not belong in the statement registry

## Important Limitation

Many records include a canonical source URL pointing to an original policy, standard, report, or
publisher. However, the CEI upstream repositories are the immediate source of the normalized
metadata and analysis values in this database. Review the upstream repositories' methodology and
licenses before republishing the corpus. Review the third-party source candidates separately before
importing or storing their full text.
