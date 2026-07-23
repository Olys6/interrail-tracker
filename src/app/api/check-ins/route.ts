import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { sql, getCheckIns } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { dbErrorResponse } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

// Reverse-geocode coords into a place name + country via Mapbox.
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ place_name: string | null; country: string | null }> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,locality,region,country&limit=1`
    const res = await fetch(url)
    if (!res.ok) return { place_name: null, country: null }
    const data = (await res.json()) as {
      features?: { text: string; place_name: string; context?: { id: string; text: string }[] }[]
    }
    const feature = data.features?.[0]
    if (!feature) return { place_name: null, country: null }
    const country = feature.context?.find((c) => c.id.startsWith('country'))?.text ?? null
    return { place_name: feature.text, country }
  } catch {
    return { place_name: null, country: null }
  }
}

export async function GET() {
  try {
    return NextResponse.json(await getCheckIns())
  } catch {
    return dbErrorResponse()
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const { lat, lng, place_name, note } = await req.json()

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng are required numbers' }, { status: 400 })
  }

  const trimmedNote = typeof note === 'string' && note.trim() ? note.trim() : null
  const trimmedPlace = typeof place_name === 'string' && place_name.trim() ? place_name.trim() : null

  try {
    // Resolve country (for stats) and a fallback place name from the coordinates.
    const geo = await reverseGeocode(lat, lng)
    const finalPlace = trimmedPlace ?? geo.place_name

    const rows = await sql`
      INSERT INTO check_ins (lat, lng, place_name, note, country)
      VALUES (${lat}, ${lng}, ${finalPlace}, ${trimmedNote}, ${geo.country})
      RETURNING *
    `
    revalidateTag('check-ins')
    return NextResponse.json(rows[0], { status: 201 })
  } catch {
    return dbErrorResponse()
  }
}
