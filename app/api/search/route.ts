import { NextRequest, NextResponse } from 'next/server'
import { searchCatalog, type SearchParams } from '@/lib/catalog'

export async function GET(request: NextRequest) {
  const values = request.nextUrl.searchParams
  const sort = values.get('sort')
  const params: SearchParams = {
    query: values.get('q') || '',
    region: values.get('region') || '',
    type: values.get('type') || '',
    binding: values.get('binding') || '',
    organizationType: values.get('organizationType') || '',
    cluster: values.get('cluster') || '',
    sort: sort === 'year' || sort === 'title' || sort === 'organization' ? sort : 'relevance',
    page: Number(values.get('page') || 1),
    limit: 20,
  }
  return NextResponse.json(await searchCatalog(params))
}
