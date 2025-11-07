'use client'

import { useState, useEffect } from 'react'
import type { RoomReactionType, RoomReactionSummary } from '../../lib/sqlite-db'

interface TrackReactionButtonProps {
  roomId: string
  trackId: string
  trackName: string
  artistName: string
  onReactionsUpdate?: (summary: RoomReactionSummary) => void
}

const REACTION_EMOJIS: Record<RoomReactionType, string> = {
  love: '❤️',
  fire: '🔥',
  vibe: '✨',
  skip: '⏭️'
}

const REACTION_LABELS: Record<RoomReactionType, string> = {
  love: 'Love',
  fire: 'Fire',
  vibe: 'Vibe',
  skip: 'Skip'
}

export default function TrackReactionButton({
  roomId,
  trackId,
  trackName,
  artistName,
  onReactionsUpdate
}: TrackReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [summary, setSummary] = useState<RoomReactionSummary>({
    total: 0,
    reactions: [],
    userReaction: null
  })
  const [isLoading, setIsLoading] = useState(false)

  // Fetch initial summary
  useEffect(() => {
    fetchSummary()
  }, [roomId, trackId])

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/tracks/${trackId}/reactions`)
      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
        onReactionsUpdate?.(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch reactions:', error)
    }
  }

  const handleReact = async (reactionType: RoomReactionType) => {
    if (isLoading) return

    setIsLoading(true)
    setShowPicker(false)

    try {
      // If user already has this reaction, remove it
      if (summary.userReaction === reactionType) {
        const response = await fetch(`/api/rooms/${roomId}/tracks/${trackId}/reactions`, {
          method: 'DELETE'
        })

        if (response.ok) {
          const data = await response.json()
          setSummary(data.summary)
          onReactionsUpdate?.(data.summary)
        }
      } else {
        // Add or update reaction
        const response = await fetch(`/api/rooms/${roomId}/tracks/${trackId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reactionType,
            trackName,
            artistName
          })
        })

        if (response.ok) {
          const data = await response.json()
          setSummary(data.summary)
          onReactionsUpdate?.(data.summary)
        }
      }
    } catch (error) {
      console.error('Failed to react:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickReact = () => {
    if (!summary.userReaction) {
      handleReact('love')
    } else {
      setShowPicker(!showPicker)
    }
  }

  return (
    <div className="relative inline-block">
      {/* Main Button */}
      <button
        onClick={handleQuickReact}
        onMouseEnter={() => !summary.userReaction && setShowPicker(true)}
        onMouseLeave={() => !summary.userReaction && setShowPicker(false)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg transition-all
          ${summary.userReaction
            ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border-2 border-pink-300 dark:border-pink-700'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {summary.userReaction ? (
          <>
            <span className="text-xl">{REACTION_EMOJIS[summary.userReaction]}</span>
            <span className="text-sm font-medium">{REACTION_LABELS[summary.userReaction]}</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span className="text-sm font-medium">React</span>
          </>
        )}

        {summary.total > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-white dark:bg-gray-900 rounded-full text-xs font-semibold">
            {summary.total}
          </span>
        )}
      </button>

      {/* Reaction Breakdown */}
      {summary.reactions.length > 0 && (
        <div className="absolute -bottom-6 left-0 flex items-center gap-1">
          {summary.reactions.slice(0, 4).map((reaction) => (
            <div
              key={reaction.reaction_type}
              className="flex items-center gap-0.5 text-xs"
            >
              <span>{REACTION_EMOJIS[reaction.reaction_type]}</span>
              <span className="text-gray-600 dark:text-gray-400">{reaction.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reaction Picker */}
      {showPicker && (
        <div
          className="absolute bottom-full mb-2 left-0 z-50"
          onMouseEnter={() => setShowPicker(true)}
          onMouseLeave={() => setShowPicker(false)}
        >
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-4 py-3">
            {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => {
              const reactionType = type as RoomReactionType
              const isActive = summary.userReaction === reactionType

              return (
                <button
                  key={type}
                  onClick={() => handleReact(reactionType)}
                  disabled={isLoading}
                  className={`
                    relative group transition-transform hover:scale-125
                    ${isActive ? 'scale-110' : 'scale-100'}
                  `}
                >
                  <span className="text-3xl">{emoji}</span>

                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {REACTION_LABELS[reactionType]}
                    </div>
                  </div>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-pink-500 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
