import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { del } from '@/lib/blob'
import { dbErrorResponse } from '@/lib/api-error'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const { id } = await params
  try {
    const rows = await sql`SELECT blob_url FROM photos WHERE id = ${id}`
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await del(rows[0].blob_url as string, { token: process.env.BLOB_READ_WRITE_TOKEN })
    await sql`DELETE FROM photos WHERE id = ${id}`
    revalidateTag('photos')
    return NextResponse.json({ ok: true })
  } catch {
    return dbErrorResponse()
  }
}
