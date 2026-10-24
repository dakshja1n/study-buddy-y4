import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  if (!body.docId || !body.imageBase64 || !body.imageMimeType || !body.subject) {
    return NextResponse.json({ error: 'docId, imageBase64, imageMimeType, and subject are required' }, { status: 400 })
  }

  return NextResponse.json({
    corrections: [],
    spokenFeedback: 'Analysis coming soon',
    status: 'ok',
  })
}
