'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { formatDistanceToNow } from 'date-fns'
import type { ParsedComment } from '../../lib/sqlite-db'
import CommentInput from './CommentInput'

interface CommentProps {
  comment: ParsedComment
  onCommentUpdated?: () => void
  level?: number // For nested comment styling
}

export default function Comment({ comment, onCommentUpdated, level = 0 }: CommentProps) {
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState<ParsedComment[]>([])
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = session?.user?.id === comment.user_id
  const hasReplies = comment.reply_count > 0
  const maxLevel = 3 // Maximum nesting level

  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
  const isEdited = comment.updated_at !== comment.created_at

  // Load replies
  const loadReplies = async () => {
    if (isLoadingReplies) return

    setIsLoadingReplies(true)
    try {
      const response = await fetch(`/api/comments/${comment.id}/replies`)
      if (response.ok) {
        const data = await response.json()
        setReplies(data.replies)
        setShowReplies(true)
      }
    } catch (error) {
      console.error('Failed to load replies:', error)
    } finally {
      setIsLoadingReplies(false)
    }
  }

  // Handle edit
  const handleEdit = async () => {
    if (!editContent.trim()) return

    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() })
      })

      if (response.ok) {
        setIsEditing(false)
        onCommentUpdated?.()
      }
    } catch (error) {
      console.error('Failed to edit comment:', error)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment? This will also delete all replies.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onCommentUpdated?.()
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle reply added
  const handleReplyAdded = () => {
    setIsReplying(false)
    loadReplies() // Reload replies to show new one
    onCommentUpdated?.() // Update parent to refresh counts
  }

  return (
    <div className={`${level > 0 ? 'ml-8 mt-3' : 'mb-4'}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={comment.user.custom_avatar_url || comment.user.avatar_url || '/default-avatar.png'}
            alt={comment.user.name}
            className="w-8 h-8 rounded-full"
          />
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {comment.user.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {timeAgo}
              {isEdited && ' (edited)'}
            </span>
          </div>

          {/* Content or Edit Form */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 dark:text-white"
                rows={3}
                maxLength={2000}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditContent(comment.content)
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words">
              {comment.content}
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-4 mt-2">
              {/* Reply Button */}
              {level < maxLevel && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Reply
                </button>
              )}

              {/* Edit Button */}
              {isOwner && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Edit
                </button>
              )}

              {/* Delete Button */}
              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              )}

              {/* Show Replies Button */}
              {hasReplies && (
                <button
                  onClick={() => {
                    if (showReplies) {
                      setShowReplies(false)
                    } else {
                      loadReplies()
                    }
                  }}
                  disabled={isLoadingReplies}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isLoadingReplies
                    ? 'Loading...'
                    : showReplies
                    ? 'Hide replies'
                    : `Show ${comment.reply_count} ${comment.reply_count === 1 ? 'reply' : 'replies'}`}
                </button>
              )}
            </div>
          )}

          {/* Reply Input */}
          {isReplying && (
            <div className="mt-3">
              <CommentInput
                postId={comment.post_id}
                parentCommentId={comment.id}
                replyToUsername={comment.user.name}
                onCommentAdded={handleReplyAdded}
                onCancel={() => setIsReplying(false)}
                autoFocus
              />
            </div>
          )}

          {/* Nested Replies */}
          {showReplies && replies.length > 0 && (
            <div className="mt-3">
              {replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  onCommentUpdated={onCommentUpdated}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
