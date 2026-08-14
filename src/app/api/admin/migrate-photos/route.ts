import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'
import { randomUUID } from 'crypto'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { putObject } from '@/lib/blob'

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]

// blob_url is DB-stored, not attacker-supplied per request, but this route
// still shouldn't blindly fetch() whatever string ends up there — restrict
// to the actual Blob storage host to avoid a server-side fetch of arbitrary
// URLs (SSRF).
function isTrustedBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'https:' && hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

// One-off migration of existing photos from Vercel Blob to Tigris. Does not
// delete the original blobs — only repoints photos.blob_url once each file
// is confirmed copied. Remove this route once the migration is verified.
export async function POST(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const { dryRun = true } = await req.json().catch(() => ({ dryRun: true }))

  const tigrisPublicUrl = process.env.TIGRIS_PUBLIC_URL!
  const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN })
  const rows = await sql`SELECT id, blob_url FROM photos`
  const toMigrate = rows.filter((r) => !String(r.blob_url).startsWith(tigrisPublicUrl))

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      blobObjectCount: blobs.length,
      photosTotal: rows.length,
      photosToMigrate: toMigrate.length,
      sample: toMigrate.slice(0, 5).map((r) => ({ id: r.id, blob_url: r.blob_url })),
    })
  }

  const results: { id: number; ok: boolean; error?: string }[] = []
  for (const row of toMigrate) {
    const id = row.id as number
    try {
      const sourceUrl = row.blob_url as string
      if (!isTrustedBlobUrl(sourceUrl)) throw new Error('blob_url is not a recognized Blob storage URL')
      const res = await fetch(sourceUrl)
      if (!res.ok) throw new Error(`source fetch failed (${res.status})`)
      const contentType = res.headers.get('content-type') || ''
      if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
        throw new Error(`unexpected content type: ${contentType || '(none)'}`)
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      const ext = sourceUrl.match(/\.\w+$/)?.[0] ?? ''
      const key = `${randomUUID()}${ext}`
      const newUrl = await putObject(key, buffer, contentType)
      await sql`UPDATE photos SET blob_url = ${newUrl} WHERE id = ${id}`
      results.push({ id, ok: true })
    } catch (err) {
      results.push({ id, ok: false, error: (err as Error).message })
    }
  }

  return NextResponse.json({
    dryRun: false,
    migrated: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok),
  })
}
