'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export function InstallBanner() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  if (!visible) return null

  return (
    <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-2.5 text-indigo-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-sm">
        <p className="flex items-center gap-2 font-medium"><Download className="size-4" aria-hidden="true" />Add StudyBuddy to your home screen</p>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 bg-indigo-600 text-white hover:bg-indigo-700" onClick={async () => { await prompt?.prompt(); setVisible(false) }}>Install</Button>
          <button aria-label="Dismiss install banner" className="rounded p-1 text-indigo-500 hover:bg-indigo-100" onClick={() => setVisible(false)}><X className="size-4" /></button>
        </div>
      </div>
    </div>
  )
}
