import { NextRequest, NextResponse } from 'next/server'
import { getGemmaModel } from '@/lib/gemma'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { message, subject, context } = await req.json()

    const model = getGemmaModel()
    if (!model) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    const prompt = `You are a friendly, encouraging homework tutor helping a student with ${subject}.
Context: ${context}
Student question: ${message}

Reply in 2-3 sentences. Be clear, warm, and helpful.
Do not use markdown or bullet points — speak naturally as a tutor would.`

    const result = await model.generateContent(prompt)
    return NextResponse.json({ reply: result.response.text().trim() })
  } catch (err) {
    console.error('chat route error:', err)
    return NextResponse.json({
      reply: "I'm having trouble connecting right now. Please try again in a moment.",
    })
  }
}
