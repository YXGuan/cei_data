alter table public.source_requests
add column if not exists canonical_url text,
add column if not exists source_type text,
add column if not exists aliases text[] not null default '{}',
add column if not exists identifiers jsonb not null default '[]'::jsonb,
add column if not exists license_review_status text not null default 'needs_review'
  check (license_review_status in ('needs_review', 'in_progress', 'approved', 'blocked', 'not_applicable')),
add column if not exists dedupe_review_status text not null default 'needs_review'
  check (dedupe_review_status in ('needs_review', 'in_progress', 'approved', 'blocked', 'not_applicable')),
add column if not exists recommended_action text not null default 'source_registry_only'
  check (recommended_action in ('monitor_only', 'source_registry_only', 'index_metadata', 'index_records', 'index_full_text')),
add column if not exists assigned_reviewer uuid references public.profiles(id) on delete set null,
add column if not exists reviewed_at timestamptz;

create table if not exists public.external_sources (
  id uuid primary key default gen_random_uuid(),
  source_slug text not null unique,
  title text not null,
  publisher text,
  canonical_url text not null,
  source_type text not null,
  coverage text,
  formats text[] not null default '{}',
  status text not null default 'proposed'
    check (status in ('proposed', 'under_review', 'approved', 'included', 'rejected')),
  import_complexity text,
  update_cadence text,
  license_status text,
  license_review_status text not null default 'needs_review'
    check (license_review_status in ('needs_review', 'in_progress', 'approved', 'blocked', 'not_applicable')),
  dedupe_review_status text not null default 'needs_review'
    check (dedupe_review_status in ('needs_review', 'in_progress', 'approved', 'blocked', 'not_applicable')),
  recommended_action text not null default 'source_registry_only'
    check (recommended_action in ('monitor_only', 'source_registry_only', 'index_metadata', 'index_records', 'index_full_text')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_source_identifiers (
  id uuid primary key default gen_random_uuid(),
  external_source_id uuid references public.external_sources(id) on delete cascade,
  identifier_type text not null,
  identifier_value text not null,
  url text,
  created_at timestamptz not null default now(),
  unique (external_source_id, identifier_type, identifier_value)
);

create table if not exists public.external_source_checks (
  id uuid primary key default gen_random_uuid(),
  external_source_id uuid references public.external_sources(id) on delete cascade,
  provider text not null,
  checked_at timestamptz not null default now(),
  ok boolean not null,
  http_status integer,
  resolved_url text,
  content_type text,
  last_modified text,
  page_title text,
  meta_description text,
  raw_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.external_source_popularity_signals (
  id uuid primary key default gen_random_uuid(),
  source_slug text not null,
  provider text not null,
  metric text not null,
  value numeric not null,
  observed_at timestamptz not null,
  url text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists external_source_popularity_source_idx
on public.external_source_popularity_signals (source_slug, provider, metric, observed_at desc);

create table if not exists public.external_source_indexing_status (
  external_source_id uuid primary key references public.external_sources(id) on delete cascade,
  indexing_status text not null
    check (indexing_status in ('not_found', 'source_candidate_only', 'partially_indexed', 'indexed_as_records', 'indexed_as_source_release')),
  matched_statement_ids text[] not null default '{}',
  partial_statement_ids text[] not null default '{}',
  evidence text[] not null default '{}',
  checked_at timestamptz not null default now()
);

alter table public.external_sources enable row level security;
alter table public.external_source_identifiers enable row level security;
alter table public.external_source_checks enable row level security;
alter table public.external_source_popularity_signals enable row level security;
alter table public.external_source_indexing_status enable row level security;

drop policy if exists "Public external sources read" on public.external_sources;
create policy "Public external sources read" on public.external_sources for select using (status <> 'rejected' or public.is_admin());

drop policy if exists "Admins manage external sources" on public.external_sources;
create policy "Admins manage external sources" on public.external_sources for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public external source identifiers read" on public.external_source_identifiers;
create policy "Public external source identifiers read" on public.external_source_identifiers for select using (true);

drop policy if exists "Public external source checks read" on public.external_source_checks;
create policy "Public external source checks read" on public.external_source_checks for select using (true);

drop policy if exists "Public external source signals read" on public.external_source_popularity_signals;
create policy "Public external source signals read" on public.external_source_popularity_signals for select using (true);

drop policy if exists "Public external source indexing read" on public.external_source_indexing_status;
create policy "Public external source indexing read" on public.external_source_indexing_status for select using (true);

insert into public.source_requests
  (title, publisher, description, source_url, canonical_url, source_type, coverage, formats, status, aliases, identifiers, metadata, recommended_action)
values
  (
    'AI Incident Database',
    'Responsible AI Collaborative',
    'Public database of real-world AI harms and near harms, including incident reports, classifications, and links to supporting evidence.',
    'https://incidentdatabase.ai/',
    'https://incidentdatabase.ai/',
    'Incident database',
    'Global AI incidents',
    array['HTML', 'Database', 'GitHub'],
    'proposed',
    array['Artificial Intelligence Incident Database', 'AIID', 'Responsible AI Collaborative'],
    '[{"identifier_type":"github_repo","identifier_value":"responsible-ai-collaborative/aiid","url":"https://github.com/responsible-ai-collaborative/aiid"}]'::jsonb,
    '{"source_kind":"Incident database","update_cadence":"Continuously updated","license_status":"Public web source; database reuse terms require review","import_complexity":"high","priority":"medium"}'::jsonb,
    'monitor_only'
  ),
  (
    'AGORA AI Governance and Regulatory Archive',
    'Emerging Technology Observatory',
    'Living collection of AI-relevant laws, regulations, standards, document text, metadata, summaries, and thematic tags.',
    'https://agora.eto.tech/',
    'https://agora.eto.tech/',
    'Governance document archive',
    'United States and global AI governance documents',
    array['HTML', 'Bulk dataset', 'Zenodo', 'Document text'],
    'under_review',
    array['AGORA', 'AI GOvernance and Regulatory Archive', 'AI Governance and Regulatory Archive'],
    '[{"identifier_type":"zenodo_record","identifier_value":"15964829","url":"https://zenodo.org/records/15964829"},{"identifier_type":"doi","identifier_value":"10.5281/zenodo.15964829","url":"https://doi.org/10.5281/zenodo.15964829"}]'::jsonb,
    '{"source_kind":"Governance document archive","update_cadence":"Regularly updated","license_status":"Bulk dataset is public; license and attribution terms require review","import_complexity":"medium","priority":"high"}'::jsonb,
    'index_metadata'
  ),
  (
    'OECD.AI Index',
    'OECD.AI',
    'Composite measurement framework for national AI capabilities and implementation progress using indicators from the OECD.AI Policy Observatory.',
    'https://oecd.ai/en/site/ai-index',
    'https://oecd.ai/en/site/ai-index',
    'Comparative AI index',
    'OECD and partner country AI ecosystem indicators',
    array['HTML', 'Report', 'Indicators'],
    'proposed',
    array['OECD AI Index', 'OECD AI Observatory Index', 'The OECD.AI Index'],
    '[]'::jsonb,
    '{"source_kind":"Comparative AI index","update_cadence":"Periodic index releases","license_status":"Public OECD source; reuse terms require review","import_complexity":"medium","priority":"medium"}'::jsonb,
    'source_registry_only'
  )
on conflict do nothing;

insert into public.external_sources
  (source_slug, title, publisher, canonical_url, source_type, coverage, formats, status, import_complexity, update_cadence, license_status, license_review_status, dedupe_review_status, recommended_action, metadata)
select
  coalesce(nullif(regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'), ''), id::text),
  title,
  publisher,
  coalesce(canonical_url, source_url),
  coalesce(source_type, metadata ->> 'source_kind', 'External source'),
  coverage,
  formats,
  status,
  metadata ->> 'import_complexity',
  metadata ->> 'update_cadence',
  metadata ->> 'license_status',
  license_review_status,
  dedupe_review_status,
  recommended_action,
  metadata
from public.source_requests
on conflict (source_slug) do update set
  title = excluded.title,
  publisher = excluded.publisher,
  canonical_url = excluded.canonical_url,
  source_type = excluded.source_type,
  coverage = excluded.coverage,
  formats = excluded.formats,
  status = excluded.status,
  import_complexity = excluded.import_complexity,
  update_cadence = excluded.update_cadence,
  license_status = excluded.license_status,
  license_review_status = excluded.license_review_status,
  dedupe_review_status = excluded.dedupe_review_status,
  recommended_action = excluded.recommended_action,
  metadata = excluded.metadata,
  updated_at = now();

drop function if exists public.source_request_feed();

create or replace function public.source_request_feed()
returns table (
  id uuid,
  title text,
  publisher text,
  description text,
  source_url text,
  canonical_url text,
  source_type text,
  coverage text,
  formats text[],
  status text,
  created_at timestamptz,
  vote_count bigint,
  user_voted boolean,
  aliases text[],
  identifiers jsonb,
  license_review_status text,
  dedupe_review_status text,
  recommended_action text,
  assigned_reviewer uuid,
  admin_notes text,
  reviewed_at timestamptz,
  metadata jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    request.id,
    request.title,
    request.publisher,
    request.description,
    request.source_url,
    coalesce(request.canonical_url, request.source_url),
    coalesce(request.source_type, request.metadata ->> 'source_kind', 'External source'),
    request.coverage,
    request.formats,
    request.status,
    request.created_at,
    count(vote.user_id) as vote_count,
    coalesce(bool_or(vote.user_id = auth.uid()), false) as user_voted,
    request.aliases,
    request.identifiers,
    request.license_review_status,
    request.dedupe_review_status,
    request.recommended_action,
    request.assigned_reviewer,
    request.admin_notes,
    request.reviewed_at,
    request.metadata
  from public.source_requests request
  left join public.source_request_votes vote on vote.source_request_id = request.id
  where request.status <> 'rejected' or public.is_admin()
  group by request.id
  order by
    case request.status
      when 'included' then 4
      when 'approved' then 3
      when 'under_review' then 2
      else 1
    end desc,
    count(vote.user_id) desc,
    request.created_at desc;
$$;

grant execute on function public.source_request_feed() to anon, authenticated;
