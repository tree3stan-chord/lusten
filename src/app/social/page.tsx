'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useSocialUpdates } from '../../hooks/useSocialUpdates';
import SuggestedFriends from '../components/SuggestedFriends';
// import { useRouter } from 'next/navigation';

interface User {
  spotify_id: string;
  name: string;
  avatar_url: string | null;
  profile_room_id: string | null;
  created_at: string;
}



export default function SocialPage() {
  const { data: session } = useSession();
  // const router = useRouter();
  
  // Use real-time social updates
  const {
    friends,
    activeUsers,
    pendingRequests,
    loading,
    refreshData
  } = useSocialUpdates();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId })
      });

      if (response.ok) {
        // Refresh friends data
        refreshData();
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    // We'll need to create a decline endpoint
    try {
      const response = await fetch('/api/friends/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId })
      });

      if (response.ok) {
        refreshData();
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // We'll need to create a search endpoint
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: userId })
      });

      if (response.ok) {
        alert('Friend request sent!');
        // Remove from search results
        setSearchResults(prev => prev.filter(user => user.spotify_id !== userId));
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Please Sign In</h1>
          <p className="text-gray-600 dark:text-gray-300">You need to be signed in to view your friends.</p>
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
            <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
              LUSTEN
            </Link>
            <div className="flex items-center space-x-6">
              <Link
                href="/discover"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Discover
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Social</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Connect with friends and discover what everyone&apos;s listening to
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Friends & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Users Feed */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                🎵 Who&apos;s Active ({activeUsers.length})
              </h2>
              
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Loading activity...</p>
                </div>
              ) : activeUsers.length === 0 ? (
                <div className="text-center py-6">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">No one&apos;s listening right now</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Be the first to start a session!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeUsers.slice(0, 5).map((user) => {
                    const status = user.status;
                    const isInRoom = status?.current_room_id;
                    const isPlayingSpotify = status?.spotify_is_playing && status?.spotify_track_name;
                    
                    let statusText = '🟢 Online';
                    let statusColor = 'text-green-600 dark:text-green-400';
                    let bgGradient = 'from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20';
                    
                    if (isInRoom) {
                      statusText = '🎵 In a room';
                      statusColor = 'text-purple-600 dark:text-purple-400';
                      bgGradient = 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20';
                    } else if (isPlayingSpotify) {
                      statusText = `🎧 Playing: ${status.spotify_track_name}`;
                      if (status.spotify_artist_name) {
                        statusText += ` by ${status.spotify_artist_name}`;
                      }
                      statusColor = 'text-blue-600 dark:text-blue-400';
                      bgGradient = 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20';
                    }
                    
                    return (
                      <div key={user.spotify_id} className={`flex items-center justify-between p-3 bg-gradient-to-r ${bgGradient} rounded-lg`}>
                        <Link href={`/profile/${user.spotify_id}`} className="flex items-center space-x-3 flex-1">
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                              {user.avatar_url ? (
                                <Image src={user.avatar_url} alt={user.name} width={40} height={40} className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                              )}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-gray-800 rounded-full ${
                              status?.visibility === 'dnd' ? 'bg-red-400' : 
                              status?.visibility === 'idle' ? 'bg-yellow-400' : 
                              'bg-green-400'
                            }`}></div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 dark:text-white text-sm">{user.name}</h3>
                            <p className={`text-xs ${statusColor} truncate max-w-48`} title={statusText}>
                              {statusText}
                            </p>
                          </div>
                        </Link>
                        {isInRoom ? (
                          <button 
                            onClick={() => window.location.href = `/room/${status.current_room_id}`}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                          >
                            Join Room
                          </button>
                        ) : (
                          <button 
                            onClick={() => window.location.href = `/profile/${user.spotify_id}`}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                          >
                            Visit
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {activeUsers.length > 5 && (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                      +{activeUsers.length - 5} more active users
                    </p>
                  )}
                </div>
              )}
            </div>
            {/* Pending Friend Requests */}
            {pendingRequests.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Friend Requests ({pendingRequests.length})
                </h2>
                <div className="space-y-4">
                  {pendingRequests.map(({ friendship, user }) => (
                    <div key={friendship.id} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{user.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Wants to be friends
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAcceptRequest(friendship.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(friendship.id)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                My Friends ({friends.length})
              </h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">Loading friends...</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No friends yet</h3>
                  <p className="text-gray-600 dark:text-gray-300">Start by searching for people to connect with!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {friends.map((friend) => (
                    <Link
                      key={friend.spotify_id}
                      href={`/profile/${friend.spotify_id}`}
                      className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                        {friend.avatar_url ? (
                          <Image
                            src={friend.avatar_url}
                            alt={friend.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{friend.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {friend.profile_room_id ? 'Has profile room' : 'No profile room'}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Find Friends & Suggestions */}
          <div className="space-y-6">
            {/* Friend Suggestions */}
            <SuggestedFriends />

            {/* Find Friends Search */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Find Friends
              </h2>
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search by name or Spotify ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {searchLoading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div key={user.spotify_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-600 dark:to-gray-500 rounded-full flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.name}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendFriendRequest(user.spotify_id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && !searchLoading && searchResults.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  No users found
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}