'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProfileAvatar from '../../components/ProfileAvatar';
import Avatar from '../../components/Avatar';
import SocialStatsCard from '../../components/SocialStatsCard';
import { getUserTopPicks, getUserSpotifyStats } from '../../../lib/sqlite-db';

interface User {
  spotify_id: string;
  name: string;
  avatar_url: string | null;
  profile_room_id: string | null;
  created_at: string;
}

interface ProfileRoom {
  id: string;
  name: string;
  type: 'profile';
  listeners: number;
  isActive: boolean;
}

interface ProfilePageProps {
  params: Promise<{ spotifyId: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileRoom, setProfileRoom] = useState<ProfileRoom | null>(null);
  const [spotifyId, setSpotifyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [topPicks, setTopPicks] = useState<any[]>([]);
  const [spotifyStats, setSpotifyStats] = useState<any>(null);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Fetch profile room if exists
        if (userData.profile_room_id) {
          fetchProfileRoom(userData.profile_room_id);
        }
      } else {
        console.error('User not found');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    params.then(({ spotifyId }) => {
      if (!mounted) return;
      setSpotifyId(spotifyId);
      fetchUserProfile(spotifyId);
    });

    return () => {
      mounted = false;
    };
  }, [params, fetchUserProfile]);

  const fetchProfileRoom = async (roomId: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (response.ok) {
        const roomData = await response.json();
        setProfileRoom(roomData);
      }
    } catch (error) {
      console.error('Error fetching profile room:', error);
    }
  };

  const handleJoinRoom = () => {
    if (profileRoom) {
      router.push(`/room/${profileRoom.id}`);
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: spotifyId })
      });

      if (response.ok) {
        setFriendRequestSent(true);
      } else {
        console.error('Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const fetchSocialStats = useCallback(async (userId: string) => {
    try {
      // For now, we'll set empty arrays - in Phase 2 we'll add API endpoints
      setTopPicks([]);
      setSpotifyStats(null);
    } catch (error) {
      console.error('Error fetching social stats:', error);
    }
  }, []);

  const fetchFriends = useCallback(async (userId: string) => {
    try {
      // Only fetch friends if this is the current user's profile
      // (for privacy - we could also fetch mutual friends later)
      if ((session?.user as { id?: string })?.id === userId) {
        const response = await fetch('/api/friends/list');
        if (response.ok) {
          const friendsData = await response.json();
          setFriends(friendsData);
        }
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setFriendsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (user && session) {
      fetchFriends(user.spotify_id);
      fetchSocialStats(user.spotify_id);
    }
  }, [user, session, fetchFriends, fetchSocialStats]);

  const isOwnProfile = (session?.user as { id: string } | undefined)?.id === spotifyId;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">User Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">This profile doesn&apos;t exist.</p>
          <Link 
            href="/"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </Link>
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
          </div>
        </div>
      </nav>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Header with Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {user.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Listening since {new Date(user.created_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>

            {/* Friend Actions */}
            {!isOwnProfile && (
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleSendFriendRequest}
                  disabled={friendRequestSent}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    friendRequestSent 
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {friendRequestSent ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    )}
                  </svg>
                  <span>{friendRequestSent ? 'Request Sent' : 'Add Friend'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Social Stats Card */}
        <div className="mb-8">
          <SocialStatsCard
            user={user}
            isOwnProfile={isOwnProfile}
            topPicks={topPicks}
            spotifyStats={spotifyStats}
          />
        </div>

        {/* Split Layout: Profile Room & Friends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Profile Room */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {isOwnProfile ? 'Your Profile Room' : `${user.name}'s Room`}
            </h2>

            {profileRoom ? (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {profileRoom.name}
                    </h3>
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {profileRoom.listeners} listening
                      </span>
                      <span className={`flex items-center text-sm ${
                        profileRoom.isActive 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-1 ${
                          profileRoom.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        {profileRoom.isActive ? 'Active' : 'Quiet'}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleJoinRoom}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {profileRoom.isActive ? 'Join' : 'Visit'}
                  </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {profileRoom.isActive 
                    ? 'Music is playing! Join to listen along.' 
                    : 'Room is open for chat. Music will start when the host joins.'}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isOwnProfile ? 'No Profile Room Yet' : 'No Profile Room'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {isOwnProfile 
                    ? 'Create a profile room to have a persistent space for your friends to find you.'
                    : `${user.name} hasn't created a profile room yet.`
                  }
                </p>
                {isOwnProfile && (
                  <Link 
                    href="/"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
                  >
                    Create Profile Room
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Friends List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isOwnProfile ? 'Your Friends' : `Friends`}
              </h2>
              {isOwnProfile && (
                <Link
                  href="/social"
                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
                >
                  Manage Friends
                </Link>
              )}
            </div>

            {friendsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : isOwnProfile && friends.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No friends yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Connect with people to start building your music community!</p>
                <Link
                  href="/social"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block"
                >
                  Find Friends
                </Link>
              </div>
            ) : isOwnProfile && friends.length > 0 ? (
              <div className="space-y-3">
                {friends.slice(0, 6).map((friend) => (
                  <Link
                    key={friend.spotify_id}
                    href={`/profile/${friend.spotify_id}`}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                      {friend.avatar_url ? (
                        <Image
                          src={friend.avatar_url}
                          alt={friend.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {friend.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {friend.profile_room_id ? 'Has profile room' : 'No profile room'}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
                
                {friends.length > 6 && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <Link
                      href="/social"
                      className="block text-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
                    >
                      View all {friends.length} friends
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400">Friends list is private</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}