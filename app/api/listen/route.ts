import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not set' }, { status: 500 })
    }

    const incoming = await req.formData()
    const audio = incoming.get('audio') as File | null
    if (!audio) {
      return NextResponse.json({ error: 'audio file is required' }, { status: 400 })
    }

    const form = new FormData()
    form.append('file', audio, 'recording.webm')
    form.append('model_id', 'scribe_v1')

    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('ElevenLabs STT error:', res.status, errorText)
      return NextResponse.json({ error: errorText }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ text: data.text ?? '' })
  } catch (err) {
    console.error('listen route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
