import { GoogleGenerativeAI, type Part } from '@google/generative-ai'

const DEFAULT_GEMMA_MODEL = 'gemma-4-31b-it'

type GemmaContentPart =
  | { type: 'text'; text: string }
  | { type: 'file'; mediaType: string; data: string }

type GemmaMessage = { role: 'user' | 'assistant'; content: string | GemmaContentPart[] }

function getApiKey() {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  return key
}

function resolveGemmaModelId() {
  return process.env.GEMINI_MODEL?.trim().replace(/^(google|models)\//, '') || DEFAULT_GEMMA_MODEL
}

function toParts(content: GemmaMessage['content']): Part[] {
  if (typeof content === 'string') return [{ text: content }]
  return content.map((part) =>
    part.type === 'text'
      ? { text: part.text }
      : { inlineData: { mimeType: part.mediaType, data: part.data.replace(/^data:[^;]+;base64,/, '') } },
  )
}

export async function generateWithGemma(input: string | GemmaMessage[]) {
  const model = new GoogleGenerativeAI(getApiKey()).getGenerativeModel({ model: resolveGemmaModelId() })
  const messages: GemmaMessage[] = typeof input === 'string' ? [{ role: 'user', content: input }] : input

  const result = await model.generateContent({
    contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: toParts(m.content) })),
  })
  return result.response.text()
}

export function gatewayErrorMessage(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : ''
  if (/GEMINI_API_KEY is not set/.test(message)) {
    return 'AI is not configured: add a GEMINI_API_KEY environment variable (get one at aistudio.google.com).'
  }
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    return 'The GEMINI_API_KEY is invalid. Please check the key in your project settings.'
  }
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(message)) {
    return 'Gemma rate limit reached. Please wait a moment and try again.'
  }
  if (/not found|404/i.test(message)) {
    return `The Gemma model "${resolveGemmaModelId()}" is not available. Set GEMINI_MODEL to a valid model (e.g. gemma-4-31b-it).`
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
