import { identifiersByType } from '../source-identifiers.mjs'

function signal(source, metric, value, url, raw) {
  if (!Number.isFinite(value)) return null
  return {
    source_id: source.id,
    provider: 'semanticscholar',
    metric,
    value,
    observed_at: new Date().toISOString(),
    url,
    raw_payload: raw,
  }
}

export async function collectSemanticScholarSignals(source, { fetchJson }) {
  const identifiers = [
    ...identifiersByType(source, 'semantic_scholar_paper'),
    ...identifiersByType(source, 'doi'),
  ]
  const signals = []
  for (const identifier of identifiers) {
    const paperRef = identifier.identifier_type === 'doi'
      ? `DOI:${identifier.identifier_value}`
      : identifier.identifier_value
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperRef)}?fields=title,url,citationCount,influentialCitationCount,externalIds`
    const data = await fetchJson(apiUrl)
    if (!data) continue
    const publicUrl = data.url || identifier.url || `https://www.semanticscholar.org/paper/${identifier.identifier_value}`
    signals.push(
      signal(source, 'citations', Number(data.citationCount), publicUrl, data),
      signal(source, 'influential_citations', Number(data.influentialCitationCount), publicUrl, data),
    )
  }
  return signals.filter(Boolean)
}
