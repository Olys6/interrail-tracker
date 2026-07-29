import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { sql, getPhotos } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { dbErrorResponse } from '@/lib/api-error'
import { parseCoords } from '@/lib/geo'

export async function GET() {
  try {
    return NextResponse.json(await getPhotos())
  } catch {
    return dbErrorResponse()
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const body = await req.json()
  const blobUrl = body.blob_url as string | undefined
  const caption = (body.caption as string | null) || null

  if (!blobUrl) {
    return NextResponse.json({ error: 'blob_url required' }, { status: 400 })
  }

  // Rejects missing/NaN coords, (0, 0) "Null Island" (the sentinel a device
  // writes when it had no fix — never a real Interrail stop), and out-of-range
  // values, rather than silently storing a photo in the Gulf of Guinea.
  const coords = parseCoords(body.lat, body.lng)
  if (!coords.ok) {
    const error =
      coords.reason === 'null-island'
        ? 'No valid location for this photo (got 0, 0)'
        : coords.reason === 'out-of-range'
          ? 'lat/lng out of range'
          : 'blob_url, lat, lng required'
    return NextResponse.json({ error }, { status: 400 })
  }
  const { lat, lng } = coords

  try {
    const rows = await sql`
      INSERT INTO photos (blob_url, lat, lng, caption)
      VALUES (${blobUrl}, ${lat}, ${lng}, ${caption})
      RETURNING *
    `
    revalidateTag('photos')
    return NextResponse.json(rows[0], { status: 201 })
  } catch {
    return dbErrorResponse()
  }
}
