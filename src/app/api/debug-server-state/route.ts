import { NextResponse } from 'next/server'

// Check if there's any global state in the NextAuth handler
export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    processId: process.pid,
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    serverUptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  })
}