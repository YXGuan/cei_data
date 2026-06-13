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

`generated/import-summary.json` records artifact checksums and counts for the most recent import.
`statement_sources` and `dataset_artifacts` preserve original source payloads after a Supabase import.

## Important Limitation

Many records include a canonical source URL pointing to an original policy, standard, report, or
publisher. However, the CEI upstream repositories are the immediate source of the normalized
metadata and analysis values in this database. Review the upstream repositories' methodology and
licenses before republishing the corpus.
