import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Simple token check using cookies directly (NextAuth v4 compatibility)
    const cookies = request.headers.get('cookie') || ''
    const sessionToken = cookies.match(/__Secure-next-auth\.session-token=([^;]+)/)?.[1] ||
                        cookies.match(/next-auth\.session-token=([^;]+)/)?.[1]
    
    if (!sessionToken) {
      return NextResponse.json({
        error: 'No session token found',
        authenticated: false,
        timestamp: new Date().toISOString()
      })
    }

    // Can't easily decode JWT in this setup, so just return basic info
    return NextResponse.json({
      authenticated: true,
      hasSessionToken: true,
      sessionTokenLength: sessionToken.length,
      sessionPreview: sessionToken.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
      note: "Token details available in NextAuth JWT callback logs",
      suggestion: "Check server logs for token refresh activity"
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get token info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}