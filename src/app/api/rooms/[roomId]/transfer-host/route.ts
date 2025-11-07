import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { transferRoomOwnership, getRoom } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
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
    const { newHostId } = await request.json();
    
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
        { error: 'Only room owner can transfer ownership' },
        { status: 403 }
      );
    }

    // Can't transfer to yourself
    if (newHostId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot transfer ownership to yourself' },
        { status: 400 }
      );
    }
    
    const success = transferRoomOwnership(roomId, newHostId);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Room ownership transferred successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to transfer ownership' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error transferring ownership:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}