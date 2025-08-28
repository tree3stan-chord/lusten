'use client';

import React from 'react';
import Image from 'next/image';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { useSession } from 'next-auth/react';

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
    lastSyncTime,
  } = useSpotifyPlayer();

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

  // Position sync for new joiners (non-hosts)
  const lastSyncCheck = React.useRef<number>(0);
  
  React.useEffect(() => {
    if (!isHost && syncedPosition !== undefined && lastUpdate && seekToPosition) {
      const now = Date.now();
      
      // Only check sync every 5 seconds to prevent constant re-renders
      if (now - lastSyncCheck.current < 5000) return;
      
      const timeSinceUpdate = (now - lastUpdate) / 1000; // Convert to seconds
      const currentSyncPosition = syncedPosition + (syncedIsPlaying ? timeSinceUpdate : 0);
      
      // Only sync if we're off by more than 2 seconds
      const currentPos = position / 1000; // Convert to seconds
      const positionDiff = Math.abs(currentPos - currentSyncPosition);
      
      if (positionDiff > 2 && now - lastSyncTime > 5000) { // Don't sync too frequently
        console.log('Position sync needed:', { currentPos, currentSyncPosition, diff: positionDiff });
        seekToPosition(currentSyncPosition * 1000); // Convert to milliseconds
        lastSyncCheck.current = now;
      }
    }
  }, [isHost, syncedPosition, syncedIsPlaying, lastUpdate, seekToPosition, lastSyncTime]); // Removed position from deps

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