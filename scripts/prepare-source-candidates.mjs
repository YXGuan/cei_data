import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const args = new Map(process.argv.slice(2).map((arg, index, all) =>
  arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true] : [arg, true]
))

const seedPath = path.resolve(String(args.get('--seed') || 'data/source-candidates.seed.json'))
const outPath = path.resolve(String(args.get('--out') || 'public/data/source-candidates.json'))
const summaryPath = path.resolve(String(args.get('--summary') || 'generated/source-candidates-summary.json'))
const timeoutMs = Number(args.get('--timeout-ms') || 8000)

const statusRank = { included: 4, approved: 3, under_review: 2, proposed: 1, rejected: 0 }
const validStatuses = new Set(Object.keys(statusRank))

function normalizeText(value = '') {
  return String(value)
    .replaceAll('\u2018', "'")
    .replaceAll('\u2019', "'")
    .replaceAll('\u201c', '"')
    .replaceAll('\u201d', '"')
    .replaceAll('\u2013', '-')
    .replaceAll('\u2014', '-')
    .replaceAll('\u00a0', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeEntities(value = '') {
  return normalizeText(value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_match, entity) => ({
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: ' ',
    })[entity] || _match))
}

function findMeta(html, names) {
  for (const name of names) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i'),
    ]
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match?.[1]) return decodeEntities(match[1])
    }
  }
  return null
}

function findTitle(html) {
  return findMeta(html, ['og:title', 'twitter:title'])
    || decodeEntities(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '')
    || null
}

function findDescription(html) {
  return findMeta(html, ['description', 'og:description', 'twitter:description'])
}

function normalizeUrl(value) {
  const url = new URL(String(value).trim())
  url.hash = ''
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '')
  }
  return url.toString()
}

function normalizeFormats(formats) {
  return [...new Set((formats || []).map((format) => normalizeText(format)).filter(Boolean))]
}

function qualityScore(source, live) {
  const metadata = source.metadata || {}
  const formats = source.formats || []
  const checks = [
    source.title,
    source.publisher,
    source.description && source.description.length >= 40,
    source.coverage,
    source.source_url?.startsWith('https://'),
    source.formats?.length,
    metadata.source_kind,
    metadata.update_cadence,
    metadata.license_status,
    metadata.import_complexity,
    metadata.review_checks?.length,
    metadata.known_gaps?.length,
    live.ok,
  ]
  let score = checks.filter(Boolean).length * 8
  if (!live.ok) score -= 14
  if (!formats.some((format) => /api|data|csv|dataset|explorer/i.test(format))) score -= 8
  if (/review required/i.test(metadata.license_status || '')) score -= 6
  if (metadata.import_complexity === 'high') score -= 10
  if (metadata.known_gaps?.length) score -= 6
  return Math.max(0, Math.min(100, score))
}

function qualityFlags(source, live) {
  const flags = []
  const metadata = source.metadata || {}
  const formats = source.formats || []
  if (!live.ok) flags.push('Live check failed')
  if (!formats.some((format) => /api|data|csv|dataset|explorer/i.test(format))) {
    flags.push('Manual extraction likely')
  }
  if (/review required/i.test(metadata.license_status || '')) flags.push('License review required')
  if (metadata.import_complexity === 'high') flags.push('High import complexity')
  if (metadata.known_gaps?.length) flags.push('Known metadata gaps')
  return [...new Set(flags)]
}

async function fetchLiveMetadata(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const checkedAt = new Date().toISOString()
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'CEI source metadata checker (+https://github.com/cjimmylin)',
      },
    })
    const contentType = response.headers.get('content-type') || null
    const isHtml = contentType?.includes('text/html') || contentType?.includes('application/xhtml')
    const html = isHtml ? await response.text() : ''
    return {
      checked_at: checkedAt,
      ok: response.ok,
      http_status: response.status,
      resolved_url: response.url,
      content_type: contentType,
      last_modified: response.headers.get('last-modified'),
      page_title: isHtml ? findTitle(html) : null,
      meta_description: isHtml ? findDescription(html) : null,
    }
  } catch (error) {
    return {
      checked_at: checkedAt,
      ok: false,
      http_status: null,
      resolved_url: url,
      content_type: null,
      last_modified: null,
      page_title: null,
      meta_description: null,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeSource(raw) {
  const status = validStatuses.has(raw.status) ? raw.status : 'proposed'
  return {
    id: normalizeText(raw.id),
    title: normalizeText(raw.title),
    publisher: raw.publisher ? normalizeText(raw.publisher) : null,
    description: normalizeText(raw.description),
    source_url: normalizeUrl(raw.source_url),
    coverage: raw.coverage ? normalizeText(raw.coverage) : null,
    formats: normalizeFormats(raw.formats),
    status,
    created_at: raw.created_at || new Date().toISOString(),
    vote_count: Number(raw.vote_count || 0),
    user_voted: Boolean(raw.user_voted),
    metadata: raw.metadata || {},
  }
}

const seed = JSON.parse(await readFile(seedPath, 'utf8')).map(normalizeSource)
const enriched = await Promise.all(seed.map(async (source) => {
  const live = await fetchLiveMetadata(source.source_url)
  const metadata = {
    ...source.metadata,
    live,
    metadata_quality_score: qualityScore(source, live),
    quality_flags: qualityFlags(source, live),
  }
  return { ...source, metadata }
}))

enriched.sort((a, b) => (
  statusRank[b.status] - statusRank[a.status]
  || b.vote_count - a.vote_count
  || a.title.localeCompare(b.title)
))

const payload = JSON.stringify(enriched, null, 2)
const summary = {
  generated_at: new Date().toISOString(),
  sources: enriched.length,
  live_ok: enriched.filter((source) => source.metadata.live.ok).length,
  statuses: Object.fromEntries(Object.keys(statusRank).map((status) => [
    status,
    enriched.filter((source) => source.status === status).length,
  ])),
  sha256: createHash('sha256').update(payload).digest('hex'),
  outputs: {
    source_candidates: path.relative(process.cwd(), outPath),
  },
}

await mkdir(path.dirname(outPath), { recursive: true })
await mkdir(path.dirname(summaryPath), { recursive: true })
await writeFile(outPath, `${payload}\n`)
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)

console.log(JSON.stringify(summary, null, 2))
