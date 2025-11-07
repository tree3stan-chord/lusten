import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getRoomBans, getRoom } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roomId } = await params;
    
    // Check if user is the room owner
    const currentRoom = getRoom(roomId);
    if (!currentRoom) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    if (currentRoom.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Only room owner can view banned users' },
        { status: 403 }
      );
    }
    
    const bannedUsers = getRoomBans(roomId);
    return NextResponse.json(bannedUsers);
  } catch (error) {
    console.error('Error fetching banned users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}