'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
  blocked_user: {
    spotify_id: string;
    name: string;
    avatar_url: string | null;
    custom_avatar_url: string | null;
  };
}

export default function BlockedUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockinUserId, setUnblockingUserId] = useState<string | null>(null);

  // Fetch blocked users
  const fetchBlockedUsers = async () => {
    if (!session?.user?.email) return;

    setLoading(true);
    try {
      const response = await fetch('/api/users/blocked');
      if (response.ok) {
        const data = await response.json();
        setBlockedUsers(data.blockedUsers || []);
      }
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchBlockedUsers();
    }
  }, [session]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Unblock user
  const handleUnblock = async (userId: string) => {
    if (!confirm('Are you sure you want to unblock this user?')) {
      return;
    }

    setUnblockingUserId(userId);
    try {
      const response = await fetch(`/api/users/${userId}/unblock`, {
        method: 'POST',
      });

      if (response.ok) {
        setBlockedUsers(prev => prev.filter(b => b.blocked_id !== userId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Failed to unblock user:', error);
      alert('Failed to unblock user');
    } finally {
      setUnblockingUserId(null);
    }
  };

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Blocked Users</h2>
            </div>
            <Link
              href="/"
              className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">About Blocking</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Blocked users cannot send you friend requests, see you in search results, or interact with you in rooms. They won't be notified that you've blocked them.
              </p>
            </div>
          </div>
        </div>

        {/* Blocked Users List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              <p className="text-lg font-medium mb-2">No blocked users</p>
              <p className="text-sm">You haven't blocked anyone yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {blockedUsers.map((block) => (
                <div
                  key={block.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <img
                        src={block.blocked_user.custom_avatar_url || block.blocked_user.avatar_url || '/default-avatar.png'}
                        alt={block.blocked_user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />

                      {/* Details */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {block.blocked_user.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Blocked {new Date(block.created_at).toLocaleDateString()}
                        </p>
                        {block.reason && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">
                            Reason: {block.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Unblock Button */}
                    <button
                      onClick={() => handleUnblock(block.blocked_id)}
                      disabled={unblockinUserId === block.blocked_id}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      {unblockinUserId === block.blocked_id ? 'Unblocking...' : 'Unblock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        {blockedUsers.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {blockedUsers.length} blocked {blockedUsers.length === 1 ? 'user' : 'users'}
          </div>
        )}
      </div>
    </div>
  );
}
