alter table public.concepts add column if not exists metadata jsonb not null default '{}'::jsonb;

create or replace view public.statement_catalog
with (security_invoker = true)
as
select
  s.id,
  s.statement_key,
  s.title,
  s.publication_year,
  s.statement_type,
  s.binding_nature,
  s.geographic_scope,
  s.region,
  s.country_code,
  s.language_code,
  s.source_url,
  s.abstract,
  s.word_count,
  s.lifecycle_status,
  o.name as organization,
  o.organization_type,
  o.organization_subtype
from public.statements s
left join public.organizations o on o.id = s.organization_id;

create or replace view public.latest_statement_fingerprints
with (security_invoker = true)
as
select distinct on (sf.statement_id)
  sf.statement_id,
  sf.cluster_label,
  sf.cluster_number,
  sf.umap_x,
  sf.umap_y,
  sf.fingerprint,
  ar.name as analysis_name,
  ar.version as analysis_version,
  ar.metrics
from public.statement_fingerprints sf
join public.analysis_runs ar on ar.id = sf.analysis_run_id
order by sf.statement_id, ar.created_at desc;

create or replace view public.statement_explorer
with (security_invoker = true)
as
select
  catalog.*,
  fingerprint.cluster_label,
  fingerprint.cluster_number,
  fingerprint.umap_x,
  fingerprint.umap_y,
  fingerprint.fingerprint,
  coalesce(scores.top_scores, '[]'::jsonb) as top_scores
from public.statement_catalog catalog
left join public.latest_statement_fingerprints fingerprint on fingerprint.statement_id = catalog.id
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'concept_key', ranked.concept_key,
    'label', ranked.label,
    'score', ranked.score,
    'color', ranked.color
  ) order by ranked.score desc) as top_scores
  from (
    select c.concept_key, c.label, ss.score, c.color
    from public.statement_scores ss
    join public.concepts c on c.id = ss.concept_id
    where ss.statement_id = catalog.id
    order by ss.score desc
    limit 5
  ) ranked
) scores on true;

create or replace function public.dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'statements', count(*),
    'countries', count(distinct country_code) filter (where country_code is not null),
    'organizations', count(distinct organization_id) filter (where organization_id is not null),
    'languages', count(distinct language_code) filter (where language_code is not null),
    'legally_binding', count(*) filter (where binding_nature = 'legally_binding'),
    'metadata_pending', count(*) filter (where lifecycle_status = 'metadata_pending')
  )
  from statements;
$$;

grant select on public.statement_catalog to anon, authenticated;
grant select on public.latest_statement_fingerprints to anon, authenticated;
grant select on public.statement_explorer to anon, authenticated;
grant execute on function public.dashboard_summary() to anon, authenticated;
