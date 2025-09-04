'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { ParsedSpotifyStats } from '../../lib/sqlite-db';

interface UseSpotifyStatsOptions {
  userId: string;
  initialStats?: ParsedSpotifyStats | null;
  autoRefresh?: boolean;
  autoRefreshInterval?: number; // in milliseconds
}

interface SpotifyStatsState {
  stats: ParsedSpotifyStats | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;
  isRefreshing: boolean;
}

interface SpotifyStatsActions {
  refreshStats: (force?: boolean) => Promise<void>;
  clearError: () => void;
  updateStats: (newStats: ParsedSpotifyStats) => void;
}

export function useSpotifyStats(
  options: UseSpotifyStatsOptions
): SpotifyStatsState & SpotifyStatsActions {
  const { data: session } = useSession();
  const { userId, initialStats, autoRefresh = false, autoRefreshInterval = 300000 } = options;

  const [state, setState] = useState<SpotifyStatsState>({
    stats: initialStats || null,
    isLoading: false,
    error: null,
    lastFetch: null,
    isRefreshing: false
  });

  const refreshStats = useCallback(async (force: boolean = false) => {
    if (!session || !userId) return;

    setState(prev => ({ 
      ...prev, 
      isLoading: !prev.stats, // Show loading only if no existing stats
      isRefreshing: !!prev.stats, // Show refreshing if stats exist
      error: null 
    }));

    try {
      const response = await fetch(
        `/api/users/${userId}/spotify-stats?force=${force}`,
        { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        stats: data.stats,
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastFetch: new Date()
      }));

    } catch (error) {
      console.error('Failed to refresh Spotify stats:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: error instanceof Error ? error.message : 'Failed to refresh stats'
      }));
    }
  }, [session, userId]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const updateStats = useCallback((newStats: ParsedSpotifyStats) => {
    setState(prev => ({
      ...prev,
      stats: newStats,
      lastFetch: new Date(),
      error: null
    }));
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !session || !userId) return;

    const interval = setInterval(() => {
      if (state.stats) {
        const hoursSinceUpdate = (Date.now() - new Date(state.stats.last_updated).getTime()) / (1000 * 60 * 60);
        
        // Auto-refresh if stats are older than 6 hours
        if (hoursSinceUpdate > 6) {
          refreshStats(false);
        }
      }
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, autoRefreshInterval, session, userId, state.stats, refreshStats]);

  // Initial fetch effect
  useEffect(() => {
    if (!state.stats && session && userId && !state.isLoading && !state.error) {
      // Try to fetch cached stats first
      fetch(`/api/users/${userId}/spotify-stats`)
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          // If no cached stats exist, that's okay - we'll show the empty state
          return null;
        })
        .then(data => {
          if (data?.stats) {
            setState(prev => ({
              ...prev,
              stats: data.stats,
              lastFetch: new Date()
            }));
          }
        })
        .catch(error => {
          console.warn('Failed to fetch cached stats:', error);
          // Don't set error state for failed cache fetch
        });
    }
  }, [session, userId, state.stats, state.isLoading, state.error]);

  return {
    ...state,
    refreshStats,
    clearError,
    updateStats
  };
}

// Hook for getting stats freshness info
export function useStatsFreshness(stats: ParsedSpotifyStats | null) {
  const [freshness, setFreshness] = useState<{
    isStale: boolean;
    timeAgo: string;
    hoursOld: number;
  }>({ isStale: false, timeAgo: 'Never updated', hoursOld: 0 });

  useEffect(() => {
    if (!stats?.last_updated) {
      setFreshness({ isStale: true, timeAgo: 'Never updated', hoursOld: 0 });
      return;
    }

    const updateFreshness = () => {
      const lastUpdated = new Date(stats.last_updated);
      const now = new Date();
      const diffInMs = now.getTime() - lastUpdated.getTime();
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));

      let timeAgo: string;
      if (diffInHours === 0 && diffInMinutes < 5) {
        timeAgo = 'Just now';
      } else if (diffInHours === 0) {
        timeAgo = `${diffInMinutes} minutes ago`;
      } else if (diffInHours === 1) {
        timeAgo = '1 hour ago';
      } else if (diffInHours < 24) {
        timeAgo = `${diffInHours} hours ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) {
          timeAgo = '1 day ago';
        } else if (diffInDays < 7) {
          timeAgo = `${diffInDays} days ago`;
        } else {
          timeAgo = lastUpdated.toLocaleDateString();
        }
      }

      setFreshness({
        isStale: diffInHours > 24, // Consider stale after 24 hours
        timeAgo,
        hoursOld: diffInHours
      });
    };

    updateFreshness();
    const interval = setInterval(updateFreshness, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [stats?.last_updated]);

  return freshness;
}