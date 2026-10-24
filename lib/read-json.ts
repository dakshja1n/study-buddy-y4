export async function readJson<T = Record<string, unknown>>(response: Response): Promise<(T & { error?: string }) | null> {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    if (response.status === 504 || /timeout/i.test(text)) {
      return { error: 'The tutor took too long to respond. Please try again.' } as T & { error?: string }
    }
    if (response.status === 413) {
      return { error: 'That file is too large. Please use a smaller photo.' } as T & { error?: string }
    }
    return { error: 'The server returned an unexpected response. Please try again.' } as T & { error?: string }
  }
}
