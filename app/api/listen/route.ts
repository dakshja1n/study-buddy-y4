import { NextRequest, NextResponse } from 'next/server'

const MAX_AUDIO_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  const audio = formData?.get('audio')
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: 'audio is required' }, { status: 400 })
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'audio is too large' }, { status: 400 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY is not configured' }, { status: 500 })
  }

  const elFormData = new FormData()
  elFormData.append('file', audio, 'recording.webm')
  elFormData.append('model_id', 'scribe_v1')

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: elFormData,
  })

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error }, { status: response.status })
  }

  const data = await response.json()
  return NextResponse.json({ text: data.text ?? '' })
}
