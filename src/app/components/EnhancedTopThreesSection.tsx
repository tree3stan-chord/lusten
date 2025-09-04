'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import SpotifySettingsModal from './SpotifySettingsModal';
import { SpotifyImage } from './OptimizedImage';
import type { ParsedSpotifyStats } from '../../lib/sqlite-db';

interface EnhancedTopThreesSectionProps {
  spotifyStats: ParsedSpotifyStats | null;
  userName: string;
  userId: string;
  isOwnProfile: boolean;
  onStatsUpdated?: (newStats: ParsedSpotifyStats) => void;
}

interface RefreshState {
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

export default function EnhancedTopThreesSection({
  spotifyStats,
  userName,
  userId,
  isOwnProfile,
  onStatsUpdated
}: EnhancedTopThreesSectionProps) {
  const { data: session } = useSession();
  const [refreshState, setRefreshState] = useState<RefreshState>({
    isLoading: false,
    error: null,
    lastRefresh: null
  });
  
  const [showSettings, setShowSettings] = useState(false);

  const handleManualRefresh = useCallback(async (force: boolean = false) => {
    if (!session || !isOwnProfile) return;

    setRefreshState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/users/${userId}/spotify-stats?time_range=medium_term&force=${force}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh stats');
      }

      const data = await response.json();
      
      if (data.stats && onStatsUpdated) {
        onStatsUpdated(data.stats);
      }

      setRefreshState({
        isLoading: false,
        error: null,
        lastRefresh: new Date()
      });

    } catch (error) {
      setRefreshState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, [session, isOwnProfile, userId, onStatsUpdated]);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const shouldShowRefreshButton = isOwnProfile && session;
  const hasStaleData = spotifyStats && 
    (new Date().getTime() - new Date(spotifyStats.last_updated).getTime()) > (24 * 60 * 60 * 1000);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top 3s
          </h3>
          {spotifyStats?.last_updated && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Updated {getTimeAgo(spotifyStats.last_updated)}
              </p>
              {hasStaleData && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                  Stale
                </span>
              )}
            </div>
          )}
        </div>

        {shouldShowRefreshButton && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Top 3s Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            <button
              onClick={() => handleManualRefresh(false)}
              disabled={refreshState.isLoading}
              className={`p-2 rounded-lg transition-colors ${
                refreshState.isLoading
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Refresh Top 3s"
            >
              {refreshState.isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
            {hasStaleData && (
              <button
                onClick={() => handleManualRefresh(true)}
                disabled={refreshState.isLoading}
                className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                title="Force refresh now"
              >
                Refresh Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {refreshState.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">
                Failed to refresh: {refreshState.error}
              </p>
              <button
                onClick={() => setRefreshState(prev => ({ ...prev, error: null }))}
                className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {refreshState.isLoading && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-500 animate-spin mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Refreshing your Top 3s...
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                This may take a few seconds
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!spotifyStats && !refreshState.isLoading && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {isOwnProfile ? 'No Top 3s yet' : `No Top 3s for ${userName}`}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            {isOwnProfile 
              ? 'Your listening data will be analyzed to create Top 3s automatically.'
              : 'Top 3s will appear once their listening data is analyzed.'
            }
          </p>
          {shouldShowRefreshButton && (
            <button
              onClick={() => handleManualRefresh(true)}
              disabled={refreshState.isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors font-medium"
            >
              Generate My Top 3s
            </button>
          )}
        </div>
      )}

      {/* Stats Display */}
      {spotifyStats && !refreshState.isLoading && (
        <div className="space-y-6">
          {/* Success message for fresh refresh */}
          {refreshState.lastRefresh && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✨ Top 3s refreshed successfully!
              </p>
            </div>
          )}

          {/* Top Artists */}
          <EnhancedStatSection
            title="🎤 Artists"
            items={spotifyStats.top_artists}
            renderItem={(artist, index) => (
              <div key={artist.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <span className="text-xs font-medium text-gray-400 w-4">#{index + 1}</span>
                <SpotifyImage
                  images={artist.images}
                  alt={artist.name}
                  size="md"
                  className="rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {artist.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {artist.genres.slice(0, 2).join(', ') || 'Various genres'}
                  </p>
                </div>
              </div>
            )}
          />

          {/* Top Albums */}
          <EnhancedStatSection
            title="💿 Albums"
            items={spotifyStats.top_albums}
            renderItem={(album, index) => (
              <div key={album.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <span className="text-xs font-medium text-gray-400 w-4">#{index + 1}</span>
                <SpotifyImage
                  images={album.images}
                  alt={album.name}
                  size="md"
                  className="rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {album.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    by {album.artist}
                  </p>
                </div>
              </div>
            )}
          />

          {/* Top Genres */}
          <EnhancedStatSection
            title="🎭 Genres"
            items={spotifyStats.top_genres}
            renderItem={(genre, index) => (
              <div key={genre.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-medium text-gray-400 w-4">#{index + 1}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {genre.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-full">
                  {genre.count}
                </span>
              </div>
            )}
          />
        </div>
      )}

      {/* Settings Modal */}
      <SpotifySettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userId={userId}
      />
    </div>
  );
}

// Enhanced Stat Section Component
interface EnhancedStatSectionProps<T> {
  title: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function EnhancedStatSection<T>({ title, items, renderItem }: EnhancedStatSectionProps<T>) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
        {title}
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          ({items.length}/3)
        </span>
      </h4>
      {items.length === 0 ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-xs italic">No data available</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 3).map((item, index) => renderItem(item, index))}
        </div>
      )}
    </div>
  );
}