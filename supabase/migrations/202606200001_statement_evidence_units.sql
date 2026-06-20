create table public.statement_evidence_units (
  id uuid primary key default gen_random_uuid(),
  evidence_key text not null unique,
  statement_id uuid not null references public.statements(id) on delete cascade,
  parent_evidence_key text,
  source_url text,
  section_path text[] not null default '{}'::text[],
  evidence_kind text not null
    check (evidence_kind in ('metadata', 'abstract', 'source_text', 'concept_scores')),
  granularity text not null
    check (granularity in ('sentence', 'bullet', 'clause', 'paragraph', 'table_row')),
  chunk_text text not null,
  expanded_context text not null,
  char_start int,
  char_end int,
  token_count int,
  content_hash text not null,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(array_to_string(section_path, ' '), '')
      || ' ' || coalesce(chunk_text, '')
      || ' ' || coalesce(expanded_context, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index statement_evidence_units_statement_idx
  on public.statement_evidence_units(statement_id);
create index statement_evidence_units_kind_idx
  on public.statement_evidence_units(evidence_kind, granularity);
create index statement_evidence_units_search_idx
  on public.statement_evidence_units using gin(search_vector);
create index statement_evidence_units_embedding_idx
  on public.statement_evidence_units
  using ivfflat (embedding vector_cosine_ops)
  where embedding is not null;

alter table public.statement_evidence_units enable row level security;

create policy "Public evidence units read"
  on public.statement_evidence_units for select using (true);

create or replace function public.retrieve_evidence_units(
  p_query text default '',
  p_region text default null,
  p_statement_type text default null,
  p_binding_nature text default null,
  p_organization_type text default null,
  p_evidence_kind text default null,
  p_limit int default 10,
  p_query_embedding extensions.vector(1536) default null
)
returns table (
  evidence_key text,
  statement_key text,
  title text,
  organization text,
  publication_year int,
  region text,
  statement_type text,
  binding_nature text,
  source_url text,
  section_path text[],
  parent_evidence_key text,
  evidence_kind text,
  granularity text,
  chunk_text text,
  expanded_context text,
  char_start int,
  char_end int,
  token_count int,
  content_hash text,
  metadata jsonb,
  lexical_rank real,
  semantic_rank real,
  combined_rank real
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
      eu.*,
      s.statement_key,
      s.title,
      s.publication_year,
      s.statement_type,
      s.binding_nature,
      s.region,
      o.name as organization,
      o.organization_type,
      case when params.query is null then 0
        else ts_rank_cd(eu.search_vector, params.query, 32)
      end::real as lexical_rank,
      case when p_query_embedding is null or eu.embedding is null then 0
        else (1 - (eu.embedding <=> p_query_embedding))
      end::real as semantic_rank
    from public.statement_evidence_units eu
    join public.statements s on s.id = eu.statement_id
    left join public.organizations o on o.id = s.organization_id
    cross join params
    where
      (p_region is null or s.region = p_region)
      and (p_statement_type is null or s.statement_type = p_statement_type)
      and (p_binding_nature is null or s.binding_nature = p_binding_nature)
      and (p_organization_type is null or o.organization_type = p_organization_type)
      and (p_evidence_kind is null or eu.evidence_kind = p_evidence_kind)
      and (
        params.query is null
        or eu.search_vector @@ params.query
        or lower(s.statement_key) = lower(params.query_text)
        or lower(s.title) like '%' || lower(params.query_text) || '%'
        or lower(coalesce(o.name, '')) like '%' || lower(params.query_text) || '%'
        or lower(eu.chunk_text) like '%' || lower(params.query_text) || '%'
        or lower(eu.expanded_context) like '%' || lower(params.query_text) || '%'
        or (p_query_embedding is not null and eu.embedding is not null)
      )
  )
  select
    candidates.evidence_key,
    candidates.statement_key,
    candidates.title,
    candidates.organization,
    candidates.publication_year,
    candidates.region,
    candidates.statement_type,
    candidates.binding_nature,
    candidates.source_url,
    candidates.section_path,
    candidates.parent_evidence_key,
    candidates.evidence_kind,
    candidates.granularity,
    candidates.chunk_text,
    candidates.expanded_context,
    candidates.char_start,
    candidates.char_end,
    candidates.token_count,
    candidates.content_hash,
    candidates.metadata,
    candidates.lexical_rank,
    candidates.semantic_rank,
    (
      candidates.lexical_rank
      + case when candidates.semantic_rank > 0 then candidates.semantic_rank * 0.35 else 0 end
    )::real as combined_rank
  from candidates
  order by combined_rank desc, publication_year desc nulls last, title asc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

grant select on public.statement_evidence_units to anon, authenticated;
grant execute on function public.retrieve_evidence_units(text, text, text, text, text, text, int, extensions.vector)
to anon, authenticated;
