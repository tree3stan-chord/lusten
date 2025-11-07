'use client'

import { useState, useEffect } from 'react'
import type { ParsedComment } from '../../lib/sqlite-db'
import Comment from './Comment'
import CommentInput from './CommentInput'

interface CommentsListProps {
  postId: string
  initialComments?: ParsedComment[]
  initialTotal?: number
}

export default function CommentsList({ postId, initialComments = [], initialTotal = 0 }: CommentsListProps) {
  const [comments, setComments] = useState<ParsedComment[]>(initialComments)
  const [total, setTotal] = useState(initialTotal)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialComments.length < initialTotal)

  // Fetch comments
  const fetchComments = async (offset = 0) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments?limit=10&offset=${offset}`)
      if (response.ok) {
        const data = await response.json()

        if (offset === 0) {
          // Initial load or refresh
          setComments(data.comments)
        } else {
          // Load more
          setComments(prev => [...prev, ...data.comments])
        }

        setTotal(data.total)
        setHasMore(offset + data.comments.length < data.total)
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load if no initial comments provided
  useEffect(() => {
    if (initialComments.length === 0) {
      fetchComments()
    }
  }, [postId])

  // Refresh comments
  const handleRefresh = () => {
    fetchComments(0)
  }

  // Load more comments
  const handleLoadMore = () => {
    fetchComments(comments.length)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comments {total > 0 && `(${total})`}
        </h3>
      </div>

      {/* Comment Input */}
      <div>
        <CommentInput
          postId={postId}
          onCommentAdded={handleRefresh}
        />
      </div>

      {/* Comments List */}
      <div className="space-y-1">
        {isLoading && comments.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onCommentUpdated={handleRefresh}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Loading...' : 'Load more comments'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
