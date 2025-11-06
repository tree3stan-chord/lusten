import { NextResponse } from 'next/server';
import { getPopularGenres } from '../../../lib/sqlite-db';

export async function GET() {
  try {
    const genres = getPopularGenres();

    return NextResponse.json({
      success: true,
      genres
    });
  } catch (error) {
    console.error('Error fetching genres:', error);
    return NextResponse.json(
      { error: 'Failed to fetch genres' },
      { status: 500 }
    );
  }
}
