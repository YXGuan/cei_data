create or replace function public.search_statements(
  p_query text default '',
  p_region text default null,
  p_statement_type text default null,
  p_binding_nature text default null,
  p_cluster_label text default null,
  p_organization_type text default null,
  p_sort text default 'relevance',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid,
  statement_key text,
  title text,
  publication_year int,
  statement_type text,
  binding_nature text,
  geographic_scope text,
  region text,
  country_code text,
  language_code text,
  source_url text,
  abstract text,
  word_count int,
  lifecycle_status text,
  organization text,
  organization_type text,
  organization_subtype text,
  cluster_label text,
  cluster_number int,
  umap_x real,
  umap_y real,
  fingerprint jsonb,
  top_scores jsonb,
  search_rank real,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select
      nullif(trim(p_query), '') as query_text,
      case when nullif(trim(p_query), '') is null then null
        else websearch_to_tsquery('english', trim(p_query))
      end as query
  ),
  candidates as (
    select
      explorer.*,
      (
        case when params.query is null then 0
          else ts_rank_cd(s.search_vector, params.query, 32)
        end
        + case when params.query_text is not null and lower(explorer.title) like '%' || lower(params.query_text) || '%' then 2 else 0 end
        + case when params.query_text is not null and lower(coalesce(explorer.organization, '')) like '%' || lower(params.query_text) || '%' then 1 else 0 end
        + case when params.query_text is not null and lower(explorer.statement_key) = lower(params.query_text) then 4 else 0 end
      )::real as rank
    from public.statement_explorer explorer
    join public.statements s on s.id = explorer.id
    cross join params
    where
      (p_region is null or explorer.region = p_region)
      and (p_statement_type is null or explorer.statement_type = p_statement_type)
      and (p_binding_nature is null or explorer.binding_nature = p_binding_nature)
      and (p_cluster_label is null or explorer.cluster_label = p_cluster_label)
      and (p_organization_type is null or explorer.organization_type = p_organization_type)
      and (
        params.query is null
        or s.search_vector @@ params.query
        or lower(explorer.statement_key) = lower(params.query_text)
        or lower(explorer.title) like '%' || lower(params.query_text) || '%'
        or lower(coalesce(explorer.abstract, '')) like '%' || lower(params.query_text) || '%'
        or lower(coalesce(explorer.organization, '')) like '%' || lower(params.query_text) || '%'
        or lower(coalesce(explorer.cluster_label, '')) like '%' || lower(params.query_text) || '%'
        or exists (
          select 1
          from public.statement_scores ss
          join public.concepts c on c.id = ss.concept_id
          where ss.statement_id = explorer.id
            and ss.score >= 50
            and lower(c.label) like '%' || lower(params.query_text) || '%'
        )
      )
  )
  select
    candidates.id,
    candidates.statement_key,
    candidates.title,
    candidates.publication_year,
    candidates.statement_type,
    candidates.binding_nature,
    candidates.geographic_scope,
    candidates.region,
    candidates.country_code,
    candidates.language_code,
    candidates.source_url,
    candidates.abstract,
    candidates.word_count,
    candidates.lifecycle_status,
    candidates.organization,
    candidates.organization_type,
    candidates.organization_subtype,
    candidates.cluster_label,
    candidates.cluster_number,
    candidates.umap_x,
    candidates.umap_y,
    candidates.fingerprint,
    candidates.top_scores,
    candidates.rank,
    count(*) over () as total_count
  from candidates
  order by
    case when p_sort = 'relevance' then candidates.rank end desc,
    case when p_sort = 'year' then candidates.publication_year end desc nulls last,
    case when p_sort = 'title' then candidates.title end asc,
    case when p_sort = 'organization' then candidates.organization end asc,
    candidates.publication_year desc nulls last,
    candidates.title asc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.search_statements(text, text, text, text, text, text, text, int, int)
to anon, authenticated;
