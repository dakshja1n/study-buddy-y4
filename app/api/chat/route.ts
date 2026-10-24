import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { message, subject } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    // Placeholder until Gemma 4 is connected
    const replies: Record<string, string> = {
      Math: `That's a great math question! For "${message}", think about breaking the problem into smaller steps. What part is confusing you most?`,
      Science: `Good question about science! For "${message}", try to think about what you already know. What concepts have you learned recently?`,
      Writing: `Great writing question! For "${message}", focus on your main idea first. Does your argument flow clearly from start to finish?`,
    }

    const reply = replies[subject] ?? `Good question! Let me think about "${message}". What have you already tried so far?`

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('chat route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
