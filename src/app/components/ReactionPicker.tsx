'use client';

import { useState } from 'react';
import type { ReactionType } from '../../lib/sqlite-db';

interface ReactionPickerProps {
  onReact: (reactionType: ReactionType) => void;
  currentReaction?: ReactionType | null;
}

const REACTIONS: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: 'like', emoji: '❤️', label: 'Like' },
  { type: 'love', emoji: '😍', label: 'Love' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'laugh', emoji: '😂', label: 'Laugh' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' }
];

export default function ReactionPicker({
  onReact,
  currentReaction
}: ReactionPickerProps) {
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-3 py-2">
      {REACTIONS.map((reaction) => {
        const isActive = currentReaction === reaction.type;
        const isHovered = hoveredReaction === reaction.type;

        return (
          <button
            key={reaction.type}
            onClick={() => onReact(reaction.type)}
            onMouseEnter={() => setHoveredReaction(reaction.type)}
            onMouseLeave={() => setHoveredReaction(null)}
            className={`relative group transition-transform duration-200 ${
              isHovered ? 'scale-125' : 'scale-100'
            }`}
            aria-label={reaction.label}
          >
            <span
              className={`text-2xl ${isActive ? 'filter drop-shadow-lg' : ''}`}
            >
              {reaction.emoji}
            </span>

            {/* Tooltip */}
            {isHovered && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {reaction.label}
              </div>
            )}

            {/* Active indicator */}
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"></div>
            )}
          </button>
        );
      })}
    </div>
  );
}
