import { spotifyApi } from './spotify-api-client';
import type { Session } from 'next-auth';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: Array<{ url: string; width: number; height: number }>;
}

interface CurrentlyPlayingResponse {
  is_playing: boolean;
  item: SpotifyTrack | null;
  currently_playing_type: string;
}

interface GenreDetectionResult {
  genres: string[];
  track: SpotifyTrack | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  source: 'current_playback' | 'top_genres' | 'none';
}

export class SpotifyGenreDetector {
  /**
   * Get currently playing track with detected genres
   */
  async detectGenresFromCurrentPlayback(session: Session): Promise<GenreDetectionResult> {
    try {
      // Get currently playing track
      const currentlyPlaying = await this.getCurrentlyPlaying(session);

      if (!currentlyPlaying.is_playing || !currentlyPlaying.item) {
        return {
          genres: [],
          track: null,
          confidence: 'none',
          source: 'none'
        };
      }

      // Extract artist IDs
      const artistIds = currentlyPlaying.item.artists.map(a => a.id);

      // Fetch artist details with genres
      const genres = await this.getGenresFromArtists(artistIds, session);

      return {
        genres,
        track: currentlyPlaying.item,
        confidence: genres.length > 0 ? 'high' : 'low',
        source: 'current_playback'
      };
    } catch (error) {
      console.error('Failed to detect genres from current playback:', error);
      return {
        genres: [],
        track: null,
        confidence: 'none',
        source: 'none'
      };
    }
  }

  /**
   * Get currently playing track from Spotify
   */
  private async getCurrentlyPlaying(session: Session): Promise<CurrentlyPlayingResponse> {
    const response = await spotifyApi.get(
      'https://api.spotify.com/v1/me/player/currently-playing',
      session
    );

    if (response.status === 204 || response.status === 404) {
      // No content - nothing is playing
      return {
        is_playing: false,
        item: null,
        currently_playing_type: 'unknown'
      };
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch currently playing: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch genres from multiple artists (batch request)
   */
  async getGenresFromArtists(artistIds: string[], session: Session): Promise<string[]> {
    if (artistIds.length === 0) return [];

    try {
      // Spotify allows up to 50 artists per request
      const batchSize = 50;
      const batches = [];

      for (let i = 0; i < artistIds.length; i += batchSize) {
        const batch = artistIds.slice(i, i + batchSize);
        batches.push(this.fetchArtistBatch(batch, session));
      }

      const results = await Promise.all(batches);
      const allArtists = results.flat();

      // Collect all unique genres
      const genreSet = new Set<string>();
      const genreCounts = new Map<string, number>();

      allArtists.forEach(artist => {
        artist.genres.forEach(genre => {
          const formatted = this.formatGenreName(genre);
          genreSet.add(formatted);
          genreCounts.set(formatted, (genreCounts.get(formatted) || 0) + 1);
        });
      });

      // Sort by frequency and return top 5
      const sortedGenres = Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([genre]) => genre)
        .slice(0, 5);

      return sortedGenres;
    } catch (error) {
      console.error('Failed to fetch artist genres:', error);
      return [];
    }
  }

  /**
   * Fetch a batch of artists from Spotify API
   */
  private async fetchArtistBatch(artistIds: string[], session: Session): Promise<SpotifyArtist[]> {
    const idsParam = artistIds.join(',');
    const response = await spotifyApi.get(
      `https://api.spotify.com/v1/artists?ids=${idsParam}`,
      session
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch artists: ${response.status}`);
    }

    const data = await response.json();
    return data.artists || [];
  }

  /**
   * Get genres from a single track by fetching its artists
   */
  async getGenresFromTrack(track: SpotifyTrack, session: Session): Promise<string[]> {
    const artistIds = track.artists.map(a => a.id);
    return this.getGenresFromArtists(artistIds, session);
  }

  /**
   * Format genre names for better display
   * Converts "indie-pop" → "Indie Pop"
   */
  private formatGenreName(genre: string): string {
    return genre
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get recently played tracks with detected genres (for future use)
   */
  async getRecentlyPlayedWithGenres(session: Session, limit = 5): Promise<Array<{
    track: SpotifyTrack;
    genres: string[];
    played_at: string;
  }>> {
    try {
      const response = await spotifyApi.get(
        `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
        session
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch recently played: ${response.status}`);
      }

      const data = await response.json();
      const items = data.items || [];

      // Fetch genres for each track
      const results = await Promise.all(
        items.map(async (item: any) => {
          const genres = await this.getGenresFromTrack(item.track, session);
          return {
            track: item.track,
            genres,
            played_at: item.played_at
          };
        })
      );

      return results;
    } catch (error) {
      console.error('Failed to fetch recently played with genres:', error);
      return [];
    }
  }

  /**
   * Aggregate genres from recently played tracks
   * Useful as fallback when nothing is currently playing
   */
  async detectGenresFromRecentHistory(session: Session): Promise<GenreDetectionResult> {
    try {
      const recentTracks = await this.getRecentlyPlayedWithGenres(session, 10);

      if (recentTracks.length === 0) {
        return {
          genres: [],
          track: null,
          confidence: 'none',
          source: 'none'
        };
      }

      // Aggregate genres across all recent tracks
      const genreCounts = new Map<string, number>();

      recentTracks.forEach(item => {
        item.genres.forEach(genre => {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        });
      });

      // Sort by frequency
      const topGenres = Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([genre]) => genre)
        .slice(0, 3);

      return {
        genres: topGenres,
        track: recentTracks[0]?.track || null,
        confidence: topGenres.length > 0 ? 'medium' : 'low',
        source: 'current_playback'
      };
    } catch (error) {
      console.error('Failed to detect genres from recent history:', error);
      return {
        genres: [],
        track: null,
        confidence: 'none',
        source: 'none'
      };
    }
  }
}

// Create singleton instance
export const genreDetector = new SpotifyGenreDetector();

// Export types
export type { GenreDetectionResult, SpotifyTrack, SpotifyArtist };
