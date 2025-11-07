'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface CreatePostProps {
  onPostCreated?: () => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Post content cannot be empty');
      return;
    }

    if (content.length > 5000) {
      setError('Post is too long (max 5000 characters)');
      return;
    }

    setIsPosting(true);
    setError('');

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          visibility
        })
      });

      if (response.ok) {
        setContent('');
        setVisibility('public');
        onPostCreated?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  if (!session) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={session.user?.image || '/default-avatar.png'}
            alt={session.user?.name || 'User'}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {session.user?.name}
            </p>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'friends' | 'private')}
              className="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-none focus:ring-0 p-0"
            >
              <option value="public">🌍 Public</option>
              <option value="friends">👥 Friends Only</option>
              <option value="private">🔒 Private</option>
            </select>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind? Share a song, thought, or update..."
          rows={4}
          maxLength={5000}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />

        {/* Character Count & Error */}
        <div className="flex justify-between items-center mt-2 mb-4">
          <span className={`text-xs ${
            content.length > 4500
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {content.length}/5000
          </span>
          {error && (
            <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {/* Attachment buttons (future) */}
            <button
              type="button"
              disabled
              className="p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Image upload (coming soon)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              type="button"
              disabled
              className="p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Spotify link (coming soon)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </button>
          </div>

          <button
            type="submit"
            disabled={isPosting || !content.trim()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
