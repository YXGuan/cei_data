create table public.dataset_artifacts (
  id uuid primary key default gen_random_uuid(),
  dataset_release_id uuid not null references public.dataset_releases(id) on delete cascade,
  artifact_key text not null,
  media_type text not null default 'application/json',
  sha256 text not null,
  byte_size bigint not null,
  payload jsonb not null,
  imported_at timestamptz not null default now(),
  unique (dataset_release_id, artifact_key)
);

alter table public.dataset_artifacts enable row level security;

create policy "Public dataset artifacts read"
on public.dataset_artifacts
for select
using (true);

grant select on public.dataset_artifacts to anon, authenticated;
