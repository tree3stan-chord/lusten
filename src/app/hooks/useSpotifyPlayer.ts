'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { spotifyApi } from '../../lib/spotify-api-client';
import { useSessionHealth } from './useSessionHealth';

interface SpotifyPlayer {
  addListener: (event: string, callback: (data: unknown) => void) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
}

interface SpotifyWebPlaybackSDK {
  Player: new (options: {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume: number;
  }) => SpotifyPlayer;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: SpotifyWebPlaybackSDK;
    spotifySDKReady?: boolean;
    initializeSpotifyPlayer?: () => void;
  }
}

interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
}

interface PlayerState {
  context: {
    uri: string;
  };
  track_window: {
    current_track: Track;
  };
  position: number;
  duration: number;
  paused: boolean;
}

export const useSpotifyPlayer = (isHost: boolean = false) => {
  const { data: session } = useSession();
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  // Add session health monitoring
  const sessionHealth = useSessionHealth({
    checkInterval: 30000, // Check every 30 seconds for active music sessions
    preemptiveRefreshTime: 300000, // Refresh 5 minutes before expiry
    onConnectionStateChange: (state) => {
      console.log(`useSpotifyPlayer: Connection state changed to: ${state}`);
    }
  });

  useEffect(() => {
    if (!(session as unknown as { accessToken?: string })?.accessToken) return;
    
    // Only create Web SDK player for hosts
    if (!isHost) {
      setIsReady(true); // Listeners are always "ready" since they don't need SDK
      return;
    }

    const initializePlayer = () => {
      if (!window.Spotify) return;

      const spotifyPlayer = new window.Spotify.Player({
        name: `Lusten (${session?.user?.name || 'User'})`,
        getOAuthToken: (cb: (token: string) => void) => {
          const accessToken = (session as unknown as { accessToken?: string })?.accessToken;
          if (accessToken) {
            cb(accessToken);
          }
        },
        volume: 0.8,
      });

      // Ready
      spotifyPlayer.addListener('ready', (data: unknown) => {
        const { device_id } = data as { device_id: string };
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
        setIsReady(true);
      });

      // Not Ready
      spotifyPlayer.addListener('not_ready', (data: unknown) => {
        const { device_id } = data as { device_id: string };
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      // Player state changed
      spotifyPlayer.addListener('player_state_changed', (data: unknown) => {
        const state = data as PlayerState;
        if (!state) return;
        
        setPlayerState(state);
        setCurrentTrack(state.track_window.current_track);
      });

      // Connect to the player
      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    // Set up the initialization function for the global callback
    window.initializeSpotifyPlayer = initializePlayer;

    // Check if SDK is already ready
    if (window.spotifySDKReady && window.Spotify) {
      initializePlayer();
    }

    return () => {
      if (player) {
        player.disconnect();
      }
      // Clean up global reference
      if (window.initializeSpotifyPlayer === initializePlayer) {
        window.initializeSpotifyPlayer = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isHost]); // Removed player from dependencies to prevent infinite loop

  const activateDevice = useCallback(async () => {
    if (!(session as unknown as { accessToken?: string })?.accessToken || !deviceId) return;

    try {
      console.log('Activating device:', deviceId);
      const response = await spotifyApi.put('https://api.spotify.com/v1/me/player', {
        device_ids: [deviceId],
        play: false
      }, session as any);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Device activation failed: ${response.status} ${errorText}`);
      }

      console.log('Device activated successfully:', deviceId);
      
      // Wait a moment for device activation to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Failed to activate device:', error);
      throw error;
    }
  }, [session, deviceId]);

  const play = useCallback(async (spotifyUri?: string) => {
    if (!(session as unknown as { accessToken?: string })?.accessToken || !deviceId) return;

    const body = spotifyUri ? { uris: [spotifyUri] } : undefined;
    
    await spotifyApi.put(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, body, session);
  }, [session, deviceId]);

  const pause = useCallback(async () => {
    if (!(session as unknown as { accessToken?: string })?.accessToken) return;

    await spotifyApi.put('https://api.spotify.com/v1/me/player/pause', undefined, session);
  }, [session]);

  const skipToNext = useCallback(async () => {
    if (!(session as unknown as { accessToken?: string })?.accessToken) return;

    await spotifyApi.post('https://api.spotify.com/v1/me/player/next', undefined, session);
  }, [session]);

  const skipToPrevious = useCallback(async () => {
    if (!(session as unknown as { accessToken?: string })?.accessToken) return;

    await spotifyApi.post('https://api.spotify.com/v1/me/player/previous', undefined, session);
  }, [session]);

  const setVolume = useCallback(async (volume: number) => {
    if (!(session as unknown as { accessToken?: string })?.accessToken) return;

    await spotifyApi.put(`https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(volume * 100)}`, undefined, session);
  }, [session]);

  const seekToPosition = useCallback(async (positionMs: number) => {
    if (!(session as unknown as { accessToken?: string })?.accessToken || !deviceId) return;

    try {
      await spotifyApi.put(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(positionMs)}&device_id=${deviceId}`, undefined, session);
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  }, [session, deviceId]);

  const getCurrentPosition = useCallback(async (): Promise<number> => {
    if (!player) return 0;
    
    try {
      const state = await (player as unknown as { getCurrentState: () => Promise<{ position?: number }> }).getCurrentState();
      if (state) {
        return state.position || 0;
      }
    } catch (error) {
      console.error('Failed to get current position:', error);
    }
    return 0;
  }, [player]);

  const transferPlayback = useCallback(async (trackUri: string, position: number = 0, shouldPlay: boolean = true) => {
    if (!(session as unknown as { accessToken?: string })?.accessToken) return;

    try {
      console.log('Transferring playback to:', trackUri, 'at position:', position, 'shouldPlay:', shouldPlay);
      
      if (isHost) {
        // Host: Use Web SDK device
        if (!deviceId) return;
        
        // First activate the device to ensure it can receive playback
        await activateDevice();
        
        // Stop current playback if any
        await pause();
        
        // Small delay to ensure clean state
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Start playing the specific track with position
        const response = await spotifyApi.put(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          uris: [trackUri],
          position_ms: Math.round(position)
        }, session as any);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Transfer playback failed: ${response.status} ${errorText}`);
        }

        // If we should be paused, pause after starting
        if (!shouldPlay) {
          await new Promise(resolve => setTimeout(resolve, 200));
          await pause();
        }
      } else {
        // Listener: Use any active device (no specific device_id)
        const response = await spotifyApi.put('https://api.spotify.com/v1/me/player/play', {
          uris: [trackUri],
          position_ms: Math.round(position)
        }, session as any);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Listener transfer playback failed: ${response.status} ${errorText}`);
        }

        // If we should be paused, pause after starting
        if (!shouldPlay) {
          await new Promise(resolve => setTimeout(resolve, 200));
          await spotifyApi.put('https://api.spotify.com/v1/me/player/pause', undefined, session);
        }
      }

      console.log('Playback transfer completed successfully');
      
    } catch (error) {
      console.error('Failed to transfer playback:', error);
      throw error;
    }
  }, [session, isHost, deviceId, activateDevice, pause]);

  return {
    player,
    deviceId,
    isReady: isReady && sessionHealth.isHealthy, // Only ready if both player and session are healthy
    currentTrack,
    playerState,
    isPlaying: playerState ? !playerState.paused : false,
    position: playerState ? playerState.position : 0,
    play,
    pause,
    skipToNext,
    skipToPrevious,
    setVolume,
    seekToPosition,
    getCurrentPosition,
    activateDevice,
    transferPlayback,
    lastSyncTime,
    // Session health information
    sessionHealth: {
      isHealthy: sessionHealth.isHealthy,
      connectionState: sessionHealth.connectionState,
      isReconnecting: sessionHealth.isReconnecting,
      canRetry: sessionHealth.canRetry,
      hasError: sessionHealth.hasError,
      attemptRecovery: sessionHealth.attemptRecovery,
      resetErrorState: sessionHealth.resetErrorState
    }
  };
};