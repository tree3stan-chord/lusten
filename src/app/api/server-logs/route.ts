import { NextResponse } from 'next/server'

// Global log storage (in production you'd use a database)
const serverLogs: Array<{
  timestamp: string
  level: 'info' | 'error' | 'debug'
  event: string
  data: unknown
}> = []

export async function GET() {
  return NextResponse.json({
    logs: serverLogs.slice(-50), // Last 50 logs
    count: serverLogs.length
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    serverLogs.push({
      timestamp: new Date().toISOString(),
      level: body.level || 'info',
      event: body.event,
      data: body.data
    })
    
    // Keep only last 200 logs
    if (serverLogs.length > 200) {
      serverLogs.splice(0, serverLogs.length - 200)
    }
    
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 })
  }
}

export async function DELETE() {
  serverLogs.splice(0, serverLogs.length)
  return NextResponse.json({ cleared: true })
}