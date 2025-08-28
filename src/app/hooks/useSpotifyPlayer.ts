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

export const useSpotifyPlayer = () => {
  const { data: session } = useSession();
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);

  useEffect(() => {
    // @ts-expect-error - NextAuth v4 session extension
    if (!session?.accessToken) return;

    const script = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
    if (!script) return;

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Lusten Web Player',
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

    // If SDK is already loaded, initialize immediately
    if (window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady();
    }

    return () => {
      if (player) {
        player.disconnect();
      }
    };
    // @ts-expect-error - NextAuth v4 session extension
  }, [session?.accessToken, player]);

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

  return {
    player,
    deviceId,
    isReady,
    currentTrack,
    playerState,
    isPlaying: playerState ? !playerState.paused : false,
    play,
    pause,
    skipToNext,
    skipToPrevious,
    setVolume,
  };
};