alter table public.source_requests
add column if not exists metadata jsonb not null default '{}'::jsonb;

drop function if exists public.source_request_feed();

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
  user_voted boolean,
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
    request.coverage,
    request.formats,
    request.status,
    request.created_at,
    count(vote.user_id) as vote_count,
    coalesce(bool_or(vote.user_id = auth.uid()), false) as user_voted,
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

with source_seed (title, publisher, description, source_url, coverage, formats, status, metadata) as (
  values
    (
      'EU AI Act implementation resources',
      'European Commission',
      'Official implementation materials, codes of practice, guidance, and policy updates related to the European Union AI Act.',
      'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
      'European Union',
      array['HTML', 'PDF'],
      'approved',
      '{"source_kind":"Regulatory implementation hub","update_cadence":"Rolling implementation updates","license_status":"Official public web source; reuse terms require review","import_complexity":"medium","priority":"high","review_checks":["Canonical publisher page identified","Jurisdiction coverage normalized","Known overlap with existing CEI EU records"],"known_gaps":["Confirm reuse terms before storing full text","Map implementation updates to existing statement keys"]}'::jsonb
    ),
    (
      'OECD.AI Policy Navigator',
      'OECD.AI',
      'Living repository of national and international AI policy initiatives maintained by OECD.AI contributors and experts.',
      'https://oecd.ai/en/dashboards/overview',
      'Global policy initiatives',
      array['HTML', 'Data explorer'],
      'under_review',
      '{"source_kind":"Policy navigator","update_cadence":"Regularly updated","license_status":"Public web source; data reuse terms require review","import_complexity":"high","priority":"high","review_checks":["Canonical policy navigator identified","Global coverage normalized","Candidate duplicate matching against existing CEI records"],"known_gaps":["Determine stable record-level export path","Confirm attribution and reuse requirements"]}'::jsonb
    ),
    (
      'NIST AI Risk Management Framework resources',
      'National Institute of Standards and Technology',
      'Framework, playbook, profiles, crosswalks, and supporting resources for voluntary AI risk management practice.',
      'https://www.nist.gov/itl/ai-risk-management-framework',
      'United States and international practice',
      array['HTML', 'PDF'],
      'approved',
      '{"source_kind":"Risk management framework hub","update_cadence":"Framework and profile updates","license_status":"US government public source; citation and downstream reuse review still required","import_complexity":"medium","priority":"high","review_checks":["Canonical .gov page identified","Resource family grouped under one source","Existing CEI NIST records likely matchable"],"known_gaps":["Split framework, profiles, and playbook into separate records","Capture version dates for each PDF resource"]}'::jsonb
    ),
    (
      'Council of Europe Framework Convention on AI',
      'Council of Europe',
      'Official treaty page for the Framework Convention on Artificial Intelligence, Human Rights, Democracy and the Rule of Law.',
      'https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence',
      'Council of Europe and treaty signatories',
      array['HTML', 'PDF'],
      'under_review',
      '{"source_kind":"Treaty source","update_cadence":"Treaty status and implementation updates","license_status":"Official public web source; treaty text reuse terms require review","import_complexity":"medium","priority":"high","review_checks":["Canonical treaty page identified","Coverage field names treaty scope","High-value provenance target for legal instruments"],"known_gaps":["Capture signatory status separately from treaty text","Reconcile national implementation documents"]}'::jsonb
    ),
    (
      'UNESCO Recommendation on the Ethics of AI',
      'UNESCO',
      'Global AI ethics standard, implementation resources, readiness methodology, and impact assessment materials from UNESCO.',
      'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics',
      'UNESCO member states',
      array['HTML', 'PDF', 'Toolkit'],
      'approved',
      '{"source_kind":"International standard and implementation toolkit","update_cadence":"Program and implementation updates","license_status":"Official public web source; publication reuse terms require review","import_complexity":"medium","priority":"high","review_checks":["Canonical UNESCO page identified","Implementation methods noted as separate artifacts","Global coverage normalized"],"known_gaps":["Separate recommendation text from implementation tools","Track multilingual resource variants"]}'::jsonb
    ),
    (
      'Global Index on Responsible AI',
      'Global Center on AI Governance',
      'Country-level responsible AI index tracking policy, capability, and safeguard indicators across a broad global sample.',
      'https://www.global-index.ai/',
      'Global country index',
      array['HTML', 'Dataset candidate', 'Report'],
      'proposed',
      '{"source_kind":"Comparative governance index","update_cadence":"Periodic report releases","license_status":"Reuse terms require review","import_complexity":"high","priority":"medium","review_checks":["Canonical index page identified","Coverage normalized as country-level comparative data","Potential value for benchmarking records"],"known_gaps":["Confirm whether record-level data is downloadable","Keep index indicators separate from source policy records"]}'::jsonb
    ),
    (
      'CAIDP Artificial Intelligence and Democratic Values Index',
      'Center for AI and Digital Policy',
      'Annual comparative review of national AI policies, democratic governance, human rights, and rule-of-law alignment.',
      'https://www.caidp.org/reports/caidp-index-2025/',
      'Global country index',
      array['HTML', 'Report'],
      'proposed',
      '{"source_kind":"Comparative policy index","update_cadence":"Annual report releases","license_status":"Reuse terms require review","import_complexity":"medium","priority":"medium","review_checks":["Canonical report page identified","Coverage normalized as country-level comparative data","Useful for evaluation context rather than canonical statements"],"known_gaps":["Confirm report licensing","Model country scores separately from statement records"]}'::jsonb
    ),
    (
      'Stanford AI Index Report',
      'Stanford Institute for Human-Centered AI',
      'Annual report and supporting analysis on AI trends, including policy, regulation, public opinion, and technical indicators.',
      'https://aiindex.stanford.edu/report/',
      'Global AI trend indicators',
      array['HTML', 'PDF', 'Dataset candidate'],
      'proposed',
      '{"source_kind":"Annual trend report","update_cadence":"Annual report releases","license_status":"Reuse terms require review","import_complexity":"medium","priority":"medium","review_checks":["Canonical report page identified","Can enrich policy context and trend metadata","Should remain separate from canonical policy sources"],"known_gaps":["Identify stable table/data downloads","Avoid mixing trend indicators with statement provenance"]}'::jsonb
    )
)
insert into public.source_requests
  (title, publisher, description, source_url, coverage, formats, status, metadata)
select title, publisher, description, source_url, coverage, formats, status, metadata
from source_seed
on conflict do nothing;

with source_seed (title, publisher, description, source_url, coverage, formats, status, metadata) as (
  values
    ('EU AI Act implementation resources', 'European Commission', 'Official implementation materials, codes of practice, guidance, and policy updates related to the European Union AI Act.', 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai', 'European Union', array['HTML', 'PDF'], 'approved', '{"source_kind":"Regulatory implementation hub","update_cadence":"Rolling implementation updates","license_status":"Official public web source; reuse terms require review","import_complexity":"medium","priority":"high","review_checks":["Canonical publisher page identified","Jurisdiction coverage normalized","Known overlap with existing CEI EU records"],"known_gaps":["Confirm reuse terms before storing full text","Map implementation updates to existing statement keys"]}'::jsonb),
    ('OECD.AI Policy Navigator', 'OECD.AI', 'Living repository of national and international AI policy initiatives maintained by OECD.AI contributors and experts.', 'https://oecd.ai/en/dashboards/overview', 'Global policy initiatives', array['HTML', 'Data explorer'], 'under_review', '{"source_kind":"Policy navigator","update_cadence":"Regularly updated","license_status":"Public web source; data reuse terms require review","import_complexity":"high","priority":"high","review_checks":["Canonical policy navigator identified","Global coverage normalized","Candidate duplicate matching against existing CEI records"],"known_gaps":["Determine stable record-level export path","Confirm attribution and reuse requirements"]}'::jsonb),
    ('NIST AI Risk Management Framework resources', 'National Institute of Standards and Technology', 'Framework, playbook, profiles, crosswalks, and supporting resources for voluntary AI risk management practice.', 'https://www.nist.gov/itl/ai-risk-management-framework', 'United States and international practice', array['HTML', 'PDF'], 'approved', '{"source_kind":"Risk management framework hub","update_cadence":"Framework and profile updates","license_status":"US government public source; citation and downstream reuse review still required","import_complexity":"medium","priority":"high","review_checks":["Canonical .gov page identified","Resource family grouped under one source","Existing CEI NIST records likely matchable"],"known_gaps":["Split framework, profiles, and playbook into separate records","Capture version dates for each PDF resource"]}'::jsonb),
    ('Council of Europe Framework Convention on AI', 'Council of Europe', 'Official treaty page for the Framework Convention on Artificial Intelligence, Human Rights, Democracy and the Rule of Law.', 'https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence', 'Council of Europe and treaty signatories', array['HTML', 'PDF'], 'under_review', '{"source_kind":"Treaty source","update_cadence":"Treaty status and implementation updates","license_status":"Official public web source; treaty text reuse terms require review","import_complexity":"medium","priority":"high","review_checks":["Canonical treaty page identified","Coverage field names treaty scope","High-value provenance target for legal instruments"],"known_gaps":["Capture signatory status separately from treaty text","Reconcile national implementation documents"]}'::jsonb),
    ('UNESCO Recommendation on the Ethics of AI', 'UNESCO', 'Global AI ethics standard, implementation resources, readiness methodology, and impact assessment materials from UNESCO.', 'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics', 'UNESCO member states', array['HTML', 'PDF', 'Toolkit'], 'approved', '{"source_kind":"International standard and implementation toolkit","update_cadence":"Program and implementation updates","license_status":"Official public web source; publication reuse terms require review","import_complexity":"medium","priority":"high","review_checks":["Canonical UNESCO page identified","Implementation methods noted as separate artifacts","Global coverage normalized"],"known_gaps":["Separate recommendation text from implementation tools","Track multilingual resource variants"]}'::jsonb),
    ('Global Index on Responsible AI', 'Global Center on AI Governance', 'Country-level responsible AI index tracking policy, capability, and safeguard indicators across a broad global sample.', 'https://www.global-index.ai/', 'Global country index', array['HTML', 'Dataset candidate', 'Report'], 'proposed', '{"source_kind":"Comparative governance index","update_cadence":"Periodic report releases","license_status":"Reuse terms require review","import_complexity":"high","priority":"medium","review_checks":["Canonical index page identified","Coverage normalized as country-level comparative data","Potential value for benchmarking records"],"known_gaps":["Confirm whether record-level data is downloadable","Keep index indicators separate from source policy records"]}'::jsonb),
    ('CAIDP Artificial Intelligence and Democratic Values Index', 'Center for AI and Digital Policy', 'Annual comparative review of national AI policies, democratic governance, human rights, and rule-of-law alignment.', 'https://www.caidp.org/reports/caidp-index-2025/', 'Global country index', array['HTML', 'Report'], 'proposed', '{"source_kind":"Comparative policy index","update_cadence":"Annual report releases","license_status":"Reuse terms require review","import_complexity":"medium","priority":"medium","review_checks":["Canonical report page identified","Coverage normalized as country-level comparative data","Useful for evaluation context rather than canonical statements"],"known_gaps":["Confirm report licensing","Model country scores separately from statement records"]}'::jsonb),
    ('Stanford AI Index Report', 'Stanford Institute for Human-Centered AI', 'Annual report and supporting analysis on AI trends, including policy, regulation, public opinion, and technical indicators.', 'https://aiindex.stanford.edu/report/', 'Global AI trend indicators', array['HTML', 'PDF', 'Dataset candidate'], 'proposed', '{"source_kind":"Annual trend report","update_cadence":"Annual report releases","license_status":"Reuse terms require review","import_complexity":"medium","priority":"medium","review_checks":["Canonical report page identified","Can enrich policy context and trend metadata","Should remain separate from canonical policy sources"],"known_gaps":["Identify stable table/data downloads","Avoid mixing trend indicators with statement provenance"]}'::jsonb)
)
update public.source_requests request
set
  title = seed.title,
  publisher = seed.publisher,
  description = seed.description,
  coverage = seed.coverage,
  formats = seed.formats,
  status = seed.status,
  metadata = seed.metadata,
  updated_at = now()
from source_seed seed
where lower(request.source_url) = lower(seed.source_url);

update public.source_requests
set metadata = metadata || jsonb_build_object(
  'metadata_quality_score',
  case
    when source_url = 'https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence' then 68
    when source_url = 'https://aiindex.stanford.edu/report/' then 98
    when metadata ->> 'import_complexity' = 'high' then 88
    else 90
  end,
  'quality_flags',
  case
    when source_url = 'https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence' then
      '["Live check failed","Manual extraction likely","Known metadata gaps"]'::jsonb
    when source_url = 'https://aiindex.stanford.edu/report/' then
      '["Known metadata gaps"]'::jsonb
    when metadata ->> 'import_complexity' = 'high' then
      '["High import complexity","Known metadata gaps"]'::jsonb
    else
      '["Manual extraction likely","Known metadata gaps"]'::jsonb
  end
)
where source_url in (
  'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
  'https://oecd.ai/en/dashboards/overview',
  'https://www.nist.gov/itl/ai-risk-management-framework',
  'https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence',
  'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics',
  'https://www.global-index.ai/',
  'https://www.caidp.org/reports/caidp-index-2025/',
  'https://aiindex.stanford.edu/report/'
);
