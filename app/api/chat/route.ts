import { NextRequest, NextResponse } from 'next/server'
import { gatewayErrorMessage, generateWithGemma } from '@/lib/gemma'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { message, subject, context } = await req.json()
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const prompt = `You are a friendly, encouraging homework tutor helping a student with ${subject || 'their homework'}.
Context: ${context || 'None provided'}
Student question: ${message.slice(0, 2000)}

Reply in 2-3 sentences. Be clear, warm, and helpful.
Do not use markdown or bullet points — speak naturally as a tutor would.`

    const reply = await generateWithGemma(prompt)
    return NextResponse.json({ reply: reply.trim() })
  } catch (err) {
    console.error('chat route error:', err)
    return NextResponse.json(
      { error: gatewayErrorMessage(err, 'The tutor is unavailable right now.') },
      { status: 500 },
    )
  }
}
