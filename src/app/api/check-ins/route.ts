import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const rows = await sql`SELECT * FROM check_ins ORDER BY created_at ASC`
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const { lat, lng, place_name } = await req.json()

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng are required numbers' }, { status: 400 })
  }

  const rows = await sql`
    INSERT INTO check_ins (lat, lng, place_name)
    VALUES (${lat}, ${lng}, ${place_name ?? null})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
