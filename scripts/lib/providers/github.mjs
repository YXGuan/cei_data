import { identifiersByType } from '../source-identifiers.mjs'

function signal(source, metric, value, url, raw) {
  if (!Number.isFinite(value)) return null
  return {
    source_id: source.id,
    provider: 'github',
    metric,
    value,
    observed_at: new Date().toISOString(),
    url,
    raw_payload: raw,
  }
}

export async function collectGithubSignals(source, { fetchJson }) {
  const repos = identifiersByType(source, 'github_repo')
  const signals = []
  for (const repo of repos) {
    const apiUrl = `https://api.github.com/repos/${repo.identifier_value}`
    const data = await fetchJson(apiUrl, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'CEI source popularity collector',
      },
    })
    if (!data) continue
    const publicUrl = data.html_url || repo.url || `https://github.com/${repo.identifier_value}`
    signals.push(
      signal(source, 'stars', Number(data.stargazers_count), publicUrl, data),
      signal(source, 'forks', Number(data.forks_count), publicUrl, data),
      signal(source, 'subscribers', Number(data.subscribers_count), publicUrl, data),
    )
  }
  return signals.filter(Boolean)
}
