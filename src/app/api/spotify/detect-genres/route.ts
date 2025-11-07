import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { genreDetector } from '@/lib/spotify-genre-detector';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to detect genres from current playback
    let result = await genreDetector.detectGenresFromCurrentPlayback(session);

    // If nothing is currently playing, try recent history
    if (result.confidence === 'none' || result.genres.length === 0) {
      result = await genreDetector.detectGenresFromRecentHistory(session);
    }

    // If still no genres, fall back to user's top genres from stats
    if (result.genres.length === 0) {
      // This will be handled on the client side as a fallback
      return NextResponse.json({
        success: true,
        genres: [],
        track: null,
        confidence: 'none',
        source: 'none',
        message: 'No active playback or recent history. Use your top genres instead.'
      });
    }

    return NextResponse.json({
      success: true,
      genres: result.genres,
      track: result.track ? {
        name: result.track.name,
        artists: result.track.artists.map(a => a.name).join(', '),
        album: result.track.album.name,
        image: result.track.album.images[0]?.url
      } : null,
      confidence: result.confidence,
      source: result.source
    });
  } catch (error) {
    console.error('Error detecting genres:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect genres',
        success: false,
        genres: [],
        confidence: 'none',
        source: 'none'
      },
      { status: 500 }
    );
  }
}
