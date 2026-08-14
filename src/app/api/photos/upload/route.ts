import { NextRequest, NextResponse } from 'next/server'
import { presignUpload } from '@/lib/blob'
import { requireAuth } from '@/lib/auth'

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const { filename, contentType } = await req.json()

  if (typeof filename !== 'string' || typeof contentType !== 'string') {
    return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 })
  }
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: `Unsupported content type: ${contentType}` }, { status: 400 })
  }

  try {
    const { uploadUrl, publicUrl } = await presignUpload(filename, contentType)
    return NextResponse.json({ uploadUrl, publicUrl })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
