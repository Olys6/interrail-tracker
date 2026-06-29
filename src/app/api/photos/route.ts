import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { put } from '@vercel/blob'

export async function GET() {
  const rows = await sql`SELECT * FROM photos ORDER BY created_at DESC`
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const lat = parseFloat(formData.get('lat') as string)
  const lng = parseFloat(formData.get('lng') as string)
  const caption = (formData.get('caption') as string | null) || null

  if (!file || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'file, lat, lng required' }, { status: 400 })
  }

  const blob = await put(file.name, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  const rows = await sql`
    INSERT INTO photos (blob_url, lat, lng, caption)
    VALUES (${blob.url}, ${lat}, ${lng}, ${caption})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
