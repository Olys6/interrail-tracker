import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const rows = await sql`SELECT * FROM photos ORDER BY created_at DESC`
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const body = await req.json()
  const blobUrl = body.blob_url as string | undefined
  const lat = Number(body.lat)
  const lng = Number(body.lng)
  const caption = (body.caption as string | null) || null

  if (!blobUrl || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'blob_url, lat, lng required' }, { status: 400 })
  }

  // (0, 0) is "Null Island" — a common sentinel for a failed/missing GPS
  // fix, never a real location on an Interrail trip. Reject it rather than
  // silently storing a photo in the middle of the Gulf of Guinea.
  if (lat === 0 && lng === 0) {
    return NextResponse.json({ error: 'No valid location for this photo (got 0, 0)' }, { status: 400 })
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'lat/lng out of range' }, { status: 400 })
  }

  const rows = await sql`
    INSERT INTO photos (blob_url, lat, lng, caption)
    VALUES (${blobUrl}, ${lat}, ${lng}, ${caption})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
