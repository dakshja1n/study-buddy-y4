'use client'

import { useState } from 'react'
import { ChevronDown, ChevronLeft, FolderOpen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clearHistory, removeHistoryEntry, useHistory, type HistoryEntry, type HistoryProblem } from '@/lib/history'

type TopicGroup = { key: string; subject: string; topic: string; entries: HistoryEntry[]; problemCount: number }

function groupByTopic(entries: HistoryEntry[]): TopicGroup[] {
  const groups = new Map<string, TopicGroup>()
  for (const entry of entries) {
    const topic = entry.topic?.trim() || 'General'
    const key = `${entry.subject.toLowerCase()}::${topic.toLowerCase()}`
    const group = groups.get(key) ?? { key, subject: entry.subject, topic, entries: [], problemCount: 0 }
    group.entries.push(entry)
    group.problemCount += entry.problems.length
    groups.set(key, group)
  }
  return [...groups.values()]
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function TopicReview({ onBack }: { onBack: () => void }) {
  const entries = useHistory()
  const groups = groupByTopic(entries)
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({})

  return (
    <section className="mx-auto max-w-3xl">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
      >
        <ChevronLeft className="size-4" />
        Back to upload
      </button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Your study history</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Review your topics</h1>
          <p className="mt-2 text-sm text-slate-500">
            Open a topic to see the tasks you uploaded and the practice problems created for them.
          </p>
        </div>
        {entries.length > 0 && (
          <Button
            variant="ghost"
            className="w-fit text-slate-500 hover:text-red-600"
            onClick={() => {
              if (window.confirm('Delete your whole topic history from this browser?')) clearHistory()
            }}
          >
            <Trash2 className="mr-2 size-4" />
            Clear history
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FolderOpen className="size-8 text-slate-400" />
          <p className="mt-3 font-semibold">No topics yet</p>
          <p className="mt-1 text-sm text-slate-500">Upload a homework photo and it will show up here.</p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {groups.map((group) => {
            const isOpen = !!openTopics[group.key]
            const panelId = `topic-panel-${group.key.replace(/[^a-z0-9]+/g, '-')}`
            return (
              <li key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  onClick={() => setOpenTopics((current) => ({ ...current, [group.key]: !isOpen }))}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{group.subject}</p>
                    <p className="mt-0.5 truncate text-lg font-semibold">{group.topic}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {group.entries.length} {group.entries.length === 1 ? 'task' : 'tasks'} · {group.problemCount}{' '}
                    {group.problemCount === 1 ? 'problem' : 'problems'}
                  </span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div id={panelId} className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/60 p-5">
                    {group.entries.map((entry) => (
                      <TaskCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function TaskCard({ entry }: { entry: HistoryEntry }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{dateFormatter.format(entry.createdAt)}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Original task</p>
          <p className="mt-0.5 whitespace-pre-line font-mono text-sm leading-6 text-slate-900">
            {entry.task || 'Task text was not detected for this upload.'}
          </p>
        </div>
        <button
          onClick={() => removeHistoryEntry(entry.id)}
          aria-label="Delete this task from history"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-500">Practice problems</p>
        {entry.problems.length === 0 ? (
          <p className="mt-1 text-sm text-slate-400">No practice problems were generated for this task yet.</p>
        ) : (
          <ol className="mt-2 flex flex-col gap-2">
            {entry.problems.map((problem, index) => (
              <ProblemItem key={`${index}-${problem.question}`} problem={problem} number={index + 1} />
            ))}
          </ol>
        )}
      </div>
    </article>
  )
}

function ProblemItem({ problem, number }: { problem: HistoryProblem; number: number }) {
  const [showAnswer, setShowAnswer] = useState(false)
  return (
    <li className="flex gap-3 rounded-lg bg-slate-50 p-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-6 text-slate-800">{problem.question}</p>
        {problem.skill && <p className="mt-1 text-xs text-slate-400">{problem.skill}</p>}
        <button
          onClick={() => setShowAnswer((value) => !value)}
          aria-expanded={showAnswer}
          className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          {showAnswer ? 'Hide answer' : 'Show answer'}
        </button>
        {showAnswer && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Answer:</span> {problem.answer}
            </p>
            {problem.solution && <p className="mt-2 whitespace-pre-line text-slate-600">{problem.solution}</p>}
          </div>
        )}
      </div>
    </li>
  )
}
