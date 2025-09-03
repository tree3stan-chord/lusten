import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { unbanUserFromRoom, getRoom } from '../../../../../lib/sqlite-db';
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
    const { userId } = await request.json();
    
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
        { error: 'Only room owner can unban users' },
        { status: 403 }
      );
    }
    
    const success = unbanUserFromRoom(roomId, userId);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'User unbanned successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to unban user' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error unbanning user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}