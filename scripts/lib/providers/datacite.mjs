import { identifiersByType } from '../source-identifiers.mjs'

function signal(source, metric, value, url, raw) {
  if (!Number.isFinite(value)) return null
  return {
    source_id: source.id,
    provider: 'datacite',
    metric,
    value,
    observed_at: new Date().toISOString(),
    url,
    raw_payload: raw,
  }
}

function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return NaN
}

export async function collectDataCiteSignals(source, { fetchJson }) {
  const dois = identifiersByType(source, 'doi')
  const signals = []
  for (const doi of dois) {
    const apiUrl = `https://api.datacite.org/dois/${encodeURIComponent(doi.identifier_value)}`
    const data = await fetchJson(apiUrl)
    const attributes = data?.data?.attributes
    if (!attributes) continue
    const publicUrl = attributes.url || doi.url || `https://doi.org/${doi.identifier_value}`
    signals.push(
      signal(source, 'citations', firstNumber(attributes.citationCount, attributes['citation-count']), publicUrl, data),
      signal(source, 'views', firstNumber(attributes.viewCount, attributes.views, attributes['view-count']), publicUrl, data),
      signal(source, 'downloads', firstNumber(attributes.downloadCount, attributes.downloads, attributes['download-count']), publicUrl, data),
    )
  }
  return signals.filter(Boolean)
}
