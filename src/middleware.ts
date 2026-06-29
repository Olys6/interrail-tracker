import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export const config = {
  matcher: ['/admin/:path*'],
}

export async function middleware(req: NextRequest) {
  const isLoginPage = req.nextUrl.pathname === '/admin/login'
  const token = req.cookies.get('trip_session')?.value

  if (!token) {
    if (isLoginPage) return NextResponse.next()
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    await jwtVerify(token, secret)
    if (isLoginPage) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/admin/login', req.url))
    response.cookies.delete('trip_session')
    return response
  }
}
