import { NextRequest, NextResponse } from 'next/server'
import { generateWithGemma, parseModelJson } from '@/lib/gemma'

const MAX_IMAGE_BASE64_LENGTH = 8_000_000

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

    let details: string
    let image: { data: string; mediaType: string } | null = null

    if (typeof imageBase64 === 'string' && typeof imageMimeType === 'string' && imageMimeType.startsWith('image/')) {
      if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
        return NextResponse.json({ error: 'Image is too large. Please use a smaller photo.' }, { status: 413 })
      }
      image = { data: imageBase64, mediaType: imageMimeType }
      details = `Subject: ${subject || 'General'}\nPlease analyze the homework shown in this image.`
    } else if (task && studentSolution) {
      details = `Subject: ${subject || 'Math'}\nTask: ${task}\nStudent solution: ${studentSolution}`
    } else {
      return NextResponse.json(
        { error: 'Provide either imageBase64 + imageMimeType or task + studentSolution' },
        { status: 400 },
      )
    }

    const raw = await generateWithGemma([
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          ...(image ? [{ type: 'file' as const, mediaType: image.mediaType, data: image.data }] : []),
          { type: 'text', text: details },
        ],
      },
    ])

    try {
      return NextResponse.json(parseModelJson(raw))
    } catch {
      console.error('Failed to parse Gemma response:', raw)
      return NextResponse.json({ error: 'The tutor returned an unexpected response. Please try again.' }, { status: 502 })
    }
  } catch (err) {
    console.error('analyze route error:', err)
    return NextResponse.json({ error: 'Unable to analyze this submission right now. Please try again.' }, { status: 500 })
  }
}
