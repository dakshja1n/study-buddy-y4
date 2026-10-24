'use client'

import { useSyncExternalStore } from 'react'

export type HistoryProblem = {
  question: string
  answer: string
  skill?: string
  solution?: string
}

export type HistoryEntry = {
  id: string
  createdAt: number
  subject: string
  topic: string
  task?: string
  problems: HistoryProblem[]
}

const STORAGE_KEY = 'studybuddy:history:v1'
const MAX_ENTRIES = 100
const EMPTY: HistoryEntry[] = []

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedEntries: HistoryEntry[] = EMPTY

function readEntries(): HistoryEntry[] {
  if (typeof window === 'undefined') return EMPTY
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return EMPTY
  }
  if (raw === cachedRaw) return cachedEntries
  cachedRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : []
    cachedEntries = Array.isArray(parsed) ? parsed : EMPTY
  } catch {
    cachedEntries = EMPTY
  }
  return cachedEntries
}

function writeEntries(entries: HistoryEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // Storage can be full or disabled (private mode); history is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useHistory() {
  return useSyncExternalStore(subscribe, readEntries, () => EMPTY)
}

export function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'problems'>) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
  writeEntries([{ ...entry, id, createdAt: Date.now(), problems: [] }, ...readEntries()])
  return id
}

export function saveHistoryProblems(id: string, problems: HistoryProblem[]) {
  const entries = readEntries()
  const target = entries.find((entry) => entry.id === id)
  if (!target) return
  const known = new Set(target.problems.map((problem) => problem.question))
  const additions = problems
    .filter((problem) => !known.has(problem.question))
    .map(({ question, answer, skill, solution }) => ({ question, answer, skill, solution }))
  if (additions.length === 0) return
  writeEntries(
    entries.map((entry) => (entry.id === id ? { ...entry, problems: [...entry.problems, ...additions] } : entry)),
  )
}

export function removeHistoryEntry(id: string) {
  writeEntries(readEntries().filter((entry) => entry.id !== id))
}

export function clearHistory() {
  writeEntries([])
}
