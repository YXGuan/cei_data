import { NextRequest, NextResponse } from 'next/server'
import { retrieveEvidence, type RetrieveParams } from '@/lib/retrieval'

export async function GET(request: NextRequest) {
  const values = request.nextUrl.searchParams
  const params: RetrieveParams = {
    query: values.get('q') || '',
    region: values.get('region') || '',
    type: values.get('type') || '',
    binding: values.get('binding') || '',
    organizationType: values.get('organizationType') || '',
    evidenceKind: values.get('evidenceKind') || '',
    limit: Number(values.get('limit') || 10),
  }
  return NextResponse.json(await retrieveEvidence(params))
}
