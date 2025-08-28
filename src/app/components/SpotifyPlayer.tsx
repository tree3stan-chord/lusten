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
  currentTrack?: Track;
  syncedIsPlaying?: boolean;
  syncedPosition?: number;
  lastUpdate?: number;
}

export default function SpotifyPlayer({ 
  isHost, 
  onTrackChange, 
  onPlayStateChange,
  currentTrack: syncedTrack,
  syncedIsPlaying,
  syncedPosition,
  lastUpdate
}: SpotifyPlayerProps) {
  const { data: session } = useSession();
  const {
    isReady,
    currentTrack,
    isPlaying,
    play,
    pause,
    skipToNext,
    skipToPrevious,
  } = useSpotifyPlayer();

  // Use synced data if available (for non-hosts), otherwise use local player state
  const displayTrack = !isHost && syncedTrack ? syncedTrack : currentTrack;
  const displayIsPlaying = !isHost && syncedIsPlaying !== undefined ? syncedIsPlaying : isPlaying;

  // Notify parent components of state changes (only for hosts)
  React.useEffect(() => {
    if (isHost && onTrackChange && currentTrack) {
      onTrackChange(currentTrack);
    }
  }, [isHost, currentTrack, onTrackChange]);

  React.useEffect(() => {
    if (isHost && onPlayStateChange !== undefined) {
      onPlayStateChange(isPlaying);
    }
  }, [isHost, isPlaying, onPlayStateChange]);

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