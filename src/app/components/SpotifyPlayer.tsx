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
    activateDevice,
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

  // Activate device and play synced track for listeners
  React.useEffect(() => {
    if (!isHost && syncedTrack && activateDevice && play && isReady) {
      console.log('Listener: Switching to synced track:', syncedTrack.name);
      
      const syncToTrack = async () => {
        try {
          // First activate the device
          await activateDevice();
          
          // Then play the synced track
          const trackUri = syncedTrack.uri || `spotify:track:${syncedTrack.id}`;
          await play(trackUri);
          
          // Wait a moment for the track to start loading before seeking
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Seek to the correct position if available
          if (syncedPosition !== undefined && lastUpdate && seekToPosition) {
            const now = Date.now();
            const timeSinceUpdate = (now - lastUpdate) / 1000;
            // Add extra buffer time to account for track switching delay
            const bufferTime = 1.0; // 1 second buffer
            const targetPosition = syncedPosition + (syncedIsPlaying ? timeSinceUpdate + bufferTime : 0);
            
            console.log('Listener: Seeking to synced position:', {
              originalPosition: syncedPosition,
              timeSinceUpdate: Math.floor(timeSinceUpdate * 10) / 10,
              bufferTime,
              targetPosition: Math.floor(targetPosition * 10) / 10,
              targetSeconds: Math.floor(targetPosition)
            });
            
            if (targetPosition > 0) {
              await seekToPosition(targetPosition * 1000); // Convert to milliseconds
              console.log('Listener: Seek completed');
            }
          }
          
          // Handle play/pause state
          if (syncedIsPlaying) {
            // Track should be playing - it already is from play() call
            console.log('Listener: Track is playing (synced)');
          } else {
            // Track should be paused
            console.log('Listener: Pausing to match host state');
            await pause();
          }
          
          console.log('Listener: Successfully synced to track and position');
        } catch (error) {
          console.error('Listener: Failed to switch to synced track:', error);
        }
      };
      
      syncToTrack();
    }
  }, [isHost, syncedTrack, activateDevice, play, pause, seekToPosition, syncedPosition, syncedIsPlaying, lastUpdate, isReady]);

  // Handle real-time playback state changes for listeners (play/pause during playback)
  const lastPlaybackStateRef = React.useRef<boolean | undefined>(undefined);
  
  React.useEffect(() => {
    if (!isHost && syncedIsPlaying !== undefined && syncedIsPlaying !== lastPlaybackStateRef.current && displayTrack) {
      lastPlaybackStateRef.current = syncedIsPlaying;
      
      const handlePlaybackChange = async () => {
        try {
          if (syncedIsPlaying) {
            console.log('Listener: Host resumed playback - resuming');
            await play(); // Resume playback
          } else {
            console.log('Listener: Host paused playback - pausing');
            await pause(); // Pause playback
          }
        } catch (error) {
          console.error('Listener: Failed to sync playback state:', error);
        }
      };
      
      handlePlaybackChange();
    }
  }, [isHost, syncedIsPlaying, play, pause, displayTrack]);

  // Ongoing position sync for listeners (more aggressive initially, then backs off)
  const lastSyncCheck = React.useRef<number>(0);
  const syncCount = React.useRef<number>(0);
  
  React.useEffect(() => {
    if (!isHost && syncedPosition !== undefined && lastUpdate && seekToPosition && displayTrack) {
      const now = Date.now();
      
      // More frequent syncing for the first few attempts, then back off
      const syncInterval = syncCount.current < 3 ? 2000 : 5000; // 2s initially, then 5s
      
      if (now - lastSyncCheck.current < syncInterval) return;
      
      const timeSinceUpdate = (now - lastUpdate) / 1000;
      const currentSyncPosition = syncedPosition + (syncedIsPlaying ? timeSinceUpdate : 0);
      
      // Be more aggressive about syncing initially
      const syncThreshold = syncCount.current < 3 ? 1.5 : 3.0; // 1.5s initially, then 3s
      const currentPos = position / 1000;
      const positionDiff = Math.abs(currentPos - currentSyncPosition);
      
      if (positionDiff > syncThreshold && now - lastSyncTime > 3000) {
        console.log('Ongoing position sync:', { 
          currentPos: Math.floor(currentPos), 
          targetPos: Math.floor(currentSyncPosition), 
          diff: Math.floor(positionDiff * 10) / 10,
          syncAttempt: syncCount.current + 1
        });
        
        seekToPosition(currentSyncPosition * 1000);
        lastSyncCheck.current = now;
        syncCount.current += 1;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, syncedPosition, syncedIsPlaying, lastUpdate, seekToPosition, lastSyncTime, displayTrack]); // Removed position from deps

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