import { identifiersByType } from '../source-identifiers.mjs'

function signal(source, metric, value, url, raw) {
  if (!Number.isFinite(value)) return null
  return {
    source_id: source.id,
    provider: 'huggingface',
    metric,
    value,
    observed_at: new Date().toISOString(),
    url,
    raw_payload: raw,
  }
}

export async function collectHuggingFaceSignals(source, { fetchJson }) {
  const datasets = identifiersByType(source, 'huggingface_dataset')
  const signals = []
  for (const dataset of datasets) {
    const apiUrl = `https://huggingface.co/api/datasets/${dataset.identifier_value}`
    const data = await fetchJson(apiUrl)
    if (!data) continue
    const publicUrl = dataset.url || `https://huggingface.co/datasets/${dataset.identifier_value}`
    signals.push(
      signal(source, 'downloads', Number(data.downloads), publicUrl, data),
      signal(source, 'likes', Number(data.likes), publicUrl, data),
    )
  }
  return signals.filter(Boolean)
}
