import { NextRequest, NextResponse } from 'next/server'
import { gatewayErrorMessage, generateWithGemma, parseModelJson } from '@/lib/gemma'

export const maxDuration = 60

const DIFFICULTIES = ['easy', 'medium', 'hard']
const MAX_TEXT_LENGTH = 2000

type Exercise = { number: number; question: string; answer: string; skill: string }

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_TEXT_LENGTH) : fallback
}

function cleanList(value: unknown, limit: number) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').slice(-limit).map((item) => item.slice(0, 300))
    : []
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const difficulty = DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'medium'
    const count = Math.min(10, Math.max(1, Number.parseInt(body.count, 10) || 5))
    const subject = cleanText(body.subject, 'General')
    const topic = cleanText(body.topic, 'General')
    const weakness = cleanText(body.weakness, 'general practice')
    const originalTask = cleanText(body.originalTask)
    const mistakes = cleanList(body.mistakes, 10)
    const avoid = cleanList(body.avoid, 30)

    const prompt = `You are a tutor creating brand-new practice problems for a student.

Subject: ${subject}
Topic: ${topic}
${originalTask ? `Original homework task: """${originalTask}"""` : ''}
Skill the student is struggling with: ${weakness}
${mistakes.length > 0 ? `Mistakes the student made: ${mistakes.join('; ')}` : ''}

Create ${count} NEW ${difficulty} problems that closely match the original task:
- Same type of problem, same format/wording style and the same solving steps as the original task.
- Change the numbers, names or context so each problem is genuinely new; never repeat the original task.
- ${difficulty === 'easy' ? 'Slightly simpler than the original.' : difficulty === 'hard' ? 'Slightly harder than the original, but the same skill.' : 'About the same difficulty as the original.'}
- Each problem must have one short, unambiguous final answer (e.g. "x = 4", "12", "3/4"). Double-check every answer.
- Every problem must be self-contained and solvable from its text alone.
${avoid.length > 0 ? `- Do NOT reuse any of these questions:\n${avoid.map((q) => `  * ${q}`).join('\n')}` : ''}

Variation seed: ${crypto.randomUUID()}

Return ONLY valid JSON, no markdown:
{
  "exercises": [
    { "number": 1, "question": "...", "answer": "...", "skill": "..." }
  ]
}`

    const data = parseModelJson<{ exercises?: Partial<Exercise>[] }>(await generateWithGemma(prompt))
    const seen = new Set(avoid.map((q) => q.toLowerCase().replace(/\s+/g, '')))
    const exercises = (Array.isArray(data.exercises) ? data.exercises : [])
      .filter((item) => item?.question && item?.answer)
      .filter((item) => {
        const key = String(item.question).toLowerCase().replace(/\s+/g, '')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((item, index) => ({
        number: index + 1,
        question: String(item.question),
        answer: String(item.answer),
        skill: String(item.skill ?? topic),
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
