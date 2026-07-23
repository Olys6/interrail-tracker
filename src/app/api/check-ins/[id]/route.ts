import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { dbErrorResponse } from '@/lib/api-error'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const { id } = await params
  try {
    await sql`DELETE FROM check_ins WHERE id = ${id}`
    revalidateTag('check-ins')
    return NextResponse.json({ ok: true })
  } catch {
    return dbErrorResponse()
  }
}
