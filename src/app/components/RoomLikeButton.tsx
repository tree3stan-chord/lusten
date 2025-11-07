'use client'

import { useState, useEffect } from 'react'
import type { RoomLikeSummary } from '../../lib/sqlite-db'

interface RoomLikeButtonProps {
  roomId: string
  initialSummary?: RoomLikeSummary
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
}

export default function RoomLikeButton({
  roomId,
  initialSummary,
  size = 'md',
  showCount = true
}: RoomLikeButtonProps) {
  const [summary, setSummary] = useState<RoomLikeSummary>(
    initialSummary || { likeCount: 0, isLiked: false }
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Fetch initial summary if not provided
  useEffect(() => {
    if (!initialSummary) {
      fetchSummary()
    }
  }, [roomId])

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/like`)
      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch like summary:', error)
    }
  }

  const handleToggleLike = async () => {
    if (isLoading) return

    setIsLoading(true)
    setIsAnimating(true)

    try {
      const method = summary.isLiked ? 'DELETE' : 'POST'
      const response = await fetch(`/api/rooms/${roomId}/like`, { method })

      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)

        // Reset animation after a delay
        setTimeout(() => setIsAnimating(false), 300)
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      setIsAnimating(false)
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-5 py-3'
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <button
      onClick={handleToggleLike}
      disabled={isLoading}
      className={`
        flex items-center gap-2 rounded-lg font-medium transition-all
        ${sizeClasses[size]}
        ${summary.isLiked
          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-700'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-transparent'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isAnimating ? 'scale-110' : 'scale-100'}
      `}
    >
      {/* Heart Icon */}
      {summary.isLiked ? (
        <svg
          className={`${iconSizeClasses[size]} ${isAnimating ? 'animate-ping' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ) : (
        <svg
          className={iconSizeClasses[size]}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}

      {/* Like Count */}
      {showCount && summary.likeCount > 0 && (
        <span className="font-semibold">
          {summary.likeCount}
        </span>
      )}

      {/* Label */}
      <span className="hidden sm:inline">
        {summary.isLiked ? 'Liked' : 'Like'}
      </span>
    </button>
  )
}
