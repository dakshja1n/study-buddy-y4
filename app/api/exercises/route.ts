import { NextRequest, NextResponse } from 'next/server'
import { gatewayErrorMessage, generateWithGemma, parseModelJson } from '@/lib/gemma'

export const maxDuration = 60

const DIFFICULTIES = ['easy', 'medium', 'hard']
const MAX_TEXT_LENGTH = 2000
const SECOND_ROUND_BUDGET_MS = 22_000

type Exercise = { number: number; question: string; answer: string; solution: string; skill: string }
type Draft = { question: string; solution: string; answer: string; skill: string }
type TaskProfile = { category: string; concepts: string[]; difficulty: string }

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_TEXT_LENGTH) : fallback
}

function cleanList(value: unknown, limit: number) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').slice(-limit).map((item) => item.slice(0, 300))
    : []
}

function questionKey(question: string) {
  return question.toLowerCase().replace(/\s+/g, '')
}

const DIFFICULTY_GUIDE: Record<string, string> = {
  easy: 'a bit easier than the original: fewer steps, friendlier numbers',
  medium: 'the same difficulty level as the original',
  hard: 'a bit harder than the original: one extra step or a less obvious setup, same core concepts',
}

async function generateDrafts(ctx: {
  subject: string
  topic: string
  weakness: string
  originalTask: string
  mistakes: string[]
  difficulty: string
  count: number
  avoid: string[]
}) {
  const prompt = `You are an experienced ${ctx.subject} teacher writing new practice problems.

Subject: ${ctx.subject}
Topic: ${ctx.topic}
${ctx.originalTask ? `Original homework task (reference only): """${ctx.originalTask}"""` : ''}
Skill the student is struggling with: ${ctx.weakness}
${ctx.mistakes.length > 0 ? `Mistakes the student made: ${ctx.mistakes.join('; ')}` : ''}

Step 1 - Categorize the original task: what kind of problem it is (e.g. "solving linear equations", "word problem on percentages", "German past tense"), which concepts it tests, and how difficult it is.

Step 2 - Write ${ctx.count} NEW problems for that category, ${DIFFICULTY_GUIDE[ctx.difficulty]}.
- Test the same concepts and skills, but do NOT copy the structure or template of the original. Vary the format: mix plain exercises, short word problems, "find the error", reverse questions (given the result, find the input), etc. where it suits the topic.
- Use different numbers, contexts and wording in each problem. No two problems may look alike.
- Each problem must be self-contained and have exactly one short, unambiguous final answer (e.g. "x = 4", "12", "3/4", "went"). The answer is typed by the student and auto-checked, so it must be a value or word, never an explanation (e.g. a "find the error" problem should ask for the correct result).
- Choose numbers so the answer comes out clean.

Step 3 - Solve every problem yourself, step by step, BEFORE writing its answer. Write the steps in "solution" (2-5 short steps), then copy the final result into "answer". The answer must match the last step of the solution exactly.
${ctx.avoid.length > 0 ? `\nDo NOT reuse any of these questions:\n${ctx.avoid.map((q) => `* ${q}`).join('\n')}` : ''}

Variation seed: ${crypto.randomUUID()}

Return ONLY valid JSON, no markdown:
{
  "profile": { "category": "...", "concepts": ["..."], "difficulty": "..." },
  "exercises": [
    { "question": "...", "solution": "Step 1: ... Step 2: ...", "answer": "...", "skill": "..." }
  ]
}`

  const data = parseModelJson<{ profile?: Partial<TaskProfile>; exercises?: Partial<Draft>[] }>(await generateWithGemma(prompt))
  const drafts = (Array.isArray(data.exercises) ? data.exercises : [])
    .filter((item) => typeof item?.question === 'string' && typeof item?.answer === 'string' && item.question.trim() && item.answer.trim())
    .map((item) => ({
      question: String(item.question).trim(),
      solution: typeof item.solution === 'string' ? item.solution.trim() : '',
      answer: String(item.answer).trim(),
      skill: typeof item.skill === 'string' && item.skill.trim() ? item.skill.trim() : ctx.topic,
    }))
  return { profile: data.profile, drafts }
}

async function verifyDrafts(subject: string, drafts: Draft[]) {
  if (drafts.length === 0) return []
  const prompt = `You are a strict ${subject} examiner checking an answer key. For each problem below:
1. Solve it yourself from scratch, step by step, in "work". Do NOT look at the proposed answer until you finished.
2. Write your own final answer in "ownAnswer".
3. Set "correct" to true only if the proposed answer is mathematically/factually equivalent to your answer AND the problem is clear, solvable and has a single answer. Otherwise false.

Problems:
${drafts.map((d, i) => `#${i + 1}\nProblem: ${d.question}\nProposed answer: ${d.answer}`).join('\n\n')}

Return ONLY valid JSON, no markdown:
{ "checks": [ { "index": 1, "work": "...", "ownAnswer": "...", "correct": true } ] }`

  const data = parseModelJson<{ checks?: { index?: number; correct?: unknown }[] }>(await generateWithGemma(prompt))
  const approved = new Set(
    (Array.isArray(data.checks) ? data.checks : [])
      .filter((check) => check?.correct === true && Number.isInteger(check.index))
      .map((check) => Number(check.index) - 1),
  )
  return drafts.filter((_, index) => approved.has(index))
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  try {
    const body = await req.json()
    const difficulty = DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'medium'
    const count = Math.min(10, Math.max(1, Number.parseInt(body.count, 10) || 5))
    const ctx = {
      subject: cleanText(body.subject, 'General'),
      topic: cleanText(body.topic, 'General'),
      weakness: cleanText(body.weakness, 'general practice'),
      originalTask: cleanText(body.originalTask),
      mistakes: cleanList(body.mistakes, 10),
      difficulty,
      avoid: cleanList(body.avoid, 30),
    }

    const seen = new Set(ctx.avoid.map(questionKey))
    const verified: Draft[] = []
    const addUnique = (items: Draft[]) => {
      for (const item of items) {
        const key = questionKey(item.question)
        if (seen.has(key) || verified.length >= count) continue
        seen.add(key)
        verified.push(item)
      }
    }

    // Generate extra drafts so problems rejected by the verifier can be dropped without falling short.
    const first = await generateDrafts({ ...ctx, count: Math.min(10, count + 2) })
    addUnique(await verifyDrafts(ctx.subject, first.drafts))

    if (verified.length < count && Date.now() - startedAt < SECOND_ROUND_BUDGET_MS) {
      const retry = await generateDrafts({
        ...ctx,
        count: count - verified.length + 1,
        avoid: [...ctx.avoid, ...first.drafts.map((d) => d.question)].slice(-30),
      })
      addUnique(await verifyDrafts(ctx.subject, retry.drafts))
    }

    if (verified.length === 0) {
      return NextResponse.json({ error: 'Could not create verified exercises. Please try again.' }, { status: 502 })
    }

    const exercises: Exercise[] = verified.map((item, index) => ({ number: index + 1, ...item }))
    return NextResponse.json({ exercises, profile: first.profile ?? null })
  } catch (err) {
    console.error('exercises route error:', err)
    return NextResponse.json(
      { error: gatewayErrorMessage(err, 'Unable to create exercises right now. Please try again.') },
      { status: 500 },
    )
  }
}
