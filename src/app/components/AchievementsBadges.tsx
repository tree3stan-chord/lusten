'use client';

import { useState, useEffect } from 'react';
import type { UserAchievement } from '../../lib/sqlite-db';

interface AchievementsBadgesProps {
  userId: string;
  showAll?: boolean; // Show all achievements or only unlocked
}

const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_room: '🏠',
  room_host_10: '🎯',
  room_host_50: '🌟',
  room_host_100: '👑',
  first_friend: '👋',
  friends_5: '👥',
  friends_25: '🎉',
  friends_100: '🎊',
  listening_hours_10: '🎧',
  listening_hours_100: '🎵',
  listening_hours_1000: '🏆',
  genre_explorer: '🗺️',
  night_owl: '🦉',
  early_bird: '🐦',
  social_butterfly: '🦋',
  profile_complete: '✅',
  top_picks_set: '⭐',
  bio_writer: '✍️'
};

export default function AchievementsBadges({
  userId,
  showAll = false
}: AchievementsBadgesProps) {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'unlocked' | 'all'>('unlocked');

  useEffect(() => {
    fetchAchievements();
  }, [userId, viewMode]);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const unlockedOnly = viewMode === 'unlocked' && !showAll;
      const response = await fetch(`/api/achievements/${userId}?unlocked_only=${unlockedOnly}`);
      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Achievements
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {unlockedCount} of {totalCount} unlocked ({Math.round(progressPercentage)}%)
          </p>
        </div>

        {showAll && (
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('unlocked')}
              className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                viewMode === 'unlocked'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Unlocked
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Achievements Grid */}
      {achievements.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {viewMode === 'unlocked' ? 'No achievements unlocked yet' : 'No achievements available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                achievement.unlocked
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 opacity-60'
              }`}
            >
              {/* Icon */}
              <div className="text-4xl mb-2 text-center">
                {achievement.icon || ACHIEVEMENT_ICONS[achievement.achievement_type] || '🏅'}
              </div>

              {/* Title */}
              <h4 className={`text-sm font-semibold text-center mb-1 ${
                achievement.unlocked
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {achievement.title}
              </h4>

              {/* Description */}
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center mb-2">
                {achievement.description}
              </p>

              {/* Progress Bar (if not unlocked) */}
              {!achievement.unlocked && achievement.target > 1 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{achievement.progress}</span>
                    <span>{achievement.target}</span>
                  </div>
                  <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (achievement.progress / achievement.target) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Unlocked Badge */}
              {achievement.unlocked && (
                <div className="absolute top-2 right-2">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                </div>
              )}

              {/* Unlock Date */}
              {achievement.unlocked && achievement.unlocked_at && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  {new Date(achievement.unlocked_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
