'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface SpotifyData {
  track_id?: string;
  track_name?: string;
  artist_name?: string;
  album_name?: string;
  is_playing?: boolean;
}

interface HeartbeatOptions {
  interval?: number; // in milliseconds, default 30s
  onError?: (error: Error) => void;
}

export function useHeartbeat(options: HeartbeatOptions = {}) {
  const { data: session } = useSession();
  const { interval = 30000, onError } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentRoomRef = useRef<string | null>(null);
  const spotifyDataRef = useRef<SpotifyData | null>(null);

  const sendHeartbeat = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/user/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_room_id: currentRoomRef.current,
          spotify_data: spotifyDataRef.current
        })
      });

      if (!response.ok) {
        throw new Error(`Heartbeat failed: ${response.status}`);
      }
      
      // Optional: could return updated status for UI updates
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Heartbeat error:', error);
      onError?.(error as Error);
    }
  }, [session, onError]);

  // Start heartbeat when session is available
  useEffect(() => {
    if (!session?.user) return;

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session, interval, sendHeartbeat]);

  // Update room status
  const setCurrentRoom = useCallback((roomId: string | null) => {
    currentRoomRef.current = roomId;
    // Send immediate heartbeat when room changes
    sendHeartbeat();
  }, [sendHeartbeat]);

  // Update Spotify status
  const updateSpotifyStatus = useCallback((spotifyData: SpotifyData | null) => {
    spotifyDataRef.current = spotifyData;
    // Optional: could debounce this to avoid too frequent updates
  }, []);

  // Manual heartbeat trigger
  const triggerHeartbeat = useCallback(() => {
    return sendHeartbeat();
  }, [sendHeartbeat]);

  return {
    setCurrentRoom,
    updateSpotifyStatus,
    triggerHeartbeat,
    isActive: !!session?.user && !!intervalRef.current
  };
}