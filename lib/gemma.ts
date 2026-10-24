import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, type ModelMessage } from 'ai'

// gemma-4-31b-it regularly takes 40s-2min (or returns internal errors), which exceeds the
// serverless function limit; the 26B MoE variant answers in seconds.
const DEFAULT_GEMMA_MODEL = 'gemma-4-26b-a4b-it'
const GEMMA_TIMEOUT_MS = 50_000

class MissingApiKeyError extends Error {}

function resolveGemmaModelId() {
  const configured = process.env.GEMINI_MODEL?.trim().replace(/^(google\/|models\/)/, '')
  return configured && configured.startsWith('gemma-') ? configured : DEFAULT_GEMMA_MODEL
}

function getGoogleProvider() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  if (!apiKey) {
    throw new MissingApiKeyError('GEMINI_API_KEY is not set')
  }
  return createGoogleGenerativeAI({ apiKey })
}

export async function generateWithGemma(input: string | ModelMessage[]) {
  const google = getGoogleProvider()
  const { text } = await generateText({
    model: google(resolveGemmaModelId()),
    maxRetries: 2,
    abortSignal: AbortSignal.timeout(GEMMA_TIMEOUT_MS),
    providerOptions: { google: { thinkingConfig: { thinkingLevel: 'minimal' } } },
    ...(typeof input === 'string' ? { prompt: input } : { messages: input }),
  })
  return text
}

export function gatewayErrorMessage(err: unknown, fallback: string) {
  if (err instanceof MissingApiKeyError) {
    return 'AI is not configured: add your GEMINI_API_KEY in the project Vars settings.'
  }
  const message = err instanceof Error ? err.message : ''
  if ((err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) || /aborted|timed? ?out/i.test(message)) {
    return 'The tutor took too long to respond. Please try again.'
  }
  if (/api key not valid|API_KEY_INVALID|permission denied|unauthenticated/i.test(message)) {
    return 'Your GEMINI_API_KEY was rejected by Google. Please check the key in Google AI Studio.'
  }
  if (/quota|rate limit|resource exhausted|429/i.test(message)) {
    return 'The Gemma API quota was reached. Please wait a moment and try again.'
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
