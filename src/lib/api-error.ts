import { NextResponse } from 'next/server'

// Any error surfaced here is effectively always the DB (Neon) being
// unreachable/over quota — routes only throw after their own input
// validation has already passed.
export function dbErrorResponse() {
  return NextResponse.json(
    { error: 'Database temporarily unavailable. Please try again in a few minutes.' },
    { status: 503 }
  )
}
