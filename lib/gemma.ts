import { GoogleGenerativeAI } from '@google/generative-ai'

export const DEFAULT_GEMMA_MODEL = 'gemma-4-31b-it'
const SUPPORTED_GEMMA_MODELS = ['gemma-4-31b-it', 'gemma-4-26b-a4b-it']

export function resolveGemmaModelName() {
  const configured = process.env.GEMINI_MODEL?.trim()
  return configured && SUPPORTED_GEMMA_MODELS.includes(configured) ? configured : DEFAULT_GEMMA_MODEL
}

export function getGemmaModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: resolveGemmaModelName() })
}

export function parseModelJson<T = unknown>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
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
