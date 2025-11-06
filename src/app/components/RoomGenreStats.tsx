'use client';

import { useEffect, useState } from 'react';

interface PlayHistoryEntry {
  id: string;
  track_id: string;
  track_name: string;
  artist_names: string;
  detected_genres: string[];
  played_at: string;
  played_by: string | null;
}

interface RoomGenreStatsProps {
  roomId: string;
  refreshTrigger?: number;
}

export default function RoomGenreStats({
  roomId,
  refreshTrigger = 0
}: RoomGenreStatsProps) {
  const [history, setHistory] = useState<PlayHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/rooms/${roomId}/play-history?limit=10`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error('Failed to fetch play history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [roomId, refreshTrigger]);

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading play history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return null;
  }

  // Calculate genre distribution
  const genreCount = new Map<string, number>();
  history.forEach(entry => {
    entry.detected_genres?.forEach(genre => {
      genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
    });
  });

  const topGenres = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              📊 Play History & Stats
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {history.length} track{history.length !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-gray-500 dark:text-gray-400">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Genre Distribution */}
          {topGenres.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Genre Distribution
              </h4>
              <div className="space-y-2">
                {topGenres.map(([genre, count]) => {
                  const percentage = Math.round((count / history.length) * 100);
                  return (
                    <div key={genre} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400 w-24 truncate">
                        {genre}
                      </span>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 dark:bg-blue-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Tracks */}
          <div>
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recently Played
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-xs"
                >
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {entry.track_name}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 truncate">
                    {entry.artist_names}
                  </div>
                  {entry.detected_genres && entry.detected_genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.detected_genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px]"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(entry.played_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
