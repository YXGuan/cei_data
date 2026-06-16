import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { collectDataCiteSignals } from './lib/providers/datacite.mjs'
import { collectGithubSignals } from './lib/providers/github.mjs'
import { collectHuggingFaceSignals } from './lib/providers/huggingface.mjs'
import { collectOpenAlexSignals } from './lib/providers/openalex.mjs'
import { collectSemanticScholarSignals } from './lib/providers/semanticscholar.mjs'
import { collectZenodoSignals } from './lib/providers/zenodo.mjs'

const args = new Map(process.argv.slice(2).map((arg, index, all) =>
  arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true] : [arg, true]
))

const sourcePath = path.resolve(String(args.get('--sources') || 'public/data/source-candidates.json'))
const outPath = path.resolve(String(args.get('--out') || 'generated/source-signals.json'))
const publicOutPath = path.resolve(String(args.get('--public-out') || 'public/data/source-signals.json'))
const timeoutMs = Number(args.get('--timeout-ms') || 10000)
const shouldPush = args.has('--push')

async function fetchJson(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function collectForSource(source) {
  const context = { fetchJson }
  const providers = [
    collectGithubSignals,
    collectHuggingFaceSignals,
    collectOpenAlexSignals,
    collectSemanticScholarSignals,
    collectDataCiteSignals,
    collectZenodoSignals,
  ]
  const groups = await Promise.all(providers.map(async (provider) => {
    try {
      return await provider(source, context)
    } catch {
      return []
    }
  }))
  return groups.flat()
}

async function pushSignals(signals) {
  const url = process.env.SUPABASE_URL_CEI || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY_CEI || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL_CEI and SUPABASE_SERVICE_ROLE_KEY_CEI are required for --push.')
  }
  const db = createClient(url, key, { auth: { persistSession: false } })
  const rows = signals.map(({ source_id, raw_payload, ...signal }) => ({
    source_slug: source_id,
    raw_payload,
    ...signal,
  }))
  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await db.from('external_source_popularity_signals').insert(rows.slice(index, index + 100))
    if (error) throw error
  }
}

const sources = JSON.parse(await readFile(sourcePath, 'utf8'))
const signals = (await Promise.all(sources.map(collectForSource))).flat()
signals.sort((a, b) => (
  a.source_id.localeCompare(b.source_id)
  || a.provider.localeCompare(b.provider)
  || a.metric.localeCompare(b.metric)
))

const payload = JSON.stringify(signals, null, 2)
const publicSignals = signals.map(({ raw_payload, ...signal }) => signal)
const publicPayload = JSON.stringify(publicSignals, null, 2)
const summary = {
  generated_at: new Date().toISOString(),
  sources_checked: sources.length,
  signals: signals.length,
  providers: [...new Set(signals.map((signal) => signal.provider))].sort(),
  metrics: [...new Set(signals.map((signal) => signal.metric))].sort(),
  sha256: createHash('sha256').update(payload).digest('hex'),
  outputs: {
    source_signals: path.relative(process.cwd(), outPath),
    public_source_signals: path.relative(process.cwd(), publicOutPath),
  },
  pushed: shouldPush,
}

await mkdir(path.dirname(outPath), { recursive: true })
await mkdir(path.dirname(publicOutPath), { recursive: true })
await writeFile(outPath, `${payload}\n`)
await writeFile(publicOutPath, `${publicPayload}\n`)
if (shouldPush) await pushSignals(signals)

console.log(JSON.stringify(summary, null, 2))
