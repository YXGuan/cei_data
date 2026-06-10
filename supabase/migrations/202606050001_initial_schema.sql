create extension if not exists vector with schema extensions;

create table public.dataset_releases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  source_repository text not null,
  source_commit text,
  published_at date,
  imported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  organization_type text,
  organization_subtype text,
  country_code text,
  region text
);

create table public.statements (
  id uuid primary key default gen_random_uuid(),
  statement_key text not null unique,
  title text not null,
  organization_id uuid references public.organizations(id),
  publication_year int check (publication_year between 1900 and 2100),
  statement_type text,
  binding_nature text,
  geographic_scope text,
  region text,
  country_code text,
  language_code text,
  source_url text,
  abstract text,
  full_text text,
  word_count int,
  lifecycle_status text,
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(abstract, '') || ' ' || coalesce(full_text, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index statements_search_idx on public.statements using gin(search_vector);
create index statements_facets_idx on public.statements(publication_year, region, binding_nature, statement_type);

create table public.statement_sources (
  statement_id uuid references public.statements(id) on delete cascade,
  dataset_release_id uuid references public.dataset_releases(id) on delete cascade,
  source_record_key text,
  source_payload jsonb not null default '{}'::jsonb,
  primary key (statement_id, dataset_release_id)
);

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  concept_key text not null unique,
  label text not null,
  description text,
  parent_id uuid references public.concepts(id),
  taxonomy text not null,
  level int not null default 0,
  color text
);

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  dataset_release_id uuid references public.dataset_releases(id),
  name text not null,
  version text not null,
  method text not null,
  parameters jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(name, version)
);

create table public.statement_scores (
  statement_id uuid references public.statements(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete cascade,
  score numeric not null,
  primary key (statement_id, concept_id, analysis_run_id)
);

create table public.statement_fingerprints (
  statement_id uuid references public.statements(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete cascade,
  cluster_label text,
  cluster_number int,
  umap_x real,
  umap_y real,
  embedding extensions.vector(1536),
  fingerprint jsonb not null default '{}'::jsonb,
  primary key (statement_id, analysis_run_id)
);

alter table public.dataset_releases enable row level security;
alter table public.organizations enable row level security;
alter table public.statements enable row level security;
alter table public.statement_sources enable row level security;
alter table public.concepts enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.statement_scores enable row level security;
alter table public.statement_fingerprints enable row level security;

create policy "Public corpus read" on public.dataset_releases for select using (true);
create policy "Public organizations read" on public.organizations for select using (true);
create policy "Public statements read" on public.statements for select using (true);
create policy "Public statement sources read" on public.statement_sources for select using (true);
create policy "Public concepts read" on public.concepts for select using (true);
create policy "Public analysis runs read" on public.analysis_runs for select using (true);
create policy "Public statement scores read" on public.statement_scores for select using (true);
create policy "Public fingerprints read" on public.statement_fingerprints for select using (true);
