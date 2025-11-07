'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PostCard from '../components/PostCard'
import type { ParsedPost } from '../../lib/sqlite-db'

export default function FeedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<ParsedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch posts
  const fetchPosts = useCallback(async (resetOffset = false) => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const currentOffset = resetOffset ? 0 : offset
      const response = await fetch(`/api/feed?limit=20&offset=${currentOffset}`)

      if (response.ok) {
        const data = await response.json()

        if (resetOffset) {
          setPosts(data.posts)
          setOffset(data.posts.length)
        } else {
          setPosts(prev => [...prev, ...data.posts])
          setOffset(prev => prev + data.posts.length)
        }

        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id, offset])

  // Initial load
  useEffect(() => {
    if (session?.user?.id) {
      fetchPosts(true)
    }
  }, [session?.user?.id])

  // Refresh posts
  const handleRefresh = () => {
    fetchPosts(true)
  }

  // Load more
  const handleLoadMore = () => {
    fetchPosts(false)
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Your Feed
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            See what your friends are sharing
          </p>
        </div>

        {/* Create Post Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/posts/create')}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-left text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            What's on your mind?
          </button>
        </div>

        {/* Feed */}
        <div className="space-y-6">
          {isLoading && posts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="text-6xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Your feed is empty
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Follow friends or create your first post to get started!
              </p>
              <button
                onClick={() => router.push('/posts/create')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Post
              </button>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={handleRefresh}
                />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
