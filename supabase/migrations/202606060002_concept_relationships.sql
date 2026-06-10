create table public.concept_relationships (
  source_concept_id uuid references public.concepts(id) on delete cascade,
  target_concept_id uuid references public.concepts(id) on delete cascade,
  relationship_type text not null,
  condition text,
  dataset_release_id uuid references public.dataset_releases(id) on delete cascade,
  primary key (source_concept_id, target_concept_id, relationship_type, dataset_release_id)
);

alter table public.concept_relationships enable row level security;

create policy "Public concept relationships read"
on public.concept_relationships
for select
using (true);

grant select on public.concept_relationships to anon, authenticated;
