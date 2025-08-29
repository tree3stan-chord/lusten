'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

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

  useEffect(() => {
    // @ts-expect-error - NextAuth v4 session extension
    if (!session?.accessToken) return;
    
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
          // @ts-expect-error - NextAuth v4 session extension
          cb(session.accessToken!);
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
    // @ts-expect-error - NextAuth v4 session extension
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, isHost]); // Removed player from dependencies to prevent infinite loop

  const activateDevice = useCallback(async () => {
    // @ts-expect-error - NextAuth v4 session extension
    if (!session?.accessToken || !deviceId) return;

    try {
      console.log('Activating device:', deviceId);
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false
        }),
        headers: {
          'Content-Type': 'application/json',
          // @ts-expect-error - NextAuth v4 session extension
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });

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
    // @ts-expect-error - NextAuth v4 session extension
  }, [session?.accessToken, deviceId]);

  const play = useCallback(async (spotifyUri?: string) => {
    // @ts-expect-error - NextAuth v4 session extension
    if (!session?.accessToken || !deviceId) return;

    const body = spotifyUri ? { uris: [spotifyUri] } : undefined;
    
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        // @ts-expect-error - NextAuth v4 session extension
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });
    // @ts-expect-error - NextAuth v4 session extension
  }, [session?.accessToken, deviceId]);

  const pause = useCallback(async () => {
    // @ts-expect-error - NextAuth v4 session extension
    if (!session?.accessToken) return;

    await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: {
        // @ts-expect-error - NextAuth v4 session extension
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });
    // @ts-expect-error - NextAuth v4 session extension
  }, [session?.accessToken]);

  const skipToNext = useCallback(async () => {
    // @ts-expect-error - NextAuth v4 session extension
    if (!session?.accessToken) return;

    await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: {
        // @ts-expect-error - NextAuth v4 session extension
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });
    // @ts-expect-error - NextAuth v4 session extension
  }, [session?.accessToken]);

  const skipToPrevious = useCallback(async () => {
    // @ts-expect-error - NextAuth v4 session extension
    if (!session?.accessToken) return;

    await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: {
        // @ts-expect-error - NextAuth v4 session extension
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });
    // @ts-expect-error - NextAuth v4 session extension
  }, [session?.accessToken]);

  const setVolume = useCallback(async (volume: number) => {
    // @ts-expect-error - NextAuth v4 session extension
    if (!session?.accessToken) return;

    await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(volume * 100)}`, {
      method: 'PUT',
      headers: {
        // @ts-expect-error - NextAuth v4 session extension
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });
    // @ts-expect-error - NextAuth v4 session extension
  }, [session?.accessToken]);

  const seekToPosition = useCallback(async (positionMs: number) => {
    // @ts-expect-error - NextAuth v4 session extension
    if (!session?.accessToken || !deviceId) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(positionMs)}&device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          // @ts-expect-error - NextAuth v4 session extension
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('Failed to seek:', error);
    }
    // @ts-expect-error - NextAuth v4 session extension
  }, [session?.accessToken, deviceId]);

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
    // @ts-expect-error - NextAuth v4 session extension
    if (!session?.accessToken) return;

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
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          body: JSON.stringify({
            uris: [trackUri],
            position_ms: Math.round(position)
          }),
          headers: {
            'Content-Type': 'application/json',
            // @ts-expect-error - NextAuth v4 session extension
            'Authorization': `Bearer ${session.accessToken}`,
          },
        });

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
        const response = await fetch('https://api.spotify.com/v1/me/player/play', {
          method: 'PUT',
          body: JSON.stringify({
            uris: [trackUri],
            position_ms: Math.round(position)
          }),
          headers: {
            'Content-Type': 'application/json',
            // @ts-expect-error - NextAuth v4 session extension
            'Authorization': `Bearer ${session.accessToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Listener transfer playback failed: ${response.status} ${errorText}`);
        }

        // If we should be paused, pause after starting
        if (!shouldPlay) {
          await new Promise(resolve => setTimeout(resolve, 200));
          await fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: {
              // @ts-expect-error - NextAuth v4 session extension
              'Authorization': `Bearer ${session.accessToken}`,
            },
          });
        }
      }

      console.log('Playback transfer completed successfully');
      
    } catch (error) {
      console.error('Failed to transfer playback:', error);
      throw error;
    }
    // @ts-expect-error - NextAuth v4 session extension
  }, [session?.accessToken, isHost, deviceId, activateDevice, pause]);

  return {
    player,
    deviceId,
    isReady,
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
  };
};