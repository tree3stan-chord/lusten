'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ id: string; name: string }>
  album: {
    id: string
    name: string
    images: Array<{ url: string; height: number; width: number }>
  }
  duration_ms: number
  preview_url: string | null
  external_urls: { spotify: string }
}

export default function CreatePostPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Spotify track search
  const [showTrackSearch, setShowTrackSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Search Spotify tracks
  const handleSearchTracks = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}&limit=10`)

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results.tracks)
      } else {
        console.error('Search failed')
      }
    } catch (error) {
      console.error('Failed to search:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle track selection
  const handleSelectTrack = (track: SpotifyTrack) => {
    setSelectedTrack(track)
    setShowTrackSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  // Create post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!content.trim() && !selectedTrack) {
      setError('Please write something or attach a track')
      return
    }

    if (content.length > 5000) {
      setError('Post is too long (max 5000 characters)')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content.trim(),
          visibility,
          spotify_track_id: selectedTrack?.id,
          spotify_track_data: selectedTrack ? JSON.stringify({
            name: selectedTrack.name,
            artists: selectedTrack.artists.map(a => a.name).join(', '),
            album: selectedTrack.album.name,
            image: selectedTrack.album.images[0]?.url,
            url: selectedTrack.external_urls.spotify
          }) : undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create post')
      }

      // Success - redirect to feed
      router.push('/feed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Post
          </h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Textarea */}
          <div className="mb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              rows={6}
              maxLength={5000}
            />
            <div className="text-right text-xs text-gray-400 mt-1">
              {content.length}/5000
            </div>
          </div>

          {/* Selected Track Display */}
          {selectedTrack && (
            <div className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <img
                  src={selectedTrack.album.images[0]?.url}
                  alt={selectedTrack.album.name}
                  className="w-16 h-16 rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {selectedTrack.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {selectedTrack.artists.map(a => a.name).join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTrack(null)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Track Search Modal */}
          {showTrackSearch && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Search for a track
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchTracks()}
                      placeholder="Search tracks..."
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSearchTracks}
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-4">
                  {searchResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {isSearching ? 'Searching...' : 'Search for tracks to attach to your post'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => handleSelectTrack(track)}
                          className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <img
                            src={track.album.images[0]?.url}
                            alt={track.album.name}
                            className="w-12 h-12 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {track.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {track.artists.map(a => a.name).join(', ')}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowTrackSearch(false)}
                    className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Visibility Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Who can see this?
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'friends' | 'private')}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="public">🌍 Public</option>
              <option value="friends">👥 Friends Only</option>
              <option value="private">🔒 Private</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowTrackSearch(true)}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Attach Track
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !selectedTrack)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
