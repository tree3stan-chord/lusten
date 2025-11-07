import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { spotifyApi } from '@/lib/spotify-api-client';

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
      `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=${limit}`,
      session
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Spotify API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch top artists', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform the data to include essential information
    const transformedArtists = data.items?.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres || [],
      images: artist.images || [],
      popularity: artist.popularity,
      followers: artist.followers?.total || 0,
      external_urls: artist.external_urls
    })) || [];

    return NextResponse.json({
      artists: transformedArtists,
      total: data.total || transformedArtists.length,
      time_range: timeRange,
      fetched_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching top artists:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}