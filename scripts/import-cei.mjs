import { createClient } from '@supabase/supabase-js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SOURCES = {
  statements: 'https://raw.githubusercontent.com/cjimmylin/cei-statements-dashboard-b3/main/data.js',
  fingerprints: 'https://raw.githubusercontent.com/cjimmylin/cei-fingerprint-explorer/main/data.js',
  ontology: 'https://raw.githubusercontent.com/cjimmylin/cei-ontology-explorer/main/index.html',
  taxonomy: 'https://raw.githubusercontent.com/cjimmylin/cei-unified-taxonomy/main/data.js',
}

const args = new Map(process.argv.slice(2).map((arg, index, all) =>
  arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true] : [arg, true]
))
const shouldPush = args.has('--push')
const outputDir = path.resolve(String(args.get('--out') || 'generated'))

const ontologyKeys = [
  'transparency', 'accountability', 'fairness', 'privacy', 'safety', 'human_oversight',
  'beneficence', 'sustainability', 'dignity', 'autonomy', 'solidarity', 'justice', 'trust',
]

const titleCase = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const normalizedName = (value = '') => value.trim().toLowerCase().replace(/\s+/g, ' ')
const validYear = (value) => Number.isInteger(value) && value >= 1900 && value <= 2100 ? value : null
const batches = (items, size = 250) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

async function loadData(source) {
  const text = /^https?:/.test(source)
    ? await fetch(source).then((response) => {
      if (!response.ok) throw new Error(`Failed to fetch ${source}: ${response.status}`)
      return response.text()
    })
    : await readFile(path.resolve(source), 'utf8')
  const json = text.trim().replace(/^const DATA\s*=\s*/, '').replace(/;\s*$/, '')
  return JSON.parse(json)
}

async function loadOntologyData(source) {
  const text = /^https?:/.test(source) ? await fetch(source).then((response) => response.text()) : await readFile(path.resolve(source), 'utf8')
  const match = text.match(/const D\s*=\s*(\{.*\});\s*const L2/s)
  if (!match) throw new Error(`Could not locate ontology data in ${source}`)
  return JSON.parse(match[1])
}

function prepare(statementsData, fingerprintsData, ontologyData, taxonomyData) {
  const details = statementsData.detail
  const statementMap = new Map(statementsData.statements.map((raw) => {
    const detail = details[String(raw.i)] || {}
    return [raw.k, {
      statement_key: raw.k,
      title: raw.t,
      publication_year: validYear(raw.y),
      statement_type: raw.st || null,
      binding_nature: raw.bn || null,
      geographic_scope: raw.gs || null,
      region: raw.rg || null,
      country_code: raw.ct || null,
      language_code: raw.lg || null,
      source_url: detail.url || null,
      abstract: detail.ab || raw.ls || null,
      word_count: raw.wc || null,
      lifecycle_status: raw.ss || null,
      organization: raw.org || 'Unknown organization',
      organization_type: raw.ot || null,
      organization_subtype: raw.os || null,
      source_payload: raw,
      ontology_scores: ontologyKeys.map((key, index) => ({ concept_key: `ontology:${key}`, score: raw.onc[index] || 0 })),
    }]
  }))

  const unifiedSources = taxonomyData.explorer.map((raw) => {
    if (!statementMap.has(raw.key)) {
      statementMap.set(raw.key, {
        statement_key: raw.key,
        title: raw.title,
        publication_year: validYear(raw.year),
        statement_type: raw.stmt_type || null,
        binding_nature: raw.binding || null,
        geographic_scope: raw.geo_scope || null,
        region: raw.region || null,
        country_code: raw.country || null,
        language_code: raw.language || null,
        source_url: null,
        abstract: null,
        word_count: raw.word_count || null,
        lifecycle_status: 'unified_taxonomy',
        organization: raw.org_full || 'Unknown organization',
        organization_type: raw.org_type || null,
        organization_subtype: raw.org_subtype || null,
        source_payload: null,
        ontology_scores: [],
      })
    }
    return { statement_key: raw.key, source_payload: raw }
  })

  const clusterNames = fingerprintsData.clusters.k6.donut.map((item) => item.name)
  fingerprintsData.umapV2.forEach((point) => {
    if (!statementMap.has(point.k)) {
      statementMap.set(point.k, {
        statement_key: point.k,
        title: `Metadata pending for ${point.k}`,
        publication_year: validYear(point.yr),
        statement_type: null,
        binding_nature: null,
        geographic_scope: null,
        region: point.rg || null,
        country_code: null,
        language_code: point.lg || null,
        source_url: null,
        abstract: 'This statement appears in the fingerprint analysis but not in the focused statements dashboard release.',
        word_count: null,
        lifecycle_status: 'metadata_pending',
        organization: 'Metadata pending',
        organization_type: point.ot || null,
        organization_subtype: null,
        source_payload: null,
        ontology_scores: [],
      })
    }
  })

  const statements = [...statementMap.values()]
  const pointByKey = new Map(fingerprintsData.umapV2.map((point, index) => [point.k, { ...point, index }]))
  const fingerprints = statements.flatMap((statement) => {
    const point = pointByKey.get(statement.statement_key)
    if (!point) return []
    return [{
      statement_key: statement.statement_key,
      cluster_number: point.k6,
      cluster_label: clusterNames[point.k6] || `Cluster ${point.k6}`,
      umap_x: point.x,
      umap_y: point.y,
      fingerprint: {
        k5: point.k5,
        k8: point.k8,
        top_dimensions: fingerprintsData.stmtTopDims[point.index],
      },
    }]
  })

  const dimensions = fingerprintsData.dimensions.map((dimension) => ({
    concept_key: `fingerprint:${dimension.f.replace(/^fp_/, '')}`,
    label: titleCase(dimension.f.replace(/^fp_/, '')),
    description: dimension.d,
    taxonomy: 'fingerprint',
    level: 2,
    color: fingerprintsData.layerColors[dimension.l] || null,
    metadata: { layer: dimension.l, retained: dimension.r, weight: dimension.w, standard_deviation: dimension.s },
  }))
  const ontologyConcepts = ontologyKeys.map((key) => ({
    concept_key: `ontology:${key}`,
    label: titleCase(key),
    description: null,
    taxonomy: 'ontology',
    level: 2,
    color: null,
    metadata: {},
  }))
  const taxonomyConcepts = Object.keys(taxonomyData.explorer[0].tax).map((label) => ({
    concept_key: `unified-taxonomy:${label}`,
    label,
    description: null,
    taxonomy: 'unified_taxonomy',
    level: 1,
    color: null,
    metadata: {},
  }))
  const ontologyExplorerConcepts = ontologyData.network.nodes.map((node) => ({
    concept_key: `ontology-explorer:${node.id}`,
    label: node.name,
    description: null,
    taxonomy: 'ontology_explorer',
    level: node.level,
    color: null,
    metadata: { category: node.category, symbol_size: node.symbolSize },
  }))
  const conceptRelationships = ontologyData.network.edges.map((edge) => ({
    source_key: `ontology-explorer:${edge.source}`,
    target_key: `ontology-explorer:${edge.target}`,
    relationship_type: edge.relType,
    condition: edge.condition || null,
  }))
  const unifiedScores = taxonomyData.explorer.flatMap((raw) => [
    ...Object.entries(raw.tax).map(([label, score]) => ({ statement_key: raw.key, concept_key: `unified-taxonomy:${label}`, score })),
    ...Object.entries(raw.ont).map(([key, score]) => ({ statement_key: raw.key, concept_key: `ontology:${key}`, score })),
  ]).filter((item) => item.score > 0)

  const aggregate = statementsData.agg
  const completeMetadata = statements.filter((item) => item.lifecycle_status !== 'metadata_pending').length
  const summary = {
    generated: statementsData.generated,
    totals: {
      statements: statements.length,
      complete_metadata: completeMetadata,
      fingerprint_only: statements.length - completeMetadata,
      fingerprinted: fingerprints.length,
      countries: new Set(statements.map((item) => item.country_code).filter(Boolean)).size,
      organizations: new Set(statements.map((item) => normalizedName(item.organization)).filter(Boolean)).size,
      languages: new Set(statements.map((item) => item.language_code).filter(Boolean)).size,
      legally_binding: aggregate.byBinding.find((item) => item.n === 'legally_binding')?.c || 0,
      policy_families: fingerprintsData.meta.optimalK,
      silhouette: fingerprintsData.meta.silhouetteV2,
    },
    trend: Object.entries(aggregate.byYear).map(([year, value]) => ({ year, statements: value })),
    sectors: aggregate.byOrgType.map((item) => ({ name: titleCase(item.n), value: item.c })),
    clusters: fingerprintsData.clusters.k6.donut.map((cluster) => ({ name: cluster.name, value: cluster.value, color: cluster.itemStyle.color })),
    themes: ontologyKeys.map((key, index) => ({ name: titleCase(key), value: statementsData.ontology.onc.means[index] || 0 })),
    featured: statementsData.statements.slice().sort((a, b) => b.y - a.y || b.i - a.i).slice(0, 30).map((raw) => {
      const statement = statementMap.get(raw.k)
      const fingerprint = fingerprints.find((item) => item.statement_key === raw.k)
      return {
        id: raw.k, title: raw.t, organization: raw.org, year: raw.y, region: raw.rg,
        type: titleCase(raw.st), binding: titleCase(raw.bn), cluster: fingerprint?.cluster_label || 'Not fingerprinted',
        scores: statement.ontology_scores.filter((score) => score.score > 0).sort((a, b) => b.score - a.score).slice(0, 4)
          .map((score) => ({ label: titleCase(score.concept_key.split(':')[1]), value: score.score })),
      }
    }),
  }

  return {
    statements, fingerprints, unifiedSources, unifiedScores, conceptRelationships,
    concepts: [...ontologyConcepts, ...dimensions, ...taxonomyConcepts, ...ontologyExplorerConcepts],
    summary,
  }
}

async function writeArtifacts(data) {
  await mkdir(outputDir, { recursive: true })
  await mkdir(path.resolve('public/data'), { recursive: true })
  await writeFile(path.join(outputDir, 'import-summary.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    statements: data.statements.length,
    fingerprints: data.fingerprints.length,
    concepts: data.concepts.length,
    fingerprint_only_statements: data.summary.totals.fingerprint_only,
    unified_taxonomy_scores: data.unifiedScores.length,
    ontology_relationships: data.conceptRelationships.length,
  }, null, 2))
  await writeFile(path.resolve('public/data/dashboard.json'), JSON.stringify(data.summary))
  await writeFile(path.resolve('public/data/statements.json'), JSON.stringify(data.statements.map((item) => ({
    id: item.statement_key,
    title: item.title,
    organization: item.organization,
    year: item.publication_year,
    region: item.region || 'Unknown',
    type: titleCase(item.statement_type || 'unknown'),
    binding: titleCase(item.binding_nature || 'unknown'),
    cluster: data.fingerprints.find((fingerprint) => fingerprint.statement_key === item.statement_key)?.cluster_label || 'Not fingerprinted',
    metadata_status: item.lifecycle_status === 'metadata_pending' ? 'Pending' : 'Complete',
    scores: item.ontology_scores.filter((score) => score.score > 0).sort((a, b) => b.score - a.score).slice(0, 5)
      .map((score) => ({ label: titleCase(score.concept_key.split(':')[1]), value: score.score })),
  }))))
  await writeFile(path.resolve('public/data/fingerprints.json'), JSON.stringify(data.fingerprints.map((item) => ({
    id: item.statement_key,
    cluster: item.cluster_label,
    cluster_number: item.cluster_number,
    x: item.umap_x,
    y: item.umap_y,
  }))))
}

async function allRows(queryFactory) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await queryFactory(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

async function push(data) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --push')
  const db = createClient(url, key, { auth: { persistSession: false } })

  const releases = [
    { slug: 'statements-b3-2026-03-15', title: 'CEI Statements Dashboard B3', source_repository: 'cjimmylin/cei-statements-dashboard-b3', published_at: '2026-03-15', metadata: { statement_count: 1176 } },
    { slug: 'fingerprints-2026-03-15', title: 'CEI Fingerprint Explorer', source_repository: 'cjimmylin/cei-fingerprint-explorer', published_at: '2026-03-15', metadata: { statement_count: 1405, optimal_k: 6 } },
    { slug: 'ontology-ont3', title: 'CEI Ontology Explorer ont3', source_repository: 'cjimmylin/cei-ontology-explorer', published_at: null, metadata: { relationships: data.conceptRelationships.length } },
    { slug: 'unified-taxonomy-2026-03-15', title: 'CEI Unified Taxonomy', source_repository: 'cjimmylin/cei-unified-taxonomy', published_at: '2026-03-15', metadata: { statement_count: data.unifiedSources.length } },
  ]
  const releaseResult = await db.from('dataset_releases').upsert(releases, { onConflict: 'slug' }).select('id,slug')
  if (releaseResult.error) throw releaseResult.error
  const releaseIds = Object.fromEntries(releaseResult.data.map((row) => [row.slug, row.id]))

  const organizations = [...new Map(data.statements.map((item) => [normalizedName(item.organization), {
    name: item.organization, normalized_name: normalizedName(item.organization), organization_type: item.organization_type,
    organization_subtype: item.organization_subtype, country_code: item.country_code, region: item.region,
  }])).values()]
  for (const batch of batches(organizations)) {
    const { error } = await db.from('organizations').upsert(batch, { onConflict: 'normalized_name' })
    if (error) throw error
  }
  const orgRows = await allRows((from, to) => db.from('organizations').select('id,normalized_name').range(from, to))
  const orgIds = new Map(orgRows.map((row) => [row.normalized_name, row.id]))

  for (const batch of batches(data.statements.map(({ organization, organization_type, organization_subtype, source_payload, ontology_scores, ...item }) => ({
    ...item, organization_id: orgIds.get(normalizedName(organization)),
  })))) {
    const { error } = await db.from('statements').upsert(batch, { onConflict: 'statement_key' })
    if (error) throw error
  }
  const statementRows = await allRows((from, to) => db.from('statements').select('id,statement_key').range(from, to))
  const statementIds = new Map(statementRows.map((row) => [row.statement_key, row.id]))

  const sources = data.statements.filter((item) => item.source_payload).map((item) => ({
    statement_id: statementIds.get(item.statement_key), dataset_release_id: releaseIds['statements-b3-2026-03-15'],
    source_record_key: item.statement_key, source_payload: item.source_payload,
  }))
  for (const batch of batches(sources, 100)) {
    const { error } = await db.from('statement_sources').upsert(batch, { onConflict: 'statement_id,dataset_release_id' })
    if (error) throw error
  }
  const unifiedSources = data.unifiedSources.map((item) => ({
    statement_id: statementIds.get(item.statement_key), dataset_release_id: releaseIds['unified-taxonomy-2026-03-15'],
    source_record_key: item.statement_key, source_payload: item.source_payload,
  }))
  for (const batch of batches(unifiedSources, 100)) {
    const { error } = await db.from('statement_sources').upsert(batch, { onConflict: 'statement_id,dataset_release_id' })
    if (error) throw error
  }

  for (const batch of batches(data.concepts)) {
    const { error } = await db.from('concepts').upsert(batch, { onConflict: 'concept_key' })
    if (error) throw error
  }
  const conceptRows = await allRows((from, to) => db.from('concepts').select('id,concept_key').range(from, to))
  const conceptIds = new Map(conceptRows.map((row) => [row.concept_key, row.id]))
  const relationships = data.conceptRelationships.map((item) => ({
    source_concept_id: conceptIds.get(item.source_key),
    target_concept_id: conceptIds.get(item.target_key),
    relationship_type: item.relationship_type,
    condition: item.condition,
    dataset_release_id: releaseIds['ontology-ont3'],
  }))
  for (const batch of batches(relationships)) {
    const { error } = await db.from('concept_relationships').upsert(batch, { onConflict: 'source_concept_id,target_concept_id,relationship_type,dataset_release_id' })
    if (error) throw error
  }
  const scoreRunResult = await db.from('analysis_runs').upsert({
    dataset_release_id: releaseIds['statements-b3-2026-03-15'], name: 'Statement Ontology Scores', version: 'b3-2026-03-15',
    method: 'CEI ontology scoring', parameters: { concepts: ontologyKeys.length }, metrics: {},
  }, { onConflict: 'name,version' }).select('id').single()
  if (scoreRunResult.error) throw scoreRunResult.error
  const scores = data.statements.flatMap((statement) => statement.ontology_scores.filter((item) => item.score > 0).map((item) => ({
    statement_id: statementIds.get(statement.statement_key),
    concept_id: conceptIds.get(item.concept_key),
    analysis_run_id: scoreRunResult.data.id,
    score: item.score,
  })))
  for (const batch of batches(scores, 500)) {
    const { error } = await db.from('statement_scores').upsert(batch, { onConflict: 'statement_id,concept_id,analysis_run_id' })
    if (error) throw error
  }
  const unifiedRunResult = await db.from('analysis_runs').upsert({
    dataset_release_id: releaseIds['unified-taxonomy-2026-03-15'], name: 'Unified Taxonomy Scores', version: '2026-03-15',
    method: 'CEI unified taxonomy analysis', parameters: {}, metrics: {},
  }, { onConflict: 'name,version' }).select('id').single()
  if (unifiedRunResult.error) throw unifiedRunResult.error
  const unifiedScores = data.unifiedScores.map((item) => ({
    statement_id: statementIds.get(item.statement_key),
    concept_id: conceptIds.get(item.concept_key),
    analysis_run_id: unifiedRunResult.data.id,
    score: item.score,
  }))
  for (const batch of batches(unifiedScores, 500)) {
    const { error } = await db.from('statement_scores').upsert(batch, { onConflict: 'statement_id,concept_id,analysis_run_id' })
    if (error) throw error
  }
  const runResult = await db.from('analysis_runs').upsert({
    dataset_release_id: releaseIds['fingerprints-2026-03-15'], name: 'Statement Fingerprint', version: 'v2-2026-03-15',
    method: 'weighted sparse fingerprint + 10% latent blend + k-means', parameters: { optimal_k: 6 }, metrics: { silhouette: 0.62 },
  }, { onConflict: 'name,version' }).select('id').single()
  if (runResult.error) throw runResult.error
  for (const batch of batches(data.fingerprints.map(({ statement_key, ...item }) => ({
    ...item, statement_id: statementIds.get(statement_key), analysis_run_id: runResult.data.id,
  })))) {
    const { error } = await db.from('statement_fingerprints').upsert(batch, { onConflict: 'statement_id,analysis_run_id' })
    if (error) throw error
  }
}

const statementsSource = String(args.get('--statements') || SOURCES.statements)
const fingerprintsSource = String(args.get('--fingerprints') || SOURCES.fingerprints)
const ontologySource = String(args.get('--ontology') || SOURCES.ontology)
const taxonomySource = String(args.get('--taxonomy') || SOURCES.taxonomy)
console.log(`Loading statements from ${statementsSource}`)
console.log(`Loading fingerprints from ${fingerprintsSource}`)
console.log(`Loading ontology from ${ontologySource}`)
console.log(`Loading taxonomy from ${taxonomySource}`)
const data = prepare(
  await loadData(statementsSource),
  await loadData(fingerprintsSource),
  await loadOntologyData(ontologySource),
  await loadData(taxonomySource),
)
await writeArtifacts(data)
if (shouldPush) await push(data)
console.log(JSON.stringify({ statements: data.statements.length, fingerprints: data.fingerprints.length, concepts: data.concepts.length, pushed: shouldPush }, null, 2))
