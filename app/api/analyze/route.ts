import { NextRequest, NextResponse } from 'next/server'
import type { Part } from '@google/generative-ai'
import { getGemmaModel, parseModelJson } from '@/lib/gemma'

export const maxDuration = 60

const PROMPT = `You are a friendly and encouraging homework tutor for students.
Analyze the student's solution and return ONLY valid JSON in this exact shape.
Do not wrap in markdown. Return only the raw JSON object.

{
  "subject": "Math",
  "topic": "Linear Equations",
  "isCorrect": false,
  "mistakes": [
    {
      "step": "2x = 13 + 5",
      "issue": "The student moved +5 to the wrong side",
      "correction": "2x = 13 - 5",
      "explanation": "When moving a term across the equals sign, the sign flips from + to -"
    }
  ],
  "correctSolution": [
    "2x + 5 = 13",
    "2x = 13 - 5",
    "2x = 8",
    "x = 4"
  ],
  "knowledgeGaps": ["Transposing terms in linear equations"],
  "encouragement": "You were close! Just remember that terms change sign when crossing the equals sign.",
  "exercises": [
    { "number": 1, "question": "Solve: 3x + 2 = 11", "answer": "x = 3", "skill": "Linear equations" },
    { "number": 2, "question": "Solve: 5x - 3 = 12", "answer": "x = 3", "skill": "Linear equations" },
    { "number": 3, "question": "Solve: 2x + 7 = 15", "answer": "x = 4", "skill": "Linear equations" }
  ]
}

If the solution is fully correct set isCorrect to true and mistakes to [].
If the input is incomplete or unclear, set a field "unclear": true and explain why.
Never invent mistakes if the solution is correct.`

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageMimeType, subject, task, studentSolution } = await req.json()

    const model = getGemmaModel()
    if (!model) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    const parts: Part[] = [{ text: PROMPT }]

    if (imageBase64 && imageMimeType) {
      parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } })
      parts.push({ text: `Subject: ${subject ?? 'General'}\nPlease analyze the homework shown in this image.` })
    } else if (task && studentSolution) {
      parts.push({ text: `Subject: ${subject ?? 'Math'}\nTask: ${task}\nStudent solution: ${studentSolution}` })
    } else {
      return NextResponse.json(
        { error: 'Provide either imageBase64 + imageMimeType or task + studentSolution' },
        { status: 400 },
      )
    }

    const result = await model.generateContent(parts)
    const raw = result.response.text()

    try {
      return NextResponse.json(parseModelJson(raw))
    } catch {
      console.error('Failed to parse Gemma response:', raw)
      return NextResponse.json({ error: 'Model returned invalid JSON', raw }, { status: 500 })
    }
  } catch (err) {
    console.error('analyze route error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
