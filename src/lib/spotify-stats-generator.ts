import type { ParsedSpotifyStats } from './sqlite-db';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: Array<{ url: string; width: number; height: number }>;
  popularity: number;
  followers: number;
}

interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
  context: any;
}

interface Top3sInput {
  topTracks: SpotifyTrack[];
  topArtists: SpotifyArtist[];
  recentlyPlayed: RecentlyPlayedItem[];
}

export class SpotifyStatsGenerator {
  /**
   * Generate Top 3s statistics from Spotify data
   */
  static generateTop3Stats(input: Top3sInput): Omit<ParsedSpotifyStats, 'user_id' | 'last_updated'> {
    const { topTracks, topArtists, recentlyPlayed } = input;

    // Generate Top 3 Artists (using top artists API data)
    const top3Artists = this.generateTopArtists(topArtists);

    // Generate Top 3 Albums (derived from top tracks)
    const top3Albums = this.generateTopAlbums(topTracks);

    // Generate Top 3 Genres (aggregated from artists)
    const top3Genres = this.generateTopGenres(topArtists, topTracks);

    return {
      top_artists: top3Artists,
      top_albums: top3Albums,
      top_genres: top3Genres
    };
  }

  /**
   * Generate top 3 artists from Spotify's top artists data
   */
  private static generateTopArtists(artists: SpotifyArtist[]): ParsedSpotifyStats['top_artists'] {
    return artists
      .slice(0, 3)
      .map(artist => ({
        id: artist.id,
        name: artist.name,
        images: artist.images.map(img => ({
          url: img.url,
          width: img.width,
          height: img.height
        })),
        genres: artist.genres,
        popularity: artist.popularity
      }));
  }

  /**
   * Generate top 3 albums from top tracks data
   */
  private static generateTopAlbums(tracks: SpotifyTrack[]): ParsedSpotifyStats['top_albums'] {
    // Count album occurrences in top tracks
    const albumCounts = new Map<string, {
      album: SpotifyTrack['album'];
      artist: string;
      count: number;
      totalPopularity: number;
    }>();

    tracks.forEach(track => {
      const albumId = track.album.id;
      const primaryArtist = track.artists[0]?.name || 'Unknown Artist';
      
      if (albumCounts.has(albumId)) {
        const existing = albumCounts.get(albumId)!;
        existing.count += 1;
        existing.totalPopularity += track.popularity;
      } else {
        albumCounts.set(albumId, {
          album: track.album,
          artist: primaryArtist,
          count: 1,
          totalPopularity: track.popularity
        });
      }
    });

    // Sort by count, then by average popularity
    const sortedAlbums = Array.from(albumCounts.values())
      .sort((a, b) => {
        if (a.count !== b.count) {
          return b.count - a.count; // Higher count first
        }
        return (b.totalPopularity / b.count) - (a.totalPopularity / a.count); // Higher avg popularity
      });

    return sortedAlbums
      .slice(0, 3)
      .map(item => ({
        id: item.album.id,
        name: item.album.name,
        artist: item.artist,
        images: item.album.images.map(img => ({
          url: img.url,
          width: img.width,
          height: img.height
        })),
        release_date: item.album.release_date
      }));
  }

  /**
   * Generate top 3 genres from artists and tracks data
   */
  private static generateTopGenres(artists: SpotifyArtist[], tracks: SpotifyTrack[]): ParsedSpotifyStats['top_genres'] {
    const genreCounts = new Map<string, number>();

    // Count genres from top artists (weighted more heavily)
    artists.forEach((artist, index) => {
      const weight = artists.length - index; // Earlier artists get higher weight
      artist.genres.forEach(genre => {
        const current = genreCounts.get(genre) || 0;
        genreCounts.set(genre, current + weight * 2); // Artists genres weighted x2
      });
    });

    // Count genres from track artists (less weight)
    const trackArtistIds = new Set<string>();
    tracks.forEach(track => {
      track.artists.forEach(artist => {
        if (!trackArtistIds.has(artist.id)) {
          trackArtistIds.add(artist.id);
          // We would need to fetch artist details to get genres
          // For now, we'll rely on the top artists data
        }
      });
    });

    // Convert to array and sort by count
    const sortedGenres = Array.from(genreCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return sortedGenres.map(([name, count]) => ({
      name: this.formatGenreName(name),
      count
    }));
  }

  /**
   * Format genre names for better display
   */
  private static formatGenreName(genre: string): string {
    return genre
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Enhanced analysis that considers listening patterns
   */
  static generateEnhancedStats(input: Top3sInput): Omit<ParsedSpotifyStats, 'user_id' | 'last_updated'> {
    const basicStats = this.generateTop3Stats(input);
    
    // You can add more sophisticated analysis here:
    // - Weight recent listening more heavily
    // - Consider listening frequency vs. just top tracks
    // - Analyze listening patterns (discovery vs. repeat)
    // - Factor in time of day, playlist context, etc.
    
    return basicStats;
  }

  /**
   * Validate and clean Spotify API responses
   */
  static validateInput(input: Partial<Top3sInput>): Top3sInput {
    return {
      topTracks: Array.isArray(input.topTracks) ? input.topTracks : [],
      topArtists: Array.isArray(input.topArtists) ? input.topArtists : [],
      recentlyPlayed: Array.isArray(input.recentlyPlayed) ? input.recentlyPlayed : []
    };
  }
}

// Type exports for use in API endpoints
export type { SpotifyTrack, SpotifyArtist, RecentlyPlayedItem, Top3sInput };