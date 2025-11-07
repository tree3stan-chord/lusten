import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { updateRoomDetails, getRoom } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

export async function PUT(
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
    const updates = await request.json();

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
        { error: 'Only room owner can edit room' },
        { status: 403 }
      );
    }

    // Handle genres field - convert array to JSON string if provided
    if (updates.genres !== undefined) {
      if (Array.isArray(updates.genres)) {
        updates.genres = JSON.stringify(updates.genres);
      } else if (updates.genres === null || updates.genres === '') {
        updates.genres = null;
      }
    }

    const updatedRoom = updateRoomDetails(roomId, updates);
    
    if (updatedRoom) {
      return NextResponse.json({
        success: true,
        room: updatedRoom
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to update room' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}