'use client'

import { useState, useEffect } from 'react'
import type { RoomReactionType, RoomReactionSummary, User } from '../../lib/sqlite-db'

interface TrackReactionsModalProps {
  roomId: string
  trackId: string
  trackName: string
  artistName: string
  onClose: () => void
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

export default function TrackReactionsModal({
  roomId,
  trackId,
  trackName,
  artistName,
  onClose
}: TrackReactionsModalProps) {
  const [users, setUsers] = useState<Array<{ user: User; reaction_type: RoomReactionType }>>([])
  const [summary, setSummary] = useState<RoomReactionSummary>({
    total: 0,
    reactions: [],
    userReaction: null
  })
  const [selectedFilter, setSelectedFilter] = useState<RoomReactionType | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReactions()
  }, [selectedFilter])

  const fetchReactions = async () => {
    setIsLoading(true)
    try {
      const filterParam = selectedFilter !== 'all' ? `?type=${selectedFilter}` : ''
      const response = await fetch(`/api/rooms/${roomId}/tracks/${trackId}/reactions${filterParam}`)

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch reactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Reactions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {trackName} • {artistName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${selectedFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              All {summary.total}
            </button>

            {summary.reactions.map((reaction) => (
              <button
                key={reaction.reaction_type}
                onClick={() => setSelectedFilter(reaction.reaction_type)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1
                  ${selectedFilter === reaction.reaction_type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                <span>{REACTION_EMOJIS[reaction.reaction_type]}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No reactions yet
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((item) => (
                <div
                  key={`${item.user.spotify_id}-${item.reaction_type}`}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {/* Avatar */}
                  <img
                    src={item.user.custom_avatar_url || item.user.avatar_url || '/default-avatar.png'}
                    alt={item.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {item.user.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {REACTION_LABELS[item.reaction_type]}
                    </p>
                  </div>

                  {/* Reaction Emoji */}
                  <span className="text-2xl">
                    {REACTION_EMOJIS[item.reaction_type]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
