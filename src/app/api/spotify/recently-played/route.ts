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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 50);
    const after = searchParams.get('after'); // Unix timestamp in milliseconds
    const before = searchParams.get('before'); // Unix timestamp in milliseconds

    let url = `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`;
    if (after) url += `&after=${after}`;
    if (before) url += `&before=${before}`;

    const response = await spotifyApi.get(url, session);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Spotify API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch recently played tracks', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform the data to include essential information
    const transformedTracks = data.items?.map((item: any) => ({
      track: {
        id: item.track?.id,
        name: item.track?.name,
        artists: item.track?.artists?.map((artist: any) => ({
          id: artist.id,
          name: artist.name
        })) || [],
        album: {
          id: item.track?.album?.id,
          name: item.track?.album?.name,
          images: item.track?.album?.images || [],
          release_date: item.track?.album?.release_date
        },
        duration_ms: item.track?.duration_ms,
        popularity: item.track?.popularity,
        external_urls: item.track?.external_urls
      },
      played_at: item.played_at,
      context: item.context ? {
        type: item.context.type,
        href: item.context.href,
        external_urls: item.context.external_urls
      } : null
    })) || [];

    return NextResponse.json({
      items: transformedTracks,
      next: data.next,
      cursors: data.cursors,
      limit: data.limit,
      href: data.href,
      fetched_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching recently played tracks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}