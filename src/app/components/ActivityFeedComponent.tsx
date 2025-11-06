'use client';

import { useState, useEffect } from 'react';
import type { ParsedActivity } from '../../lib/sqlite-db';

interface ActivityFeedComponentProps {
  userId: string;
  feedType?: 'user' | 'friends'; // Show user's own activities or friends' activities
  limit?: number;
}

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  created_room: { icon: '🏠', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  joined_room: { icon: '🚪', color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
  became_friends: { icon: '👥', color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
  unlocked_achievement: { icon: '🏆', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' },
  updated_top_picks: { icon: '⭐', color: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' },
  updated_bio: { icon: '✍️', color: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' },
  updated_avatar: { icon: '📸', color: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400' },
  listening_milestone: { icon: '🎵', color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' }
};

function formatActivityMessage(activity: ParsedActivity): string {
  switch (activity.activity_type) {
    case 'created_room':
      return `Created a room "${activity.activity_data?.room_name || 'New Room'}"`;
    case 'joined_room':
      return `Joined "${activity.activity_data?.room_name || 'a room'}"`;
    case 'became_friends':
      return `Became friends with ${activity.activity_data?.friend_name || 'someone'}`;
    case 'unlocked_achievement':
      return `Unlocked achievement: ${activity.activity_data?.achievement_title || 'New Achievement'}`;
    case 'updated_top_picks':
      return `Updated their top picks`;
    case 'updated_bio':
      return `Updated their bio`;
    case 'updated_avatar':
      return `Changed their profile picture`;
    case 'listening_milestone':
      return `Reached ${activity.activity_data?.milestone_value || '0'} hours of listening!`;
    default:
      return `Activity: ${activity.activity_type}`;
  }
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

export default function ActivityFeedComponent({
  userId,
  feedType = 'user',
  limit = 20
}: ActivityFeedComponentProps) {
  const [activities, setActivities] = useState<ParsedActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [userId, feedType, limit]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/activity/${userId}?type=${feedType}&limit=${limit}`
      );
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        {feedType === 'friends' ? 'Friends Activity' : 'Recent Activity'}
      </h3>

      {/* Activity Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activities.map((activity, index) => {
            const { icon, color } = ACTIVITY_ICONS[activity.activity_type] || {
              icon: '📌',
              color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            };

            return (
              <div key={activity.id} className="flex gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                  <span className="text-lg">{icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatActivityMessage(activity)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {getRelativeTime(activity.created_at)}
                  </p>

                  {/* Activity Data Details (if available) */}
                  {activity.activity_data?.room_id && (
                    <button
                      onClick={() => {
                        // Navigate to room - could be implemented
                        console.log('Navigate to room:', activity.activity_data?.room_id);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                    >
                      View Room →
                    </button>
                  )}

                  {activity.activity_data?.friend_id && (
                    <button
                      onClick={() => {
                        // Navigate to profile - could be implemented
                        console.log('Navigate to profile:', activity.activity_data?.friend_id);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                    >
                      View Profile →
                    </button>
                  )}
                </div>

                {/* Connector Line (except for last item) */}
                {index < activities.length - 1 && (
                  <div className="absolute left-11 mt-10 w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load More (if needed in future) */}
      {activities.length >= limit && (
        <div className="mt-6 text-center">
          <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            Load More Activities
          </button>
        </div>
      )}
    </div>
  );
}
