'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SpotifyPlayer from '../../components/SpotifyPlayer';
import { useSocket } from '../../hooks/useSocket';

interface RoomData {
  id: string;
  name: string;
  hostName: string;
  currentTrack?: {
    name: string;
    artist: string;
  };
  listeners: string[];
}

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const { data: session } = useSession();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [message, setMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);

  // Initialize socket connection
  const userId = session?.user?.email || 'anonymous';
  const userName = session?.user?.name || 'Anonymous';
  const { roomState, chatMessages, isConnected, syncEvents, emitTrackChange, emitPlaybackState, emitSeekPosition, sendChatMessage, clearSyncEvents } = useSocket(roomId, userId, isHost);

  // Update host status based on room state
  React.useEffect(() => {
    if (roomState && userId) {
      const shouldBeHost = roomState.hostId === userId;
      if (shouldBeHost !== isHost) {
        console.log(`Updating host status: ${userId} should be host: ${shouldBeHost}`);
        setIsHost(shouldBeHost);
      }
    }
  }, [roomState, userId, isHost]);

  useEffect(() => {
    let mounted = true;
    
    params.then(({ id }) => {
      if (!mounted) return;
      
      setRoomId(id);
      
      // Determine if user is host - check if they created this room
      // For now, we'll check if the user ID matches the room's host from the room state
      // The server will ultimately determine this
      const userIsHost = false; // Default to listener, server will correct this
      setIsHost(userIsHost);
      
      // Initialize room data
      setRoom({
        id,
        name: `Room ${id}`,
        hostName: userIsHost ? (session?.user?.name || 'Anonymous') : 'Unknown Host',
        listeners: []
      });
    });

    return () => {
      mounted = false;
    };
  }, [params, session?.user]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendChatMessage(message.trim(), userName);
      setMessage('');
    }
  }, [message, sendChatMessage, userName]);

  const handleTrackChange = useCallback((track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
    duration_ms: number;
  }) => {
    emitTrackChange(track);
  }, [emitTrackChange]);

  const handlePlayStateChange = useCallback((isPlaying: boolean, position?: number) => {
    emitPlaybackState(isPlaying, position || 0);
  }, [emitPlaybackState]);

  const handleSeek = useCallback((position: number) => {
    emitSeekPosition(position);
  }, [emitSeekPosition]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleShareRoom = useCallback(async () => {
    const roomUrl = window.location.href;
    const shareData = {
      title: `Join my music room: ${room?.name}`,
      text: `Listen to music together in real-time!`,
      url: roomUrl,
    };

    try {
      // Try native share API first (works on mobile and some desktop browsers)
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      
      // Fallback to clipboard
      await navigator.clipboard.writeText(roomUrl);
      
      // Show success feedback (you could add a toast notification here)
      alert('Room link copied to clipboard!');
    } catch (error) {
      console.error('Error sharing room:', error);
      // Final fallback - select text for manual copy
      const textArea = document.createElement('textarea');
      textArea.value = roomUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Room link copied to clipboard!');
    }
  }, [room?.name]);

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
                LUSTEN
              </Link>
              <span className="text-gray-400">•</span>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{room.name}</h2>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleShareRoom()}
                className="flex items-center space-x-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>Share</span>
              </button>
              <span className={`text-sm px-3 py-1 rounded-full ${
                isConnected 
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' 
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
              }`}>
                {isConnected ? `${roomState?.users.length || 0} listening` : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Music Player Section */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Now Playing</h3>
            <SpotifyPlayer 
              isHost={isHost}
              onTrackChange={handleTrackChange}
              onPlayStateChange={handlePlayStateChange}
              onSeek={handleSeek}
              currentTrack={roomState?.currentTrack}
              syncedIsPlaying={roomState?.isPlaying}
              syncedPosition={roomState?.position}
              lastUpdate={roomState?.lastUpdate}
              syncEvents={syncEvents}
              onSyncEventHandled={clearSyncEvents}
            />
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-96 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chat</h3>
              </div>
              
              <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No messages yet. Start the conversation!</p>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          {msg.userId === userId ? 'You' : msg.userName}:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white">{msg.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}