create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, display_name)
select id, email, coalesce(raw_user_meta_data ->> 'display_name', split_part(coalesce(email, ''), '@', 1))
from auth.users
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create table public.source_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 180),
  publisher text,
  description text not null check (char_length(description) between 20 and 2000),
  source_url text not null,
  coverage text,
  formats text[] not null default '{}',
  status text not null default 'proposed'
    check (status in ('proposed', 'under_review', 'approved', 'included', 'rejected')),
  submitted_by uuid references public.profiles(id) on delete set null,
  admin_notes text,
  included_release_id uuid references public.dataset_releases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index source_requests_source_url_unique on public.source_requests (lower(source_url));
create index source_requests_status_created_idx on public.source_requests (status, created_at desc);

create table public.source_request_votes (
  source_request_id uuid references public.source_requests(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (source_request_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.source_requests enable row level security;
alter table public.source_request_votes enable row level security;

create policy "Users can read their own profile"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "Visible source requests are public"
on public.source_requests for select
using (status <> 'rejected' or public.is_admin());

create policy "Invited users can propose sources"
on public.source_requests for insert
to authenticated
with check (submitted_by = auth.uid() and status = 'proposed');

create policy "Admins manage source requests"
on public.source_requests for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins delete source requests"
on public.source_requests for delete
to authenticated
using (public.is_admin());

create policy "Users can read their own votes"
on public.source_request_votes for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Users can add their own votes"
on public.source_request_votes for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can remove their own votes"
on public.source_request_votes for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.source_request_feed()
returns table (
  id uuid,
  title text,
  publisher text,
  description text,
  source_url text,
  coverage text,
  formats text[],
  status text,
  created_at timestamptz,
  vote_count bigint,
  user_voted boolean
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
    request.coverage,
    request.formats,
    request.status,
    request.created_at,
    count(vote.user_id) as vote_count,
    coalesce(bool_or(vote.user_id = auth.uid()), false) as user_voted
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

create or replace function public.toggle_source_request_vote(p_source_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.source_requests
    where id = p_source_request_id and status <> 'rejected'
  ) then
    raise exception 'Source request is not available for voting';
  end if;

  if exists (
    select 1 from public.source_request_votes
    where source_request_id = p_source_request_id and user_id = auth.uid()
  ) then
    delete from public.source_request_votes
    where source_request_id = p_source_request_id and user_id = auth.uid();
    return false;
  end if;

  insert into public.source_request_votes (source_request_id, user_id)
  values (p_source_request_id, auth.uid());
  return true;
end;
$$;

grant select on public.profiles to authenticated;
grant select on public.source_requests to anon, authenticated;
grant insert, update, delete on public.source_requests to authenticated;
grant select, insert, delete on public.source_request_votes to authenticated;
grant execute on function public.source_request_feed() to anon, authenticated;
grant execute on function public.toggle_source_request_vote(uuid) to authenticated;

insert into public.source_requests
  (title, publisher, description, source_url, coverage, formats, status)
values
  (
    'OECD AI Policy Observatory',
    'OECD.AI',
    'Policy initiatives, national strategies, and governance instruments from the OECD AI Policy Observatory.',
    'https://oecd.ai/en/dashboards/overview',
    'Global policy initiatives',
    array['API', 'HTML'],
    'under_review'
  ),
  (
    'NIST AI Risk Management Framework resources',
    'National Institute of Standards and Technology',
    'Implementation resources, profiles, and supporting documents associated with the NIST AI Risk Management Framework.',
    'https://www.nist.gov/itl/ai-risk-management-framework',
    'United States and international practice',
    array['PDF', 'HTML'],
    'proposed'
  ),
  (
    'EU AI Act implementation resources',
    'European Commission',
    'Official implementation materials, codes of practice, and guidance related to the European Union AI Act.',
    'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
    'European Union',
    array['PDF', 'HTML'],
    'approved'
  )
on conflict do nothing;
