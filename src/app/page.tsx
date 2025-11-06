'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import CreateRoomModal from './components/CreateRoomModal';
import StatusSelector from './components/StatusSelector';
import { useHeartbeat } from '../hooks/useHeartbeat';

interface Room {
  id: string;
  name: string;
  type: 'public' | 'profile';
  hostId: string;
  currentTrack?: string;
  currentArtist?: string;
  listeners: number;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const router = useRouter();

  // Keep user online and track activity
  useHeartbeat({
    onError: (error) => console.error('Heartbeat error:', error)
  });

  useEffect(() => {
    // Initialize socket connection
    const socketConnection = io();
    setSocket(socketConnection);

    // Get public rooms on connect
    socketConnection.on('connect', () => {
      socketConnection.emit('get-public-rooms');
    });

    // Listen for public rooms list
    socketConnection.on('public-rooms-list', (rooms: Room[]) => {
      setPublicRooms(rooms);
    });

    // Listen for new public rooms
    socketConnection.on('public-room-created', (room: Room) => {
      setPublicRooms(prev => [...prev, room]);
    });

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const handleCreateRoom = () => {
    try {
      if (!session) {
        // Redirect to Spotify OAuth
        signIn('spotify');
      } else {
        setIsCreateModalOpen(true);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    }
  };

  const handleCreateRoomSubmit = (roomName: string, roomType: 'private' | 'public' | 'profile', genres?: string[]) => {
    try {
      if (!socket || !session?.user?.email) {
        alert('Unable to create room. Please try again.');
        return;
      }

      const newRoomId = Math.random().toString(36).substr(2, 9);
      const userId = session.user.email;

      // Create room via socket
      socket.emit('create-room', {
        roomId: newRoomId,
        roomName,
        userId,
        roomType,
        genres
      });

      // Listen for room created confirmation
      socket.once('room-created', () => {
        setIsCreateModalOpen(false);
        router.push(`/room/${newRoomId}`);
      });

      socket.once('error', (error: string) => {
        alert(`Failed to create room: ${error}`);
      });

    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    }
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LUSTEN</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Debug info - remove in production */}
              {(
                <div className="text-xs text-gray-500 mr-4 max-w-xs">
                  Status: {status} | Session: {session ? 'Yes' : 'No'}
                  {session && (
                    <div>User: {session.user?.email?.substring(0, 20)}...</div>
                  )}
                </div>
              )}
              {status === 'loading' ? (
                <div className="text-gray-600 dark:text-gray-300">Loading...</div>
              ) : session ? (
                <div className="flex items-center space-x-3">
                  <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-xs px-2 py-1 rounded-full">
                    Spotify Connected
                  </span>
                  
                  {/* User Dropdown */}
                  <div className="relative group">
                    <div className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      Hi, {session.user?.name || session.user?.email}!
                      <svg className="inline w-4 h-4 ml-1 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <a
                        href={`/profile/${(session.user as { id?: string })?.id}`}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        My Profile
                      </a>
                      <a
                        href="/discover"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Discover
                      </a>
                      <a
                        href="/social"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        Friends
                      </a>
                      <hr className="my-1 border-gray-200 dark:border-gray-600" />
                      <div className="px-4 py-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Status</div>
                        <StatusSelector showLabel={true} className="w-full" />
                      </div>
                      <hr className="my-1 border-gray-200 dark:border-gray-600" />
                      <button
                        onClick={() => signOut()}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-4">
                  <button 
                    onClick={() => signIn('spotify', { callbackUrl: '/', redirect: true })}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Connect Spotify
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Listen Together
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Create shared listening experiences with friends. Host a room or join others to chat and enjoy music together in real-time.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCreateRoom}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-full text-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Room
            </button>
            <a
              href="/discover"
              className="bg-white dark:bg-gray-800 border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 px-8 py-4 rounded-full text-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Discover by Genre
            </a>
          </div>
        </div>

        {/* Public Rooms */}
        {publicRooms.length > 0 && (
          <div className="mb-12">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
              Discover Rooms
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
              {publicRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {room.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {room.type === 'profile' ? '👤 Profile' : '🌍 Public'}
                      </span>
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-sm px-2 py-1 rounded-full">
                        {room.listeners} listening
                      </span>
                    </div>
                  </div>
                  
                  {room.currentTrack && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Now playing:</p>
                      <p className="font-medium text-gray-900 dark:text-white">{room.currentTrack}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{room.currentArtist}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Join Room
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRoom={handleCreateRoomSubmit}
      />
    </div>
  );
}
