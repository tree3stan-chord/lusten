'use client';

import { useEffect, useState } from 'react';

interface GenreAnalysis {
  tracks_analyzed: number;
  suggested_genres: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  should_update: boolean;
}

interface LiveGenreIndicatorProps {
  roomId: string;
  currentGenres: string[];
  refreshTrigger?: number;
}

export default function LiveGenreIndicator({
  roomId,
  currentGenres,
  refreshTrigger = 0
}: LiveGenreIndicatorProps) {
  const [analysis, setAnalysis] = useState<GenreAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/rooms/${roomId}/analyze-genres`);
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data.analysis);
        }
      } catch (error) {
        console.error('Failed to fetch genre analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [roomId, refreshTrigger]);

  if (loading || !analysis) {
    return null;
  }

  // Don't show if no tracks analyzed yet
  if (analysis.tracks_analyzed === 0) {
    return null;
  }

  const hasNewGenres = analysis.suggested_genres.length > 0 &&
    analysis.suggested_genres.some(g => !currentGenres.includes(g));

  const confidenceColor = {
    high: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    low: 'text-gray-600 dark:text-gray-400',
    none: 'text-gray-400 dark:text-gray-500'
  }[analysis.confidence];

  const confidenceBg = {
    high: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    medium: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    low: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    none: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
  }[analysis.confidence];

  return (
    <div className={`mt-4 p-4 rounded-lg border ${confidenceBg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              🎵 Live Genre Detection
            </span>
            <span className={`text-xs font-medium ${confidenceColor}`}>
              {analysis.confidence.toUpperCase()}
            </span>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Based on {analysis.tracks_analyzed} track{analysis.tracks_analyzed !== 1 ? 's' : ''} played
          </p>

          {analysis.suggested_genres.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 mb-2">
                {analysis.suggested_genres.map((genre) => (
                  <span
                    key={genre}
                    className={`px-2 py-1 text-xs rounded-full ${
                      currentGenres.includes(genre)
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                    }`}
                  >
                    {genre}
                    {!currentGenres.includes(genre) && (
                      <span className="ml-1">✨</span>
                    )}
                  </span>
                ))}
              </div>

              {hasNewGenres && analysis.confidence === 'high' && (
                <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                  ✨ New genres detected! Room genres will update automatically.
                </p>
              )}

              {hasNewGenres && analysis.confidence === 'medium' && (
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                  Keep listening! More tracks needed for automatic update.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No consistent genres detected yet. Keep listening!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
