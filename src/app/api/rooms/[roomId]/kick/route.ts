import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { kickUserFromRoom, getRoom } from '../../../../../lib/sqlite-db';
import { authOptions } from '../../../../../lib/auth';
import type { Session } from 'next-auth';

export async function POST(
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
    const { userId, reason, banType = 'kick' } = await request.json();
    
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
        { error: 'Only room owner can kick users' },
        { status: 403 }
      );
    }

    // Can't kick yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot kick yourself' },
        { status: 400 }
      );
    }
    
    const success = kickUserFromRoom(roomId, userId, session.user.id, reason, banType);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: `User ${banType === 'ban' ? 'banned' : 'kicked'} successfully`
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to kick user' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error kicking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}