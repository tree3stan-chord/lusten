// Server-side genre detector (no client hooks)
import fetch from 'node-fetch';

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
}

/**
 * Server-side genre detection for track-change events
 * Uses host's access token to fetch artist genres
 */
export class ServerGenreDetector {
  /**
   * Get genres from track artists using Spotify API
   */
  async detectGenresFromTrack(
    artistIds: string[],
    accessToken: string
  ): Promise<string[]> {
    if (!artistIds || artistIds.length === 0) return [];

    try {
      // Batch fetch artists (Spotify allows up to 50)
      const idsParam = artistIds.slice(0, 50).join(',');
      const response = await fetch(
        `https://api.spotify.com/v1/artists?ids=${idsParam}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch artists: ${response.status}`);
        return [];
      }

      const data = await response.json() as { artists: SpotifyArtist[] };
      const artists = data.artists || [];

      // Collect all unique genres
      const genreSet = new Set<string>();
      const genreCounts = new Map<string, number>();

      artists.forEach(artist => {
        if (artist && artist.genres) {
          artist.genres.forEach(genre => {
            const formatted = this.formatGenreName(genre);
            genreSet.add(formatted);
            genreCounts.set(formatted, (genreCounts.get(formatted) || 0) + 1);
          });
        }
      });

      // Sort by frequency and return top 5
      const sortedGenres = Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([genre]) => genre)
        .slice(0, 5);

      return sortedGenres;
    } catch (error) {
      console.error('Error detecting genres from track:', error);
      return [];
    }
  }

  /**
   * Format genre names for better display
   */
  private formatGenreName(genre: string): string {
    return genre
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

// Export singleton instance
export const serverGenreDetector = new ServerGenreDetector();
