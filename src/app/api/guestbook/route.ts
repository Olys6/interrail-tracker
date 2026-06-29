import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { GuestbookEntry } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rows = (await sql`
    SELECT * FROM guestbook ORDER BY created_at DESC
  `) as GuestbookEntry[]
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    name?: string
    message?: string
    emoji?: string
    check_in_id?: number | null
  }

  const rawName = typeof body.name === 'string' ? body.name.trim() : ''
  const rawMessage = typeof body.message === 'string' ? body.message.trim() : ''
  const rawEmoji = typeof body.emoji === 'string' ? body.emoji.trim() : ''
  const checkInId =
    typeof body.check_in_id === 'number' ? body.check_in_id : null

  if (!rawMessage && !rawEmoji) {
    return NextResponse.json(
      { error: 'At least one of message or emoji is required.' },
      { status: 400 },
    )
  }

  const name = rawName ? rawName.slice(0, 60) : null
  const message = rawMessage ? rawMessage.slice(0, 500) : null
  const emoji = rawEmoji ? rawEmoji.slice(0, 16) : null

  const rows = (await sql`
    INSERT INTO guestbook (check_in_id, name, message, emoji)
    VALUES (${checkInId}, ${name}, ${message}, ${emoji})
    RETURNING *
  `) as GuestbookEntry[]

  return NextResponse.json(rows[0], { status: 201 })
}
