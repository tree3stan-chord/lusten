import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const cookies = request.headers.get('cookie') || ''
  const userAgent = request.headers.get('user-agent') || ''
  
  // Parse all NextAuth cookies
  const sessionToken = cookies.match(/__Secure-next-auth\.session-token=([^;]+)/)?.[1] || 
                      cookies.match(/next-auth\.session-token=([^;]+)/)?.[1]
  const csrfToken = cookies.match(/__Host-next-auth\.csrf-token=([^;]+)/)?.[1] ||
                   cookies.match(/next-auth\.csrf-token=([^;]+)/)?.[1]
  const callbackUrl = cookies.match(/__Secure-next-auth\.callback-url=([^;]+)/)?.[1] ||
                     cookies.match(/next-auth\.callback-url=([^;]+)/)?.[1]

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    clientIP: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: userAgent.substring(0, 100),
    cookies: {
      sessionToken: sessionToken ? {
        exists: true,
        preview: sessionToken.substring(0, 20) + '...',
        length: sessionToken.length
      } : { exists: false },
      csrfToken: csrfToken ? {
        exists: true, 
        preview: csrfToken.substring(0, 20) + '...'
      } : { exists: false },
      callbackUrl: callbackUrl ? {
        exists: true,
        value: decodeURIComponent(callbackUrl)
      } : { exists: false }
    },
    allCookieNames: cookies.split(';').map(c => c.trim().split('=')[0]).filter(n => n.includes('next-auth'))
  })
}