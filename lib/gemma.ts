import { generateText, type ModelMessage } from 'ai'

const DEFAULT_GEMMA_MODEL = 'gemma-4-31b-it'
const SUPPORTED_GEMMA_MODELS = ['gemma-4-31b-it', 'gemma-4-26b-a4b-it']

function resolveGemmaModelId() {
  const configured = process.env.GEMINI_MODEL?.trim().replace(/^google\//, '')
  const name = configured && SUPPORTED_GEMMA_MODELS.includes(configured) ? configured : DEFAULT_GEMMA_MODEL
  return `google/${name}`
}

export async function generateWithGemma(input: string | ModelMessage[]) {
  const { text } = await generateText({
    model: resolveGemmaModelId(),
    ...(typeof input === 'string' ? { prompt: input } : { messages: input }),
  })
  return text
}

export function gatewayErrorMessage(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : ''
  if (/credit card/i.test(message)) {
    return 'AI is not enabled yet: add a credit card to your Vercel team to unlock AI Gateway free credits (Vercel dashboard → AI Gateway).'
  }
  return fallback
}

export function parseModelJson<T = unknown>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T
    throw new Error('Model returned invalid JSON')
  }
}
