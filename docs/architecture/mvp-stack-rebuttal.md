# MVP Stack Rebuttal: Why Not GCP/Firestore/Vertex Now

## Recommendation

Use the existing Next.js, prepared JSON snapshot, and Supabase-ready review workflow for the
one-week MVP. Do not migrate the MVP to GCP/Firestore/Vertex until the source model, Wisdom Layer
workflow, and persona journeys are validated.

## Why The PRD Stack Is Not The MVP Stack

The PRD's GCP architecture is plausible for a later production system, but it is too heavy for the
next-week MVP:

- **Account and admin setup blocks product work.** GCP projects, billing, IAM, service accounts,
  Cloud Run permissions, Firestore regional settings, Vertex AI enablement, and Custom Search setup
  require administrative decisions before user-facing work can move.
- **Firestore is not needed for source-matrix validation.** The active dataset is a small structured
  source registry. Static JSON snapshots and Supabase-ready schemas are enough to validate search,
  tagging, review status, and exports.
- **Vertex AI adds governance and QA overhead.** Model selection, prompt management, safety review,
  provenance capture, retry/cost controls, and hallucination evaluation would dominate the first
  week before the human/rule-seeded taxonomy is even validated.
- **Managed search is premature.** The MVP needs guided source triage, not a production RAG system.
  Search quality can be tested with local source fields, persona weighting, and filters first.
- **Migration risk is avoidable.** Moving storage and ingestion before the product shape stabilizes
  risks redoing schemas, scripts, and UI assumptions after reviewer feedback.

## Current Stack Advantages

- The repo already runs locally and deploys as a standard Next.js app.
- Prepared snapshots make the MVP demoable without cloud credentials.
- Supabase-ready types/admin patterns keep a path to authenticated review workflows.
- Source artifacts can be regenerated with `npm run data:sources`.
- The team can validate product questions immediately: source coverage, persona fit, Wisdom tags,
  review workflow, and export usefulness.

## Later GCP Evaluation Gate

Revisit GCP/Firestore/Vertex only after these are true:

- Reviewers accept the source schema and Dr. K matrix coverage.
- Wisdom tags and crosswalk fields have a human-reviewed gold set.
- The app has clear evidence that users need full-text RAG over source documents.
- Admin ownership exists for GCP billing, IAM, monitoring, model governance, and data retention.
- A migration plan maps current source registry fields to the target cloud schema without losing
  provenance.

Until then, the MVP should optimize for learning speed and traceable source review, not managed
cloud architecture.
