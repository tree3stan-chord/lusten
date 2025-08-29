import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Since we can't directly access the server.js rooms Map from here,
    // let's return connection info we can access
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      message: "Check server console logs for room debugging info",
      instructions: [
        "1. Check server console when Account 1 starts playing a track",
        "2. Look for 'Track change from [user] in room [id]' messages", 
        "3. Check if 'Broadcasting track change to X listeners' appears",
        "4. On Account 2/3, look for '🎵 LISTENER: Received track change' in console"
      ]
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}