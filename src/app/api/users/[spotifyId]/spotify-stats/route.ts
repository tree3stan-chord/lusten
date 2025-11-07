import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserSpotifyStats, updateUserSpotifyStats } from '@/lib/sqlite-db';
import { SpotifyStatsGenerator } from '@/lib/spotify-stats-generator';
import { spotifyApi } from '@/lib/spotify-api-client';
import type { SpotifyTrack, SpotifyArtist, RecentlyPlayedItem } from '@/lib/spotify-stats-generator';

interface RouteContext {
  params: {
    spotifyId: string;
  };
}

// GET - Retrieve user's cached Spotify stats
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { spotifyId } = params;
    
    // Users can only access their own stats (or we could add friend access later)
    if (session.user.id !== spotifyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const stats = getUserSpotifyStats(spotifyId);
    
    if (!stats) {
      return NextResponse.json({ 
        message: 'No stats found for user',
        stats: null 
      }, { status: 404 });
    }

    return NextResponse.json({
      stats,
      cached: true
    });

  } catch (error) {
    console.error('Error fetching user Spotify stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Generate and update user's Spotify stats
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { spotifyId } = params;
    
    // Users can only update their own stats
    if (session.user.id !== spotifyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('time_range') || 'medium_term';
    const forceRefresh = searchParams.get('force') === 'true';

    // Check if we have recent cached data and not forcing refresh
    if (!forceRefresh) {
      const existingStats = getUserSpotifyStats(spotifyId);
      if (existingStats) {
        const lastUpdated = new Date(existingStats.last_updated);
        const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        // If updated within last 6 hours, return cached data
        if (hoursSinceUpdate < 6) {
          return NextResponse.json({
            stats: existingStats,
            cached: true,
            message: 'Using cached data (updated less than 6 hours ago)'
          });
        }
      }
    }

    // Fetch fresh data from Spotify
    console.log(`Fetching fresh Spotify data for user ${spotifyId}...`);
    
    const [tracksResponse, artistsResponse, recentResponse] = await Promise.allSettled([
      spotifyApi.get(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`, session),
      spotifyApi.get(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=50`, session),
      spotifyApi.get(`https://api.spotify.com/v1/me/player/recently-played?limit=50`, session)
    ]);

    // Process responses and handle failures gracefully
    let topTracks: SpotifyTrack[] = [];
    let topArtists: SpotifyArtist[] = [];
    let recentlyPlayed: RecentlyPlayedItem[] = [];

    if (tracksResponse.status === 'fulfilled' && tracksResponse.value.ok) {
      const tracksData = await tracksResponse.value.json();
      topTracks = tracksData.items || [];
    } else {
      console.warn('Failed to fetch top tracks:', tracksResponse);
    }

    if (artistsResponse.status === 'fulfilled' && artistsResponse.value.ok) {
      const artistsData = await artistsResponse.value.json();
      topArtists = artistsData.items || [];
    } else {
      console.warn('Failed to fetch top artists:', artistsResponse);
    }

    if (recentResponse.status === 'fulfilled' && recentResponse.value.ok) {
      const recentData = await recentResponse.value.json();
      recentlyPlayed = recentData.items || [];
    } else {
      console.warn('Failed to fetch recently played:', recentResponse);
    }

    // Generate Top 3s stats
    const input = SpotifyStatsGenerator.validateInput({
      topTracks,
      topArtists,
      recentlyPlayed
    });

    const generatedStats = SpotifyStatsGenerator.generateTop3Stats(input);

    // Update database
    const success = updateUserSpotifyStats(spotifyId, generatedStats);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update stats in database' },
        { status: 500 }
      );
    }

    // Return fresh stats
    const updatedStats = getUserSpotifyStats(spotifyId);
    
    return NextResponse.json({
      stats: updatedStats,
      cached: false,
      message: 'Stats updated successfully',
      metadata: {
        time_range: timeRange,
        tracks_analyzed: topTracks.length,
        artists_analyzed: topArtists.length,
        recent_tracks_analyzed: recentlyPlayed.length
      }
    });

  } catch (error) {
    console.error('Error updating user Spotify stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Clear user's cached Spotify stats
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { spotifyId } = params;
    
    // Users can only delete their own stats
    if (session.user.id !== spotifyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // For now, we'll update with empty stats rather than delete the row
    const emptyStats = {
      top_artists: [],
      top_albums: [],
      top_genres: []
    };

    const success = updateUserSpotifyStats(spotifyId, emptyStats);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to clear stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Stats cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing user Spotify stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}