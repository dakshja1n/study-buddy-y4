import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { message, subject } = await req.json().catch(() => ({}))
  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }
  // TODO: wire Gemma 4 here
  return NextResponse.json({
    reply: `Great question about ${typeof subject === 'string' && subject ? subject : 'your homework'}! I'll be able to help you with that once Gemma 4 is connected.`,
  })
}
