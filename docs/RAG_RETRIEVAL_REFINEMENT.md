# RAG Retrieval Refinement

This branch adds the first measurable retrieval refinement layer for eventual RAG answers.

## Current Scope

The current catalog does not yet contain primary full text for most records. The evidence-unit
artifact therefore uses available abstracts plus clearly labeled metadata and derived concept
summaries. This gives the project a stable retrieval/evaluation harness before full-text ingestion.

Generated evidence units live in `public/data/evidence-units.json`. Each unit has:

- a stable evidence ID such as `EV-STMT-0001-ABS-001`
- the parent `STMT-*` key
- `evidence_kind`: `metadata`, `abstract`, `source_text`, or `concept_scores`
- `granularity`: `sentence`, `bullet`, `clause`, `paragraph`, or `table_row`
- `chunk_text` for retrieval
- `expanded_context` for generation context
- section path, offsets where available, token count, and content hash

## Retrieval Pattern

The intended pattern is fine retrieval with wider context:

1. Retrieve evidence units, not whole documents.
2. Rerank and diversify by statement.
3. Return the winning `chunk_text` plus `expanded_context`.
4. Cite the evidence-unit ID in any future answer layer.

The local implementation powers `GET /api/retrieve?q=...`. Supabase deployments can use the
`statement_evidence_units` table and `retrieve_evidence_units` RPC after running migrations and
pushing evidence units.

## Commands

```bash
npm run data:evidence
npm run eval:retrieval
npm run data:validate
```

The eval seed lives at `data/retrieval-eval.seed.json`. Baseline reports are written to
`generated/retrieval-evals/`.

## Next Full-Text Step

When approved source text is ingested, add `source_text` units at the smallest reliable structural
level: sentence, bullet, numbered clause, article provision, or table row. Keep parent paragraph or
section text in `expanded_context` so generation does not lose interpretive context.
