import { NextRequest, NextResponse } from 'next/server'
import { signToken, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await signToken({ role: 'admin' })
  const response = NextResponse.json({ ok: true })
  setSessionCookie(response, token)
  return response
}
