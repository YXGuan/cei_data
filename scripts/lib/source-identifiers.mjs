export function normalizeText(value = '') {
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

export function normalizeComparable(value = '') {
  return normalizeText(value)
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/^www\./, '')
    .replace(/[^\w./:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeUrl(value) {
  if (!value) return null
  try {
    const url = new URL(String(value).trim())
    url.hash = ''
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }
    return url.toString()
  } catch {
    return null
  }
}

export function normalizeHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

export function normalizePath(value) {
  try {
    const url = new URL(value)
    return `${normalizeHost(value)}${url.pathname.replace(/\/+$/, '')}`.toLowerCase()
  } catch {
    return normalizeComparable(value)
  }
}

function addIdentifier(identifiers, identifier) {
  if (!identifier?.identifier_type || !identifier?.identifier_value) return
  const normalized = {
    identifier_type: normalizeText(identifier.identifier_type),
    identifier_value: normalizeText(identifier.identifier_value),
    url: identifier.url ? normalizeUrl(identifier.url) || normalizeText(identifier.url) : null,
  }
  const key = `${normalized.identifier_type}:${normalized.identifier_value}`.toLowerCase()
  if (!identifiers.some((item) => `${item.identifier_type}:${item.identifier_value}`.toLowerCase() === key)) {
    identifiers.push(normalized)
  }
}

function extractDoi(text, identifiers) {
  const matches = String(text || '').match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi) || []
  for (const match of matches) {
    const doi = match.replace(/[)\].,;]+$/, '')
    addIdentifier(identifiers, {
      identifier_type: 'doi',
      identifier_value: doi.toLowerCase(),
      url: `https://doi.org/${doi}`,
    })
  }
}

export function extractIdentifiers(source) {
  const identifiers = []
  for (const identifier of source.identifiers || []) addIdentifier(identifiers, identifier)

  const url = normalizeUrl(source.source_url || source.canonical_url)
  const searchable = [
    source.title,
    source.publisher,
    source.description,
    source.source_url,
    source.canonical_url,
    ...(source.aliases || []),
  ].filter(Boolean).join(' ')

  if (url) {
    addIdentifier(identifiers, { identifier_type: 'canonical_url', identifier_value: url, url })
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
    const parts = parsed.pathname.split('/').filter(Boolean)

    if (host === 'github.com' && parts.length >= 2) {
      addIdentifier(identifiers, {
        identifier_type: 'github_repo',
        identifier_value: `${parts[0]}/${parts[1]}`,
        url: `https://github.com/${parts[0]}/${parts[1]}`,
      })
    }

    if (host === 'huggingface.co' && parts[0] === 'datasets' && parts.length >= 3) {
      addIdentifier(identifiers, {
        identifier_type: 'huggingface_dataset',
        identifier_value: `${parts[1]}/${parts[2]}`,
        url: `https://huggingface.co/datasets/${parts[1]}/${parts[2]}`,
      })
    }

    if (host === 'doi.org' && parts.length) {
      addIdentifier(identifiers, {
        identifier_type: 'doi',
        identifier_value: decodeURIComponent(parts.join('/')).toLowerCase(),
        url,
      })
    }

    if (host === 'zenodo.org' && parts[0] === 'records' && parts[1]) {
      addIdentifier(identifiers, {
        identifier_type: 'zenodo_record',
        identifier_value: parts[1],
        url,
      })
    }

    if (host === 'openalex.org' && /^W\d+$/i.test(parts[0] || '')) {
      addIdentifier(identifiers, {
        identifier_type: 'openalex_work',
        identifier_value: parts[0].toUpperCase(),
        url,
      })
    }

    if (host === 'semanticscholar.org' && parts[0] === 'paper' && parts.at(-1)) {
      addIdentifier(identifiers, {
        identifier_type: 'semantic_scholar_paper',
        identifier_value: parts.at(-1),
        url,
      })
    }
  }

  extractDoi(searchable, identifiers)
  return identifiers
}

export function identifiersByType(source, type) {
  return extractIdentifiers(source).filter((identifier) => identifier.identifier_type === type)
}
