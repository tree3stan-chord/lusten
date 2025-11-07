'use client'

import { useState, useRef, useEffect } from 'react'

interface CommentInputProps {
  postId: string
  parentCommentId?: string
  replyToUsername?: string
  onCommentAdded?: () => void
  onCancel?: () => void
  autoFocus?: boolean
}

export default function CommentInput({
  postId,
  parentCommentId,
  replyToUsername,
  onCommentAdded,
  onCancel,
  autoFocus = false
}: CommentInputProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  // Extract mentions from content (e.g., @username)
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g
    const matches = text.matchAll(mentionRegex)
    const mentions = Array.from(matches).map(match => match[1])
    return [...new Set(mentions)] // Remove duplicates
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!content.trim()) {
      setError('Please enter a comment')
      return
    }

    if (content.length > 2000) {
      setError('Comment is too long (max 2000 characters)')
      return
    }

    setIsSubmitting(true)

    try {
      const mentions = extractMentions(content)

      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content.trim(),
          parentCommentId,
          mentions: mentions.length > 0 ? mentions : undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to post comment')
      }

      // Success - clear form and notify parent
      setContent('')
      setError(null)
      onCommentAdded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {replyToUsername && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Replying to <span className="font-semibold">@{replyToUsername}</span>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={parentCommentId ? 'Write a reply...' : 'Write a comment...'}
          disabled={isSubmitting}
          rows={3}
          maxLength={2000}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />

        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          {content.length}/2000
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Tip: Use @username to mention someone
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isSubmitting ? 'Posting...' : parentCommentId ? 'Reply' : 'Comment'}
          </button>
        </div>
      </div>
    </form>
  )
}
