import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { declineFriendRequest } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { friendshipId } = await request.json();
    
    if (!friendshipId) {
      return NextResponse.json(
        { error: 'Missing friendshipId' },
        { status: 400 }
      );
    }
    
    const success = declineFriendRequest(friendshipId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Friend request not found or already processed' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error declining friend request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}