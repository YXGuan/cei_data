from __future__ import annotations

import json
import shutil
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .supabase import SupabaseReader

Record = dict[str, Any]


def _write_jsonl(path: Path, rows: Iterable[Record]) -> int:
    count = 0
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
            count += 1
    return count


def _write_parquet(path: Path, rows: list[Record]) -> None:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError(
            "Parquet export requires the Hugging Face extras: uv sync --extra huggingface"
        ) from exc
    pq.write_table(pa.Table.from_pylist(rows), path, compression="zstd")


def _dataset_card(counts: dict[str, int]) -> str:
    return f"""---
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
| `statements` | {counts['statements']:,} | Reconciled statement metadata with top scores and cluster |
| `fingerprints` | {counts['fingerprints']:,} | UMAP coordinates, policy family, and sparse fingerprint |
| `statement_scores` | {counts['statement_scores']:,} | Long-form statement-to-concept scores |
| `concepts` | {counts['concepts']:,} | Ontology, taxonomy, and fingerprint concepts |
| `concept_relationships` | {counts['concept_relationships']:,} | Directed ontology relationships |
| `statement_sources` | {counts['statement_sources']:,} | Source provenance and original source payloads |
| `dataset_releases` | {counts['dataset_releases']:,} | Versioned source releases |

Stable public identifiers are `statement_key` and `concept_key`. Internal database UUIDs are omitted
from joined exports where a stable key is available.

## Source repositories

- `cjimmylin/cei-statements-dashboard-b3`
- `cjimmylin/cei-fingerprint-explorer`
- `cjimmylin/cei-ontology-explorer`
- `cjimmylin/cei-unified-taxonomy`

Review source repository licensing before publishing this dataset.
"""


def build_export(reader: SupabaseReader, output_dir: Path, parquet: bool = False) -> dict[str, Any]:
    """Export joined public data into a Hugging Face-friendly directory."""
    if output_dir.exists():
        shutil.rmtree(output_dir)
    data_dir = output_dir / "data"
    data_dir.mkdir(parents=True)

    releases = reader.all("dataset_releases", params={"order": "slug"})
    statements = reader.all("statement_explorer", params={"order": "statement_key"})
    concepts = reader.all("concepts", params={"order": "concept_key"})
    relationships = reader.all("concept_relationships")
    sources = reader.all("statement_sources")
    scores = reader.all("statement_scores")
    fingerprints = reader.all("latest_statement_fingerprints")
    runs = reader.all("analysis_runs")

    statement_keys = {row["id"]: row["statement_key"] for row in statements}
    concept_keys = {row["id"]: row["concept_key"] for row in concepts}
    release_slugs = {row["id"]: row["slug"] for row in releases}
    run_names = {row["id"]: {"name": row["name"], "version": row["version"]} for row in runs}

    statement_rows = [
        {
            key: value
            for key, value in row.items()
            if key not in {"id"}
        }
        for row in statements
    ]
    fingerprint_rows = [
        {
            "statement_key": statement_keys[row["statement_id"]],
            **{key: value for key, value in row.items() if key != "statement_id"},
        }
        for row in fingerprints
    ]
    score_rows = [
        {
            "statement_key": statement_keys[row["statement_id"]],
            "concept_key": concept_keys[row["concept_id"]],
            "analysis": run_names[row["analysis_run_id"]],
            "score": row["score"],
        }
        for row in scores
    ]
    relationship_rows = [
        {
            "source_concept_key": concept_keys[row["source_concept_id"]],
            "target_concept_key": concept_keys[row["target_concept_id"]],
            "relationship_type": row["relationship_type"],
            "condition": row["condition"],
            "dataset_release": release_slugs[row["dataset_release_id"]],
        }
        for row in relationships
    ]
    source_rows = [
        {
            "statement_key": statement_keys[row["statement_id"]],
            "dataset_release": release_slugs[row["dataset_release_id"]],
            "source_record_key": row["source_record_key"],
            "source_payload": row["source_payload"],
        }
        for row in sources
    ]

    tables = {
        "statements": statement_rows,
        "fingerprints": fingerprint_rows,
        "statement_scores": score_rows,
        "concepts": concepts,
        "concept_relationships": relationship_rows,
        "statement_sources": source_rows,
        "dataset_releases": releases,
    }
    counts = {}
    for name, rows in tables.items():
        counts[name] = _write_jsonl(data_dir / f"{name}.jsonl", rows)
        if parquet:
            _write_parquet(data_dir / f"{name}.parquet", rows)

    metadata = {
        "generated_at": datetime.now(UTC).isoformat(),
        "format": ["jsonl", *(["parquet"] if parquet else [])],
        "counts": counts,
        "stable_keys": {"statements": "statement_key", "concepts": "concept_key"},
    }
    (output_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (output_dir / "README.md").write_text(_dataset_card(counts), encoding="utf-8")
    return metadata


def upload_export(output_dir: Path, repo_id: str, private: bool = False) -> None:
    try:
        from huggingface_hub import HfApi
    except ImportError as exc:
        raise RuntimeError(
            "Uploading requires the Hugging Face extras: uv sync --extra huggingface"
        ) from exc
    api = HfApi()
    api.create_repo(repo_id=repo_id, repo_type="dataset", private=private, exist_ok=True)
    api.upload_folder(repo_id=repo_id, repo_type="dataset", folder_path=output_dir)
