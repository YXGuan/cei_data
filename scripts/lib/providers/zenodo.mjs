import { identifiersByType } from '../source-identifiers.mjs'

function signal(source, metric, value, url, raw) {
  if (!Number.isFinite(value)) return null
  return {
    source_id: source.id,
    provider: 'zenodo',
    metric,
    value,
    observed_at: new Date().toISOString(),
    url,
    raw_payload: raw,
  }
}

export async function collectZenodoSignals(source, { fetchJson }) {
  const records = identifiersByType(source, 'zenodo_record')
  const signals = []
  for (const record of records) {
    const apiUrl = `https://zenodo.org/api/records/${record.identifier_value}`
    const data = await fetchJson(apiUrl)
    if (!data) continue
    const publicUrl = data.links?.html || record.url || `https://zenodo.org/records/${record.identifier_value}`
    signals.push(
      signal(source, 'views', Number(data.stats?.views), publicUrl, data),
      signal(source, 'downloads', Number(data.stats?.downloads), publicUrl, data),
      signal(source, 'unique_views', Number(data.stats?.unique_views), publicUrl, data),
      signal(source, 'unique_downloads', Number(data.stats?.unique_downloads), publicUrl, data),
    )
  }
  return signals.filter(Boolean)
}
