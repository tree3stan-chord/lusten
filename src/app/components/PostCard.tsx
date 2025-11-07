'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ReactionButton from './ReactionButton';
import ReactionsList from './ReactionsList';
import CommentsList from './CommentsList';
import type { ParsedPost } from '../../lib/sqlite-db';

interface PostCardProps {
  post: ParsedPost;
  onEdit?: () => void;
  onDelete?: () => void;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function PostCard({ post, onEdit, onDelete }: PostCardProps) {
  const { data: session } = useSession();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReactionsList, setShowReactionsList] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const isOwner = session?.user?.id === post.user_id;

  // Fetch comment count
  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const response = await fetch(`/api/posts/${post.id}/comments?limit=0`);
        if (response.ok) {
          const data = await response.json();
          setCommentCount(data.total);
        }
      } catch (error) {
        console.error('Failed to fetch comment count:', error);
      }
    };

    fetchCommentCount();
  }, [post.id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onDelete?.();
      } else {
        alert('Failed to delete post');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  const visibilityIcon = {
    public: '🌍',
    friends: '👥',
    private: '🔒'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <img
            src={post.user?.custom_avatar_url || post.user?.avatar_url || '/default-avatar.png'}
            alt={post.user?.name || 'User'}
            className="w-12 h-12 rounded-full object-cover"
          />

          {/* User Info */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {post.user?.name || 'Unknown User'}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {visibilityIcon[post.visibility]}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getRelativeTime(post.created_at)}
              {post.is_edited && ' (edited)'}
            </p>
          </div>
        </div>

        {/* Actions Menu */}
        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit?.();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Post
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {isDeleting ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="mb-4">
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap break-words">
            {post.content}
          </p>
        </div>
      )}

      {/* Spotify Track (if attached) */}
      {post.spotify_track_data && (() => {
        try {
          const trackData = JSON.parse(post.spotify_track_data);
          return (
            <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-750 rounded-lg p-4 border border-green-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                {trackData.image && (
                  <img
                    src={trackData.image}
                    alt={trackData.album}
                    className="w-20 h-20 rounded-lg shadow-md"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {trackData.name}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate mb-1">
                    {trackData.artists}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {trackData.album}
                  </p>
                </div>
                {trackData.url && (
                  <a
                    href={trackData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Play on Spotify
                  </a>
                )}
              </div>
            </div>
          );
        } catch (e) {
          console.error('Failed to parse track data:', e);
          return null;
        }
      })()}

      {/* Media (if exists) */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {post.media_urls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Post media ${index + 1}`}
              className="rounded-lg object-cover w-full h-48"
            />
          ))}
        </div>
      )}

      {/* Interaction Bar */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-6">
          {/* Reactions */}
          <div onClick={() => setShowReactionsList(true)} className="cursor-pointer">
            <ReactionButton postId={post.id} />
          </div>

          {/* Comment */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm">
              Comment {commentCount > 0 && `(${commentCount})`}
            </span>
          </button>

          {/* Share (placeholder) */}
          <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-sm">Share</span>
          </button>
        </div>
      </div>

      {/* Reactions List Modal */}
      {showReactionsList && (
        <ReactionsList
          postId={post.id}
          onClose={() => setShowReactionsList(false)}
        />
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <CommentsList
            postId={post.id}
            initialTotal={commentCount}
          />
        </div>
      )}
    </div>
  );
}
