'use client';

import { useState, useEffect } from 'react';
import type { ReactionType, User } from '../../lib/sqlite-db';

interface ReactionsListProps {
  postId: string;
  onClose: () => void;
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
  like: '❤️',
  love: '😍',
  fire: '🔥',
  laugh: '😂',
  wow: '😮',
  sad: '😢'
};

const REACTION_LABELS: Record<ReactionType, string> = {
  like: 'Like',
  love: 'Love',
  fire: 'Fire',
  laugh: 'Laugh',
  wow: 'Wow',
  sad: 'Sad'
};

export default function ReactionsList({ postId, onClose }: ReactionsListProps) {
  const [users, setUsers] = useState<Array<{ user: User; reaction_type: ReactionType }>>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedFilter, setSelectedFilter] = useState<ReactionType | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReactions();
  }, [postId, selectedFilter]);

  const fetchReactions = async () => {
    setLoading(true);
    try {
      const filterParam = selectedFilter !== 'all' ? `?type=${selectedFilter}` : '';
      const response = await fetch(`/api/posts/${postId}/reactions${filterParam}`);

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Reactions {summary && `(${summary.total})`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Tabs */}
        {summary && summary.reactions.length > 0 && (
          <div className="flex gap-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All {summary.total}
            </button>
            {summary.reactions.map((reaction: any) => (
              <button
                key={reaction.reaction_type}
                onClick={() => setSelectedFilter(reaction.reaction_type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                  selectedFilter === reaction.reaction_type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>{REACTION_EMOJIS[reaction.reaction_type]}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No reactions yet</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {users.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {/* Avatar */}
                  <img
                    src={item.user.custom_avatar_url || item.user.avatar_url || '/default-avatar.png'}
                    alt={item.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.user.name}
                    </p>
                  </div>

                  {/* Reaction */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-lg">{REACTION_EMOJIS[item.reaction_type]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
