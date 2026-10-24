'use client'

import { useRef, useState } from 'react'
import { BookOpen, Camera, Check, ChevronLeft, ChevronRight, FileImage, Lightbulb, Loader2, Mic, RotateCcw, Sparkles, Speaker, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadHomeworkImage } from '@/lib/uploadImage'

type AppState = 'idle' | 'analyzing' | 'results' | 'practice' | 'exercises'
type Difficulty = 'easy' | 'medium' | 'hard'
type Exercise = { number: number; question: string; answer: string; skill: string }

const subjects = ['Math', 'Science', 'Writing', 'Other']
const questions = ['Can you explain this step?', 'Show me a similar example', 'How can I avoid this next time?']
const corrections = [
  { mistake: 'The answer skips a step', correction: 'Show how you combined the like terms', explanation: 'Writing each step makes it easier to spot where the numbers change.' },
  { mistake: 'Check the sign in line 3', correction: 'The negative should carry through to the final term', explanation: 'A negative multiplied by a positive stays negative.' },
]

export default function Page() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [subject, setSubject] = useState('Math')
  const [appState, setAppState] = useState<AppState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [isMicActive, setIsMicActive] = useState(false)
  const [error, setError] = useState('')

  const chooseFile = (nextFile?: File) => {
    if (!nextFile) {
      setFile(null)
      setPreview('')
      return
    }
    if (!nextFile.type.startsWith('image/')) return
    setFile(nextFile)
    setPreview(URL.createObjectURL(nextFile))
    setAppState('idle')
    setError('')
  }

  const submit = async () => {
    if (!file) return
    setAppState('analyzing')
    setError('')
    try {
      const { docId, imageBase64 } = await uploadHomeworkImage(file, subject)
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ docId, imageBase64, imageMimeType: file.type, subject }) })
      if (!response.ok) throw new Error('Unable to analyze this submission')
      setAppState('results')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Something went wrong. Please try again.')
      setAppState('idle')
    }
  }

  const reset = () => { setFile(null); setPreview(''); setAppState('idle'); setError('') }
  const showResults = appState === 'results' || appState === 'practice' || appState === 'exercises'

  return (
    <main className="min-h-screen bg-[#f9fafb] text-slate-900 print:bg-white">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3"><div className="relative flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm" aria-label="StudyBuddy logo"><BookOpen className="size-5" /><Sparkles className="absolute -right-1 -top-1 size-3.5 text-amber-300" /></div><div><p className="text-lg font-bold tracking-tight">StudyBuddy <span className="text-indigo-600">AI</span></p><p className="text-xs text-slate-500">Your homework, understood.</p></div></div>
          {showResults && <Button variant="ghost" onClick={reset}><RotateCcw className="mr-2 size-4" />New problem</Button>}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
        {appState === 'idle' && <UploadState inputRef={inputRef} file={file} preview={preview} subject={subject} setSubject={setSubject} isDragging={isDragging} setIsDragging={setIsDragging} chooseFile={chooseFile} submit={submit} error={error} />}
        {appState === 'analyzing' && <LoadingState preview={preview} />}
        {appState === 'results' && <ResultsState preview={preview} isMicActive={isMicActive} setIsMicActive={setIsMicActive} onPractice={() => setAppState('practice')} onExercises={() => setAppState('exercises')} />}
        {appState === 'practice' && <PracticeState onBack={() => setAppState('results')} onReset={reset} />}
        {appState === 'exercises' && <ExerciseSheet onBack={() => setAppState('results')} />}
      </div>
    </main>
  )
}

function UploadState({ inputRef, file, preview, subject, setSubject, isDragging, setIsDragging, chooseFile, submit, error }: any) {
  return <section className="mx-auto max-w-3xl text-center"><div className="mb-10"><div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Sparkles className="size-7" /></div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Let&apos;s figure this out together.</h1><p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">Upload a photo of your homework and I&apos;ll help you find mistakes, understand the why, and build your confidence.</p></div><div className={`rounded-3xl border-2 border-dashed bg-white p-5 shadow-sm transition-colors sm:p-8 ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); chooseFile(event.dataTransfer.files[0]) }}>{preview ? <div className="relative overflow-hidden rounded-2xl bg-slate-100"><img src={preview} alt="Selected homework" className="mx-auto max-h-80 w-full object-contain" /><button onClick={() => chooseFile()} aria-label="Remove selected image" className="absolute right-3 top-3 rounded-full bg-white p-2 text-slate-600 shadow hover:text-red-600"><X className="size-4" /></button></div> : <div className="flex min-h-56 flex-col items-center justify-center"><div className="mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Upload className="size-6" /></div><p className="font-semibold">Drop your homework here</p><p className="mt-1 text-sm text-slate-500">or choose an image from your device</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={() => inputRef.current?.click()}><FileImage className="mr-2 size-4" />Choose photo</Button><Button variant="outline" onClick={() => inputRef.current?.click()}><Camera className="mr-2 size-4" />Take a photo</Button></div><input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} /></div>}</div><div className="mt-6 text-left"><p className="mb-3 text-sm font-semibold text-slate-700">What are you working on?</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{subjects.map((item: string) => <button key={item} onClick={() => setSubject(item)} className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${subject === item ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`}>{item}{subject === item && <Check className="ml-2 inline size-4" />}</button>)}</div></div><Button size="lg" disabled={!file} onClick={submit} className="mt-8 h-12 w-full rounded-xl bg-indigo-600 text-base text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 sm:w-72">Check My Work<ChevronRight className="ml-2 size-5" /></Button>{error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}</section>
}

function LoadingState({ preview }: { preview: string }) { return <section className="mx-auto max-w-2xl text-center"><h1 className="text-2xl font-bold">One moment, I&apos;m looking closely.</h1><p className="mt-2 text-slate-500">StudyBuddy is reviewing your work...</p><div className="relative mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"><img src={preview} alt="Homework being reviewed" className="max-h-[28rem] w-full rounded-2xl object-contain" /><div className="absolute inset-3 animate-pulse rounded-2xl bg-indigo-600/20" /></div><div className="mx-auto mt-7 h-2 max-w-md overflow-hidden rounded-full bg-indigo-100"><div className="h-full w-2/3 animate-[progress_1.8s_ease-in-out_infinite] rounded-full bg-indigo-600" /></div></section> }

function ResultsState({ preview, isMicActive, setIsMicActive, onPractice, onExercises }: any) { return <section><div className="mb-8 flex items-end justify-between"><div><p className="text-sm font-semibold text-indigo-600">Review complete</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Here&apos;s what I noticed.</h1></div><span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 sm:inline-flex">Ready to learn</span></div><div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className="lg:sticky lg:top-6 lg:self-start"><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"><img src={preview} alt="Uploaded homework" className="max-h-[600px] w-full rounded-2xl object-contain" /></div><p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400"><Lightbulb className="size-3.5" />Learning happens one step at a time.</p></div><div className="flex flex-col gap-5"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-sm font-semibold text-amber-900">Quick summary</p><p className="mt-1 leading-6 text-amber-900/80">You&apos;re on the right track! A couple of small details are keeping this answer from landing.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Let&apos;s make it clearer</h2><span className="text-xs font-medium text-slate-400">2 things to review</span></div><div className="flex flex-col gap-4">{corrections.map((item) => <article key={item.mistake} className="rounded-xl border border-slate-200 border-l-4 border-l-red-400 bg-slate-50/70 p-4"><p className="text-sm"><span className="font-semibold text-red-600">Mistake</span><span className="mx-2 text-slate-300">|</span>{item.mistake}</p><p className="mt-2 text-sm"><span className="font-semibold text-emerald-600">Try this</span><span className="mx-2 text-slate-300">|</span>{item.correction}</p><p className="mt-3 text-sm leading-6 text-slate-500">{item.explanation}</p><Button variant="ghost" size="sm" onClick={() => setIsMicActive(!isMicActive)} className="mt-2 px-0 text-indigo-600 hover:bg-transparent hover:text-indigo-700"><Speaker className="mr-2 size-4" />{isMicActive ? 'Playing explanation...' : 'Hear explanation'}</Button></article>)}</div></div><div className="flex flex-col gap-3 sm:flex-row"><Button onClick={onPractice} className="h-12 flex-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Practice Now<ChevronRight className="ml-2 size-5" /></Button><Button onClick={onExercises} variant="outline" className="h-12 flex-1 rounded-xl border-indigo-300 text-indigo-700 hover:bg-indigo-50">Generate Exercise Sheet<ChevronRight className="ml-2 size-5" /></Button></div></div></div></section> }

function PracticeState({ onBack }: { onBack: () => void; onReset: () => void }) { const [answer, setAnswer] = useState(''); const [checked, setChecked] = useState(false); return <section className="mx-auto max-w-2xl"><button onClick={onBack} className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 print:hidden"><ChevronLeft className="size-4" />Back to Results</button><p className="text-sm font-semibold text-indigo-600">Practice time</p><h1 className="mt-1 text-3xl font-bold">Try a similar problem.</h1><div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-medium text-slate-500">Solve for x</p><p className="mt-4 font-mono text-3xl font-semibold">3x + 4 = 19</p><label className="mt-8 block text-sm font-semibold" htmlFor="practice-answer">Your answer</label><input id="practice-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Type your answer" /><Button onClick={() => setChecked(true)} className="mt-4 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Check answer</Button>{checked && <p className={`mt-4 rounded-xl p-4 text-sm font-medium ${answer.trim() === '5' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{answer.trim() === '5' ? 'Correct. Great work!' : 'Not quite. Try isolating x by subtracting 4 first.'}</p>}</div></section> }

function ExerciseSheet({ onBack }: { onBack: () => void }) { const [difficulty, setDifficulty] = useState<Difficulty>('medium'); const [state, setState] = useState<'idle' | 'loading' | 'ready'>('idle'); const [exercises, setExercises] = useState<Exercise[]>([]); const [openAnswers, setOpenAnswers] = useState<Record<number, boolean>>({}); const generate = async () => { setState('loading'); try { const response = await fetch('/api/exercises', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: 'Math', topic: 'Fractions', weakness: 'Adding fractions with unlike denominators', mistakes: ['added denominators', 'forgot to simplify'], difficulty, count: 5 }) }); if (!response.ok) throw new Error('Unable to create exercises'); const data = await response.json(); setExercises(data.exercises); setState('ready') } catch { setState('idle') } }; return <section className="mx-auto max-w-4xl"><button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 print:hidden"><ChevronLeft className="size-4" />Back to Results</button><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-indigo-600">Personalized practice</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Exercise Sheet</h1></div><span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-800">Targeted practice for: Adding fractions with unlike denominators</span></div><div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-700">Choose a difficulty</p><div className="mt-3 flex gap-2">{(['easy', 'medium', 'hard'] as Difficulty[]).map((item) => <button key={item} onClick={() => setDifficulty(item)} className={`rounded-full border px-5 py-2 text-sm font-semibold capitalize transition ${difficulty === item ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>{item}</button>)}</div><Button onClick={generate} disabled={state === 'loading'} className="mt-5 h-12 w-full rounded-xl bg-indigo-600 text-base text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700">{state === 'loading' ? <><Loader2 className="mr-2 size-4 animate-spin" />Creating exercises...</> : 'Generate Exercises'}</Button></div>{state === 'loading' && <div className="flex items-center justify-center gap-3 py-16 text-slate-500"><Loader2 className="size-5 animate-spin text-indigo-600" />Gemma 4 is creating your exercises...</div>}{state === 'ready' && <div className="mt-6 flex flex-col gap-4">{exercises.map((exercise) => <article key={exercise.number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">{exercise.number}</span><div className="min-w-0 flex-1"><p className="font-mono text-lg font-semibold leading-8 text-slate-900">{exercise.question}</p><span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{exercise.skill}</span><div className="mt-4 flex flex-wrap items-center gap-3"><button onClick={() => setOpenAnswers((current) => ({ ...current, [exercise.number]: !current[exercise.number] }))} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">{openAnswers[exercise.number] ? 'Hide Answer' : 'Show Answer'}</button><Button variant="outline" size="sm" className="voice-button"><Mic className="mr-2 size-4" />Read Question</Button></div><div className={`answer-reveal mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 ${openAnswers[exercise.number] ? '' : 'hidden print:block'}`}>Answer: {exercise.answer}</div></div></div></article>)}<Button variant="outline" onClick={() => window.print()} className="mt-3 h-12 border-indigo-300 text-indigo-700 hover:bg-indigo-50 print:hidden">Print / Save as PDF</Button></div>}</section> }
