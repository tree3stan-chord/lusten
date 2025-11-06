'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Room {
  id: string;
  name: string;
  type: 'public' | 'profile';
  owner_id: string | null;
  genres: string[];
  listeners?: number;
  currentTrack?: string;
  currentArtist?: string;
  last_active: string;
}

export default function GenreRoomsPage({ params }: { params: Promise<{ genre: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const genre = decodeURIComponent(resolvedParams.genre);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Capitalize genre for display
  const displayGenre = genre
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  useEffect(() => {
    fetchRooms();
  }, [genre]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/rooms/by-genre?genre=${encodeURIComponent(genre)}`);
      const data = await response.json();

      if (data.success) {
        setRooms(data.rooms);
      } else {
        setError('Failed to load rooms');
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('An error occurred while loading rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
              LUSTEN
            </Link>
            <div className="flex items-center space-x-6">
              <Link
                href="/discover"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                ← Back to Discover
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center mb-3">
            <Link
              href="/discover"
              className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
            >
              All Genres
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">{displayGenre}</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {displayGenre} Rooms
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {loading
              ? 'Loading rooms...'
              : `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'} for ${displayGenre.toLowerCase()} music`
            }
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Finding rooms...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
              <button
                onClick={fetchRooms}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Rooms Grid */}
        {!loading && !error && (
          <>
            {rooms.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Rooms for {displayGenre} Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Be the first to create a {displayGenre.toLowerCase()} room!
                </p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Create a Room
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Room Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {room.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {room.type === 'profile' ? '👤 Profile' : '🌍 Public'}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
                            {room.listeners || 0} listening
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Genre Tags */}
                    {room.genres && room.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {room.genres.map((g, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Currently Playing */}
                    {room.currentTrack && (
                      <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Now playing:</p>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{room.currentTrack}</p>
                        {room.currentArtist && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{room.currentArtist}</p>
                        )}
                      </div>
                    )}

                    {/* Join Button */}
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                    >
                      Join Room
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
