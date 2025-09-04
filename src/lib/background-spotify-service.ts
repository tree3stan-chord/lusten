import { getUserById, updateUserSpotifyStats, getUserSpotifyStats } from './sqlite-db';
import { SpotifyStatsGenerator } from './spotify-stats-generator';
import type { SpotifyTrack, SpotifyArtist, RecentlyPlayedItem } from './spotify-stats-generator';

interface BackgroundRefreshResult {
  success: boolean;
  cached: boolean;
  error?: string;
  stats?: any;
  metadata?: {
    tracks_analyzed: number;
    artists_analyzed: number;
    recent_tracks_analyzed: number;
    time_range: string;
  };
}

interface UserTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export class BackgroundSpotifyService {
  private static instance: BackgroundSpotifyService;
  
  static getInstance(): BackgroundSpotifyService {
    if (!this.instance) {
      this.instance = new BackgroundSpotifyService();
    }
    return this.instance;
  }

  /**
   * Refresh Spotify access token using refresh token
   * This would be called before making API requests in background jobs
   */
  async refreshAccessToken(refreshToken: string): Promise<UserTokens | null> {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        console.error('Failed to refresh token:', response.status, await response.text());
        return null;
      }

      const data = await response.json();
      
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken, // Some responses don't include new refresh token
        expires_at: Date.now() + (data.expires_in * 1000)
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return null;
    }
  }

  /**
   * Fetch Spotify data with proper token management
   */
  async fetchSpotifyData(
    accessToken: string,
    timeRange: string = 'medium_term'
  ): Promise<{
    topTracks: SpotifyTrack[];
    topArtists: SpotifyArtist[];
    recentlyPlayed: RecentlyPlayedItem[];
  }> {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const [tracksResponse, artistsResponse, recentResponse] = await Promise.allSettled([
      fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`, { headers }),
      fetch(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=50`, { headers }),
      fetch(`https://api.spotify.com/v1/me/player/recently-played?limit=50`, { headers })
    ]);

    let topTracks: SpotifyTrack[] = [];
    let topArtists: SpotifyArtist[] = [];
    let recentlyPlayed: RecentlyPlayedItem[] = [];

    if (tracksResponse.status === 'fulfilled' && tracksResponse.value.ok) {
      const data = await tracksResponse.value.json();
      topTracks = data.items || [];
    }

    if (artistsResponse.status === 'fulfilled' && artistsResponse.value.ok) {
      const data = await artistsResponse.value.json();
      topArtists = data.items || [];
    }

    if (recentResponse.status === 'fulfilled' && recentResponse.value.ok) {
      const data = await recentResponse.value.json();
      recentlyPlayed = data.items || [];
    }

    return { topTracks, topArtists, recentlyPlayed };
  }

  /**
   * Background refresh for a user with stored tokens
   * This is the main method called by cron jobs
   */
  async backgroundRefreshUserStats(
    userId: string,
    userTokens: UserTokens,
    timeRange: string = 'medium_term',
    forceRefresh: boolean = false
  ): Promise<BackgroundRefreshResult> {
    try {
      console.log(`🔄 Background refresh for user ${userId}`);

      // Check cache first unless forcing refresh
      if (!forceRefresh) {
        const existingStats = getUserSpotifyStats(userId);
        if (existingStats) {
          const hoursSinceUpdate = (Date.now() - new Date(existingStats.last_updated).getTime()) / (1000 * 60 * 60);
          if (hoursSinceUpdate < 6) {
            console.log(`   📋 Using cached data (updated ${Math.round(hoursSinceUpdate * 10) / 10}h ago)`);
            return {
              success: true,
              cached: true,
              stats: existingStats
            };
          }
        }
      }

      // Refresh access token if needed
      let accessToken = userTokens.access_token;
      if (Date.now() >= userTokens.expires_at - 300000) { // Refresh if expires within 5 minutes
        console.log(`   🔑 Refreshing access token for user ${userId}`);
        const newTokens = await this.refreshAccessToken(userTokens.refresh_token);
        if (!newTokens) {
          throw new Error('Failed to refresh access token');
        }
        accessToken = newTokens.access_token;
        // TODO: Store updated tokens back to database
      }

      // Fetch fresh data from Spotify
      console.log(`   📊 Fetching fresh Spotify data...`);
      const spotifyData = await this.fetchSpotifyData(accessToken, timeRange);

      // Generate Top 3s stats
      const input = SpotifyStatsGenerator.validateInput(spotifyData);
      const generatedStats = SpotifyStatsGenerator.generateTop3Stats(input);

      // Update database
      const success = updateUserSpotifyStats(userId, generatedStats);
      if (!success) {
        throw new Error('Failed to update stats in database');
      }

      const updatedStats = getUserSpotifyStats(userId);
      console.log(`   ✅ Successfully updated stats for user ${userId}`);

      return {
        success: true,
        cached: false,
        stats: updatedStats,
        metadata: {
          tracks_analyzed: spotifyData.topTracks.length,
          artists_analyzed: spotifyData.topArtists.length,
          recent_tracks_analyzed: spotifyData.recentlyPlayed.length,
          time_range: timeRange
        }
      };

    } catch (error) {
      console.error(`   ❌ Failed to refresh stats for user ${userId}:`, error);
      return {
        success: false,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch process multiple users with rate limiting
   */
  async batchRefreshUsers(
    userTokenMap: Map<string, UserTokens>,
    timeRange: string = 'medium_term',
    batchSize: number = 3,
    delayBetweenBatches: number = 2000
  ): Promise<BackgroundRefreshResult[]> {
    const results: BackgroundRefreshResult[] = [];
    const userIds = Array.from(userTokenMap.keys());

    console.log(`🔄 Starting batch refresh for ${userIds.length} users`);

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      console.log(`  📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(userIds.length/batchSize)}`);

      const batchPromises = batch.map(userId => {
        const tokens = userTokenMap.get(userId)!;
        return this.backgroundRefreshUserStats(userId, tokens, timeRange);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      cached: results.filter(r => r.cached).length,
      failed: results.filter(r => !r.success).length
    };

    console.log(`✅ Batch refresh completed: ${summary.successful}/${summary.total} successful (${summary.cached} cached, ${summary.failed} failed)`);

    return results;
  }
}

// Singleton instance
export const backgroundSpotifyService = BackgroundSpotifyService.getInstance();