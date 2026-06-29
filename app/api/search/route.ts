import { NextRequest, NextResponse } from 'next/server'
import { searchSources, type SourceSearchParams } from '@/lib/source-catalog'
import type { PersonaKey } from '@/lib/types'

const personas = new Set(['builder', 'legal_compliance', 'ministry_civil_society'])

export async function GET(request: NextRequest) {
  const values = request.nextUrl.searchParams
  const sort = values.get('sort')
  const persona = values.get('persona') || ''
  const params: SourceSearchParams = {
    query: values.get('q') || '',
    persona: personas.has(persona) ? persona as PersonaKey : '',
    category: values.get('category') || '',
    action: values.get('action') || '',
    wisdomTag: values.get('wisdomTag') || '',
    complexity: values.get('complexity') || '',
    status: values.get('status') || '',
    sort: sort === 'title' || sort === 'category' || sort === 'latest' ? sort : 'relevance',
    page: Number(values.get('page') || 1),
    limit: Number(values.get('limit') || 24),
  }
  return NextResponse.json(await searchSources(params))
}
