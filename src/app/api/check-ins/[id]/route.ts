import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const { id } = await params
  await sql`DELETE FROM check_ins WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
