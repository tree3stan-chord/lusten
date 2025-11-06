'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Suggestion {
  spotify_id: string;
  name: string;
  avatar_url: string | null;
  reason: string;
  score: number;
}

export default function SuggestedFriends() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch('/api/friends/suggestions');
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      setSendingRequest(prev => new Set(prev).add(userId));

      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: userId })
      });

      if (response.ok) {
        // Remove from suggestions
        setSuggestions(prev => prev.filter(s => s.spotify_id !== userId));
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setSendingRequest(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Suggested Friends
        </h2>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null; // Don't show section if no suggestions
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        💫 Suggested Friends
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Based on your music taste
      </p>

      <div className="space-y-3">
        {suggestions.slice(0, 5).map((suggestion) => (
          <div
            key={suggestion.spotify_id}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg"
          >
            <Link
              href={`/profile/${suggestion.spotify_id}`}
              className="flex items-center space-x-3 flex-1"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                {suggestion.avatar_url ? (
                  <Image
                    src={suggestion.avatar_url}
                    alt={suggestion.name}
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
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {suggestion.name}
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">
                  {suggestion.reason}
                </p>
              </div>
            </Link>

            <button
              onClick={() => handleSendRequest(suggestion.spotify_id)}
              disabled={sendingRequest.has(suggestion.spotify_id)}
              className="ml-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:cursor-not-allowed"
            >
              {sendingRequest.has(suggestion.spotify_id) ? 'Sending...' : 'Add'}
            </button>
          </div>
        ))}
      </div>

      {suggestions.length > 5 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          +{suggestions.length - 5} more suggestions
        </p>
      )}
    </div>
  );
}
