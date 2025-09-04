import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { spotifyApi } from '../../../../lib/spotify-api-client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('time_range') || 'medium_term'; // short_term, medium_term, long_term
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 50);

    const response = await spotifyApi.get(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
      session
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Spotify API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch top tracks', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform the data to include essential information
    const transformedTracks = data.items?.map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists?.map((artist: any) => ({
        id: artist.id,
        name: artist.name
      })) || [],
      album: {
        id: track.album?.id,
        name: track.album?.name,
        images: track.album?.images || [],
        release_date: track.album?.release_date
      },
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      external_urls: track.external_urls,
      preview_url: track.preview_url
    })) || [];

    return NextResponse.json({
      tracks: transformedTracks,
      total: data.total || transformedTracks.length,
      time_range: timeRange,
      fetched_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}