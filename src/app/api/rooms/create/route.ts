import { NextRequest, NextResponse } from 'next/server';
import { createRoom, createOrUpdateProfileRoom } from '../../../../lib/sqlite-db';

export async function POST(request: NextRequest) {
  try {
    const { roomId, roomName, roomType, ownerId, genres } = await request.json();

    let room;

    if (roomType === 'profile') {
      // Handle profile room creation/update (genres auto-populated)
      room = createOrUpdateProfileRoom(ownerId, roomName);
    } else {
      // Handle regular room creation
      const genresJson = genres && Array.isArray(genres) ? JSON.stringify(genres) : null;

      room = createRoom({
        id: roomId,
        name: roomName,
        description: null,
        type: roomType,
        owner_id: ownerId,
        max_users: 50,
        password: null,
        genres: genresJson,
        is_active: true
      });
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Error creating room in database:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}