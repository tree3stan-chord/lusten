'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import ReactionPicker from './ReactionPicker';
import type { ReactionType, ReactionSummary } from '../../lib/sqlite-db';

interface ReactionButtonProps {
  postId: string;
  onReactionsUpdate?: () => void;
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
  like: '❤️',
  love: '😍',
  fire: '🔥',
  laugh: '😂',
  wow: '😮',
  sad: '😢'
};

export default function ReactionButton({
  postId,
  onReactionsUpdate
}: ReactionButtonProps) {
  const { data: session } = useSession();
  const [showPicker, setShowPicker] = useState(false);
  const [summary, setSummary] = useState<ReactionSummary>({
    total: 0,
    reactions: [],
    userReaction: null
  });
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReactionSummary();
  }, [postId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const fetchReactionSummary = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/posts/${postId}/reactions`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    }
  };

  const handleReact = async (reactionType: ReactionType) => {
    if (!session?.user?.id || loading) return;

    setLoading(true);
    try {
      // If user already has this reaction, remove it
      if (summary.userReaction === reactionType) {
        const response = await fetch(`/api/posts/${postId}/reactions`, {
          method: 'DELETE'
        });

        if (response.ok) {
          const data = await response.json();
          setSummary(data.summary);
          onReactionsUpdate?.();
        }
      } else {
        // Add or update reaction
        const response = await fetch(`/api/posts/${postId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reactionType })
        });

        if (response.ok) {
          const data = await response.json();
          setSummary(data.summary);
          onReactionsUpdate?.();
        }
      }
    } catch (error) {
      console.error('Failed to react:', error);
    } finally {
      setLoading(false);
      setShowPicker(false);
    }
  };

  const handleQuickReact = () => {
    // Quick react with heart if no reaction, otherwise show picker
    if (!summary.userReaction) {
      handleReact('like');
    } else {
      setShowPicker(!showPicker);
    }
  };

  return (
    <div className="relative" ref={pickerRef}>
      <div className="flex items-center gap-2">
        {/* Main Reaction Button */}
        <button
          onClick={handleQuickReact}
          onMouseEnter={() => !summary.userReaction && setShowPicker(true)}
          onMouseLeave={() => !summary.userReaction && setTimeout(() => setShowPicker(false), 200)}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
            summary.userReaction
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
              : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {summary.userReaction ? (
            <span className="text-lg">{REACTION_EMOJIS[summary.userReaction]}</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
          {summary.total > 0 && (
            <span className="text-sm font-medium">{summary.total}</span>
          )}
        </button>

        {/* Reaction Breakdown (if there are reactions) */}
        {summary.reactions.length > 0 && (
          <div className="flex items-center gap-1">
            {summary.reactions.slice(0, 3).map((reaction) => (
              <span key={reaction.reaction_type} className="text-sm">
                {REACTION_EMOJIS[reaction.reaction_type]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reaction Picker */}
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <ReactionPicker
            onReact={handleReact}
            currentReaction={summary.userReaction}
          />
        </div>
      )}
    </div>
  );
}
