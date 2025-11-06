'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomName: string, roomType: 'private' | 'public' | 'profile', genres?: string[]) => void;
}

// Common music genres for suggestions
const COMMON_GENRES = [
  'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Indie', 'Jazz', 'Classical',
  'R&B', 'Country', 'Metal', 'Reggae', 'Blues', 'Folk', 'Latin', 'Dance'
];

export default function CreateRoomModal({ isOpen, onClose, onCreateRoom }: CreateRoomModalProps) {
  const { data: session } = useSession();
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<'private' | 'public' | 'profile'>('private');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [userTopGenres, setUserTopGenres] = useState<string[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [autoDetectedInfo, setAutoDetectedInfo] = useState<{
    track?: string;
    confidence: string;
    source: string;
  } | null>(null);

  // Auto-detect genres from current playback when modal opens
  useEffect(() => {
    if (isOpen && session?.user?.id && roomType === 'public') {
      setAutoDetecting(true);
      setAutoDetectedInfo(null);

      // Try to detect genres from current Spotify playback
      fetch('/api/spotify/detect-genres')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.genres.length > 0) {
            // Auto-detected genres from playback!
            setSelectedGenres(data.genres.slice(0, 3));
            setAutoDetectedInfo({
              track: data.track ? `${data.track.name} by ${data.track.artists}` : undefined,
              confidence: data.confidence,
              source: data.source
            });
          } else {
            // Fallback: Use user's top genres from stats
            fetchUserTopGenres();
          }
        })
        .catch(err => {
          console.error('Error auto-detecting genres:', err);
          // Fallback: Use user's top genres
          fetchUserTopGenres();
        })
        .finally(() => setAutoDetecting(false));
    } else if (isOpen && session?.user?.id) {
      // For private/profile rooms, just fetch top genres
      fetchUserTopGenres();
    }
  }, [isOpen, session, roomType]);

  // Fetch user's top genres as fallback
  const fetchUserTopGenres = () => {
    if (!session?.user?.id) return;

    fetch(`/api/users/${session.user.id}/spotify-stats`)
      .then(res => res.json())
      .then(data => {
        if (data.stats?.top_genres) {
          const genres = data.stats.top_genres.map((g: { name: string }) => g.name);
          setUserTopGenres(genres);
          // Pre-select if no genres selected yet
          if (selectedGenres.length === 0 && roomType !== 'private') {
            setSelectedGenres(genres.slice(0, 3));
            setAutoDetectedInfo({
              confidence: 'medium',
              source: 'top_genres'
            });
          }
        }
      })
      .catch(err => console.error('Error fetching user genres:', err));
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRoomName('');
      setRoomType('private');
      setSelectedGenres([]);
      setShowAllGenres(false);
      setAutoDetecting(false);
      setAutoDetectedInfo(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      // Only include genres for public/profile rooms
      const genres = roomType === 'private' ? undefined : selectedGenres;
      onCreateRoom(roomName.trim(), roomType, genres);
      setRoomName('');
      setRoomType('private');
      setSelectedGenres([]);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : prev.length < 5
          ? [...prev, genre]
          : prev
    );
  };

  const showGenreSelector = roomType === 'public';
  const genresToShow = showAllGenres ? COMMON_GENRES : [...userTopGenres, ...COMMON_GENRES.filter(g => !userTopGenres.includes(g))].slice(0, 8);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Room</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Room Name
            </label>
            <input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Room Type
            </label>
            <div className="space-y-3">
              {/* Private Room */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  value="private"
                  checked={roomType === 'private'}
                  onChange={(e) => setRoomType(e.target.value as 'private')}
                  className="mt-1 text-indigo-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">🔒 Private</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Only people with the link can join</div>
                </div>
              </label>
              
              {/* Public Room */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  value="public"
                  checked={roomType === 'public'}
                  onChange={(e) => {
                    setRoomType(e.target.value as 'public');
                    // Trigger auto-detection when switching to public
                    if (e.target.value === 'public' && session?.user?.id) {
                      setAutoDetecting(true);
                      fetch('/api/spotify/detect-genres')
                        .then(res => res.json())
                        .then(data => {
                          if (data.success && data.genres.length > 0) {
                            setSelectedGenres(data.genres.slice(0, 3));
                            setAutoDetectedInfo({
                              track: data.track ? `${data.track.name} by ${data.track.artists}` : undefined,
                              confidence: data.confidence,
                              source: data.source
                            });
                          }
                        })
                        .catch(err => console.error('Error auto-detecting genres:', err))
                        .finally(() => setAutoDetecting(false));
                    }
                  }}
                  className="mt-1 text-indigo-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">🌍 Public</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Discoverable on homepage (temporary)</div>
                </div>
              </label>
              
              {/* Profile Room */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  value="profile"
                  checked={roomType === 'profile'}
                  onChange={(e) => setRoomType(e.target.value as 'profile')}
                  className="mt-1 text-indigo-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">👤 My Profile Room</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Persistent room on your profile (replaces existing)</div>
                </div>
              </label>
            </div>
          </div>

          {/* Genre Selector - Only for Public Rooms */}
          {showGenreSelector && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room Genres (Select up to 5)
              </label>

              {/* Auto-Detection Indicator */}
              {autoDetecting && (
                <div className="mb-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span className="text-sm text-indigo-700 dark:text-indigo-300">
                    🎵 Detecting genres from your Spotify playback...
                  </span>
                </div>
              )}

              {autoDetectedInfo && !autoDetecting && (
                <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        {autoDetectedInfo.source === 'current_playback' && autoDetectedInfo.track
                          ? '✨ Genres detected from your current track!'
                          : autoDetectedInfo.source === 'current_playback'
                            ? '✨ Genres detected from your recent listening!'
                            : '🎵 Genres from your music taste'}
                      </p>
                      {autoDetectedInfo.track && (
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1 truncate">
                          Now playing: {autoDetectedInfo.track}
                        </p>
                      )}
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        You can adjust the selection below
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Help others discover your room by tagging relevant genres
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {genresToShow.map((genre) => {
                  const isSelected = selectedGenres.includes(genre);
                  const isUserGenre = userTopGenres.includes(genre);

                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      disabled={!isSelected && selectedGenres.length >= 5}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : isUserGenre
                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {genre}
                      {isUserGenre && !isSelected && ' ⭐'}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowAllGenres(!showAllGenres)}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {showAllGenres ? 'Show less' : 'Show more genres'}
              </button>

              {selectedGenres.length > 0 && (
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                  Selected: {selectedGenres.join(', ')}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!roomName.trim()}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}