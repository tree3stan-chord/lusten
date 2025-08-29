import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const cookies = request.headers.get('cookie') || ''
  const userAgent = request.headers.get('user-agent') || ''
  const sessionToken = cookies.match(/__Secure-next-auth\.session-token=([^;]+)/)?.[1] ||
                      cookies.match(/next-auth\.session-token=([^;]+)/)?.[1]
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    hasSessionToken: !!sessionToken,
    sessionPreview: sessionToken?.substring(0, 50) + '...',
    sessionLength: sessionToken?.length,
    userAgent: userAgent.substring(0, 150),
    browserFingerprint: {
      cookieCount: cookies.split(';').length,
      cookiePreview: cookies.substring(0, 200) + '...'
    }
  })
}