---
pretty_name: CEI AI Governance Atlas
license: other
task_categories:
  - text-classification
  - feature-extraction
language:
  - multilingual
tags:
  - ai-governance
  - public-policy
  - ontology
  - responsible-ai
---

# CEI AI Governance Atlas

Portable export of the CEI Governance Atlas relational dataset.

## Contents

| File | Rows | Description |
| --- | ---: | --- |
| `statements` | 1,666 | Reconciled statement metadata with top scores and cluster |
| `fingerprints` | 1,405 | UMAP coordinates, policy family, and sparse fingerprint |
| `statement_scores` | 69,890 | Long-form statement-to-concept scores |
| `concepts` | 478 | Ontology, taxonomy, and fingerprint concepts |
| `concept_relationships` | 66 | Directed ontology relationships |
| `statement_sources` | 2,842 | Source provenance and original source payloads |
| `dataset_releases` | 4 | Versioned source releases |
| `dataset_artifacts` | 4 | Complete original source-level analysis artifacts |

Stable public identifiers are `statement_key` and `concept_key`. Internal database UUIDs are omitted
from joined exports where a stable key is available.

## Source repositories

- `cjimmylin/cei-statements-dashboard-b3`
- `cjimmylin/cei-fingerprint-explorer`
- `cjimmylin/cei-ontology-explorer`
- `cjimmylin/cei-unified-taxonomy`

Review source repository licensing before publishing this dataset.
