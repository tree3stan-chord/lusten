'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  const [room, setRoom] = useState<RoomData | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ user: string; text: string; timestamp: Date }>>([]);

  useEffect(() => {
    params.then(({ id }) => {
      // Simulate loading room data
      setRoom({
        id,
        name: `Room ${id}`,
        hostName: 'Host User',
        currentTrack: {
          name: 'Sample Track',
          artist: 'Sample Artist'
        },
        listeners: ['User1', 'User2', 'You']
      });
    });
  }, [params]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      setMessages(prev => [...prev, {
        user: 'You',
        text: message.trim(),
        timestamp: new Date()
      }]);
      setMessage('');
    }
  };

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
            <div className="flex items-center space-x-2">
              <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-sm px-3 py-1 rounded-full">
                {room.listeners.length} listening
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Music Player Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Now Playing</h3>
              
              {room.currentTrack ? (
                <div className="text-center">
                  <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 w-48 h-48 rounded-xl mx-auto mb-6 flex items-center justify-center">
                    <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>
                  
                  <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {room.currentTrack.name}
                  </h4>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                    {room.currentTrack.artist}
                  </p>
                  
                  {/* Spotify Player Placeholder */}
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-center space-x-4">
                      <button className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                        </svg>
                      </button>
                      <button className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Only {room.hostName} can control playback
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <p>No track currently playing</p>
                  <p className="text-sm mt-2">Waiting for {room.hostName} to start music...</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-96 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chat</h3>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No messages yet. Start the conversation!</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">{msg.user}:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{msg.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
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