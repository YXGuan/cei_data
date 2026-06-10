insert into public.dataset_releases (slug, title, source_repository, source_commit, published_at, metadata)
values
  ('statements-b3-2026-03-15', 'CEI Statements Dashboard B3', 'cjimmylin/cei-statements-dashboard-b3', 'd68460fb20ede1cc2d43ec693e9008129da67083', '2026-03-15', '{"statement_count": 1176}'),
  ('fingerprints-2026-03-15', 'CEI Fingerprint Explorer', 'cjimmylin/cei-fingerprint-explorer', '90195c5954c048cbbb59c834c8a26970f12d332a', '2026-03-15', '{"statement_count": 1405, "dimensions": 374, "optimal_k": 6}'),
  ('ontology-ont3', 'CEI Ontology Explorer ont3', 'cjimmylin/cei-ontology-explorer', '1bceb6db04595ebebaf86231bbf2dfb1dbbb464b', null, '{}'),
  ('unified-taxonomy-2026-03-15', 'CEI Unified Taxonomy', 'cjimmylin/cei-unified-taxonomy', '0e3b6d7d53f6b0c1206cba80a89b0b1f0e6f043e', '2026-03-15', '{"statement_count": 1666, "countries": 143, "languages": 97}')
on conflict (slug) do nothing;

insert into public.concepts (concept_key, label, taxonomy, level, color)
values
  ('transparency', 'Transparency', 'ontology', 2, '#6d5dfc'),
  ('accountability', 'Accountability', 'ontology', 2, '#12b886'),
  ('fairness', 'Fairness', 'ontology', 2, '#e8590c'),
  ('privacy', 'Privacy', 'ontology', 2, '#228be6'),
  ('safety', 'Safety', 'ontology', 2, '#d6336c'),
  ('human_oversight', 'Human oversight', 'ontology', 2, '#f59f00'),
  ('iv_governance', 'IV Governance', 'unified_taxonomy', 1, '#6d5dfc'),
  ('ii_rights', 'II Rights', 'unified_taxonomy', 1, '#e8590c'),
  ('v_society_labor', 'V Society / Labor', 'unified_taxonomy', 1, '#228be6')
on conflict (concept_key) do nothing;
