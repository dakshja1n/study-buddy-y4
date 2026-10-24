import { NextRequest, NextResponse } from 'next/server'
import { getGemmaModel, parseModelJson } from '@/lib/gemma'

export const maxDuration = 60

const fallbackExercises = [
  { number: 1, question: 'Solve: 3x + 2 = 11', answer: 'x = 3', skill: 'Linear equations' },
  { number: 2, question: 'Solve: 5x - 3 = 12', answer: 'x = 3', skill: 'Linear equations' },
  { number: 3, question: 'Solve: 2x + 7 = 15', answer: 'x = 4', skill: 'Linear equations' },
  { number: 4, question: 'Solve: 4x - 1 = 19', answer: 'x = 5', skill: 'Linear equations' },
  { number: 5, question: 'Solve: x/2 + 3 = 7', answer: 'x = 8', skill: 'Linear equations' },
]

export async function POST(req: NextRequest) {
  try {
    const { subject, topic, weakness, difficulty = 'medium', count = 5 } = await req.json()

    const model = getGemmaModel()
    if (!model) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    const prompt = `Generate ${count} ${difficulty} practice exercises for a student
who is struggling with: ${weakness}
Subject: ${subject}, Topic: ${topic}

Return ONLY valid JSON, no markdown:
{
  "exercises": [
    { "number": 1, "question": "...", "answer": "...", "skill": "..." }
  ]
}`

    const result = await model.generateContent(prompt)
    return NextResponse.json(parseModelJson(result.response.text()))
  } catch (err) {
    console.error('exercises route error:', err)
    return NextResponse.json({ exercises: fallbackExercises })
  }
}
