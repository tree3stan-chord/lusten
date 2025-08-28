import { NextResponse } from 'next/server'

// Simple in-memory log store (would use database in production)
const authLogs: Array<{timestamp: string, event: string, data: unknown}> = []

export async function GET() {
  return NextResponse.json({
    logs: authLogs.slice(-20), // Last 20 logs
    count: authLogs.length
  })
}

export async function DELETE() {
  authLogs.splice(0, authLogs.length)
  return NextResponse.json({ cleared: true })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    authLogs.push({
      timestamp: new Date().toISOString(),
      event: body.event,
      data: body.data
    })
    
    // Keep only last 100 logs
    if (authLogs.length > 100) {
      authLogs.splice(0, authLogs.length - 100)
    }
    
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 })
  }
}