import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie')
    const sessionCookie = cookies?.match(/next-auth\.session-token=([^;]+)/)?.[1]
    
    return NextResponse.json({
      hasCookie: !!sessionCookie,
      cookiePreview: sessionCookie?.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
      allCookies: cookies?.substring(0, 100) + '...'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}