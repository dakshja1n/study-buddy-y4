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
    // ElevenLabs Scribe accepts webm, mp4, wav, mp3 — send as-is with correct name
    const ext = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('wav') ? 'wav' : 'webm'
    form.append('file', audio, `recording.${ext}`)
    form.append('model_id', 'scribe_v1')
    form.append('language_code', 'en')

    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    })

    const responseText = await res.text()

    if (!res.ok) {
      console.error('ElevenLabs STT error:', res.status, responseText)
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
    }

    const data = JSON.parse(responseText)
    return NextResponse.json({ text: data.text ?? '' })
  } catch (err) {
    console.error('listen route error:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
