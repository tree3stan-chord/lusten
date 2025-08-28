import { NextResponse } from 'next/server'

export async function POST() {
  // This will reset the logs array in the other module
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth-logs`, {
    method: 'DELETE'
  }).catch(() => null)
  
  return NextResponse.json({ cleared: true })
}