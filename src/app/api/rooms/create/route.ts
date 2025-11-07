import { NextRequest, NextResponse } from 'next/server';
import { createRoom, createOrUpdateProfileRoom } from '@/lib/sqlite-db';
import rateLimiter from '@/lib/api-rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const { roomId, roomName, roomType, ownerId, genres } = await request.json();

    // Security: Rate limiting
    if (ownerId) {
      const limitCheck = rateLimiter.checkLimit(ownerId, 'room-creation');
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: `Rate limit exceeded. Please try again in ${limitCheck.retryAfter} seconds.`
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(limitCheck.retryAfter),
              'X-RateLimit-Remaining': '0'
            }
          }
        );
      }
    }

    // Security: Validate input
    if (!roomName || roomName.length > 100) {
      return NextResponse.json(
        { error: 'Invalid room name (max 100 characters)' },
        { status: 400 }
      );
    }

    if (!ownerId || typeof ownerId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid owner ID' },
        { status: 400 }
      );
    }

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