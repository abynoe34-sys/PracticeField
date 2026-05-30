import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 30

// GET /api/test-openai — verifies the OpenAI key is valid and the model is accessible
export async function GET() {
  const key = process.env.OPENAI_API_KEY

  if (!key) {
    return NextResponse.json({ ok: false, error: 'OPENAI_API_KEY is not set in environment variables' }, { status: 503 })
  }

  // Show the first/last 4 chars so we can confirm which key is loaded without exposing it
  const maskedKey = `${key.slice(0, 10)}...${key.slice(-4)}`

  try {
    const client = new OpenAI({ apiKey: key })
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      max_tokens: 5,
    })
    const reply = res.choices[0]?.message?.content ?? '(no response)'
    return NextResponse.json({ ok: true, reply, key_loaded: maskedKey, model: 'gpt-4o' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = (err as { status?: number })?.status
    return NextResponse.json({ ok: false, error: msg, status, key_loaded: maskedKey }, { status: 500 })
  }
}
