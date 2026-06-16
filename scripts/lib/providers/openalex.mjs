import { identifiersByType } from '../source-identifiers.mjs'

function signal(source, metric, value, url, raw) {
  if (!Number.isFinite(value)) return null
  return {
    source_id: source.id,
    provider: 'openalex',
    metric,
    value,
    observed_at: new Date().toISOString(),
    url,
    raw_payload: raw,
  }
}

export async function collectOpenAlexSignals(source, { fetchJson }) {
  const identifiers = [
    ...identifiersByType(source, 'openalex_work'),
    ...identifiersByType(source, 'doi'),
  ]
  const signals = []
  for (const identifier of identifiers) {
    const workRef = identifier.identifier_type === 'doi'
      ? `https://doi.org/${identifier.identifier_value}`
      : `https://openalex.org/${identifier.identifier_value}`
    const apiUrl = `https://api.openalex.org/works/${encodeURIComponent(workRef)}`
    const data = await fetchJson(apiUrl)
    if (!data) continue
    const publicUrl = data.id || identifier.url || workRef
    signals.push(signal(source, 'citations', Number(data.cited_by_count), publicUrl, data))
  }
  return signals.filter(Boolean)
}
