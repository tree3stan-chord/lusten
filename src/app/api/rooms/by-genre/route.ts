import { NextRequest, NextResponse } from 'next/server';
import { getRoomsByGenre, searchRoomsByGenres, getPublicRoomsWithGenres } from '../../../../lib/sqlite-db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const genre = searchParams.get('genre');
    const genres = searchParams.get('genres');

    let rooms;

    if (genre) {
      // Single genre search
      rooms = getRoomsByGenre(genre);
    } else if (genres) {
      // Multiple genres search (comma-separated)
      const genreArray = genres.split(',').map(g => g.trim()).filter(Boolean);
      rooms = searchRoomsByGenres(genreArray);
    } else {
      // No filters - return all public rooms with genres
      rooms = getPublicRoomsWithGenres();
    }

    // Transform rooms to include parsed genres in response
    const roomsWithGenres = rooms.map(room => ({
      ...room,
      genres: room.parsedGenres,
      parsedGenres: undefined // Remove internal field
    }));

    return NextResponse.json({
      success: true,
      rooms: roomsWithGenres
    });
  } catch (error) {
    console.error('Error fetching rooms by genre:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}
