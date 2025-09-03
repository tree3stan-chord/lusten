'use client';

import React from 'react';
import Image from 'next/image';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { useSession } from 'next-auth/react';

interface Track {
  id: string;
  name: string;
  uri?: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
}

interface SpotifyPlayerProps {
  isHost: boolean;
  onTrackChange?: (track: Track) => void;
  onPlayStateChange?: (isPlaying: boolean, position?: number) => void;
  onSeek?: (position: number) => void;
  currentTrack?: Track;
  syncedIsPlaying?: boolean;
  syncedPosition?: number;
  lastUpdate?: number;
  syncEvents?: {
    seekTo?: { position: number; timestamp: number }
  };
  onSyncEventHandled?: () => void;
}

export default function SpotifyPlayer({ 
  isHost, 
  onTrackChange, 
  onPlayStateChange,
  currentTrack: syncedTrack,
  syncedIsPlaying,
  syncedPosition,
  lastUpdate,
  syncEvents,
  onSyncEventHandled
}: SpotifyPlayerProps) {
  const { data: session } = useSession();
  const {
    isReady,
    currentTrack,
    isPlaying,
    position,
    play,
    pause,
    skipToNext,
    skipToPrevious,
    seekToPosition,
    transferPlayback,
    sessionHealth,
  } = useSpotifyPlayer(isHost);

  // Use synced data if available (for non-hosts), otherwise use local player state
  const displayTrack = !isHost && syncedTrack ? syncedTrack : currentTrack;
  const displayIsPlaying = !isHost && syncedIsPlaying !== undefined ? syncedIsPlaying : isPlaying;

  // Handle sync events (seek commands from host)
  React.useEffect(() => {
    if (!isHost && syncEvents?.seekTo && seekToPosition) {
      const { position: seekPosition } = syncEvents.seekTo;
      console.log('Syncing to position:', seekPosition);
      seekToPosition(seekPosition * 1000); // Convert to milliseconds
      onSyncEventHandled?.();
    }
  }, [syncEvents, seekToPosition, isHost, onSyncEventHandled]);

  // Transfer playback to synced track for listeners
  const lastTransferTrackRef = React.useRef<string>('');
  
  React.useEffect(() => {
    if (!isHost && syncedTrack && transferPlayback && isReady && syncedPosition !== undefined && lastUpdate) {
      // Only transfer if it's a different track
      if (lastTransferTrackRef.current === syncedTrack.id) {
        return;
      }
      
      console.log('Listener: Transferring playback to synced track:', syncedTrack.name);
      lastTransferTrackRef.current = syncedTrack.id;
      
      const syncToTrack = async () => {
        try {
          const trackUri = syncedTrack.uri || `spotify:track:${syncedTrack.id}`;
          
          // Calculate target position with buffer
          const now = Date.now();
          const timeSinceUpdate = (now - lastUpdate) / 1000;
          const bufferTime = 1.0; // 1 second buffer for transfer delays
          const targetPosition = syncedPosition + (syncedIsPlaying ? timeSinceUpdate + bufferTime : 0);
          
          console.log('Listener: Transfer details:', {
            trackName: syncedTrack.name,
            originalPosition: Math.floor(syncedPosition),
            timeSinceUpdate: Math.floor(timeSinceUpdate * 10) / 10,
            bufferTime,
            targetPosition: Math.floor(targetPosition * 10) / 10,
            shouldPlay: syncedIsPlaying
          });
          
          // Transfer playback with position and play state
          const positionMs = Math.max(0, targetPosition * 1000);
          await transferPlayback(trackUri, positionMs, syncedIsPlaying);
          
          console.log('Listener: Playback transfer completed successfully');
          
        } catch (error) {
          console.error('Listener: Failed to transfer playback:', error);
        }
      };
      
      syncToTrack();
    }
  }, [isHost, syncedTrack, transferPlayback, syncedPosition, syncedIsPlaying, lastUpdate, isReady]);


  // Notify parent components of state changes (only for hosts)
  const prevTrackRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    if (isHost && onTrackChange && currentTrack) {
      if (prevTrackRef.current !== currentTrack.id) {
        onTrackChange(currentTrack);
        prevTrackRef.current = currentTrack.id;
      }
    }
  }, [isHost, currentTrack, onTrackChange]);

  const prevPlayStateRef = React.useRef<{ isPlaying: boolean; position: number } | null>(null);
  
  React.useEffect(() => {
    if (isHost && onPlayStateChange) {
      const currentState = { isPlaying, position };
      const prevState = prevPlayStateRef.current;
      
      if (!prevState || 
          prevState.isPlaying !== currentState.isPlaying || 
          Math.abs(prevState.position - currentState.position) > 1000) {
        onPlayStateChange(isPlaying, position);
        prevPlayStateRef.current = currentState;
      }
    }
  }, [isHost, isPlaying, position, onPlayStateChange]);

  // Host seeking functionality (for future progress bar implementation)
  // const handleHostSeek = React.useCallback(async (newPosition: number) => {
  //   if (isHost && onSeek && seekToPosition) {
  //     const positionSeconds = newPosition / 1000;
  //     onSeek(positionSeconds);
  //     await seekToPosition(newPosition);
  //   }
  // }, [isHost, onSeek, seekToPosition]);

  if (!session) {
    return (
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
        <p className="text-gray-600 dark:text-gray-300">Please connect to Spotify to control playback</p>
      </div>
    );
  }

  // Show connection status if there are issues
  if (sessionHealth?.hasError && sessionHealth?.canRetry) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center border border-red-200 dark:border-red-800">
        <div className="flex items-center justify-center mb-3">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Connection Issue</h3>
        </div>
        <p className="text-red-700 dark:text-red-300 mb-4">
          We&apos;re having trouble connecting to Spotify. Your session may have expired or there might be a network issue.
        </p>
        <button
          onClick={sessionHealth.attemptRecovery}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (sessionHealth?.isReconnecting) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center justify-center mb-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-2"></div>
          <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">Reconnecting</h3>
        </div>
        <p className="text-yellow-700 dark:text-yellow-300">
          Reconnecting to Spotify... Please wait.
        </p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Initializing Spotify player...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {displayTrack ? (
        <div>
          {/* Track Info */}
          <div className="text-center mb-6">
            <div className="w-48 h-48 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center overflow-hidden">
              {displayTrack.album.images[0] ? (
                <Image
                  src={displayTrack.album.images[0].url}
                  alt={displayTrack.album.name}
                  width={192}
                  height={192}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              )}
            </div>
            
            <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {displayTrack.name}
            </h4>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-1">
              {displayTrack.artists.map(artist => artist.name).join(', ')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {displayTrack.album.name}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            {isHost ? (
              <>
                <button
                  onClick={skipToPrevious}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                  </svg>
                </button>
                
                <button
                  onClick={displayIsPlaying ? pause : () => play()}
                  className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
                >
                  {displayIsPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={skipToNext}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="p-4 bg-gray-300 dark:bg-gray-600 rounded-full">
                  {displayIsPlaying ? (
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Only the host can control playback
                </span>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="text-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              displayIsPlaying 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
            }`}>
              {displayIsPlaying ? '🎵 Playing' : '⏸️ Paused'}
              {!isHost && ' • Synced with host'}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          <p className="text-lg mb-2">No track playing</p>
          <p className="text-sm">
            {isHost ? 'Start playing music from your Spotify app' : 'Waiting for the host to start music'}
          </p>
        </div>
      )}
    </div>
  );
}