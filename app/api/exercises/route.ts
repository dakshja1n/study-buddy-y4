import { NextRequest, NextResponse } from 'next/server'
import { gatewayErrorMessage, generateWithGemma, parseModelJson } from '@/lib/gemma'

export const maxDuration = 60

const DIFFICULTIES = ['easy', 'medium', 'hard']

type Exercise = { number: number; question: string; answer: string; skill: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const difficulty = DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'medium'
    const count = Math.min(10, Math.max(1, Number.parseInt(body.count, 10) || 5))
    const mistakes: string[] = Array.isArray(body.mistakes) ? body.mistakes.filter((m: unknown) => typeof m === 'string') : []

    const prompt = `Generate ${count} ${difficulty} practice exercises for a student
who is struggling with: ${body.weakness || 'general practice'}
Subject: ${body.subject || 'General'}, Topic: ${body.topic || 'General'}
${mistakes.length > 0 ? `Mistakes the student made: ${mistakes.join('; ')}` : ''}

Return ONLY valid JSON, no markdown:
{
  "exercises": [
    { "number": 1, "question": "...", "answer": "...", "skill": "..." }
  ]
}`

    const data = parseModelJson<{ exercises?: Partial<Exercise>[] }>(await generateWithGemma(prompt))
    const exercises = (Array.isArray(data.exercises) ? data.exercises : [])
      .filter((item) => item?.question && item?.answer)
      .map((item, index) => ({
        number: index + 1,
        question: String(item.question),
        answer: String(item.answer),
        skill: String(item.skill ?? body.topic ?? 'Practice'),
      }))

    if (exercises.length === 0) {
      return NextResponse.json({ error: 'No exercises were generated. Please try again.' }, { status: 502 })
    }
    return NextResponse.json({ exercises })
  } catch (err) {
    console.error('exercises route error:', err)
    return NextResponse.json(
      { error: gatewayErrorMessage(err, 'Unable to create exercises right now. Please try again.') },
      { status: 500 },
    )
  }
}
