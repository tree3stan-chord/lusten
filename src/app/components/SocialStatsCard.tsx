'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProfileAvatar from './ProfileAvatar';
import Avatar from './Avatar';
import EnhancedTopThreesSection from './EnhancedTopThreesSection';
import { useSpotifyStats } from '../hooks/useSpotifyStats';
import type { User } from '../../lib/sqlite-db';
import type { ParsedTopPick, ParsedSpotifyStats } from '../../lib/sqlite-db';

interface SocialStatsCardProps {
  user: User;
  isOwnProfile: boolean;
  topPicks: ParsedTopPick[];
  spotifyStats: ParsedSpotifyStats | null;
}

export default function SocialStatsCard({
  user,
  isOwnProfile,
  topPicks,
  spotifyStats
}: SocialStatsCardProps) {
  const { data: session } = useSession();
  
  // Use the enhanced Spotify stats hook for better state management
  const { 
    stats: liveStats, 
    updateStats 
  } = useSpotifyStats({
    userId: user.spotify_id,
    initialStats: spotifyStats,
    autoRefresh: isOwnProfile // Only auto-refresh for user's own profile
  });

  // Use live stats if available, fall back to initial props
  const currentStats = liveStats || spotifyStats;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex gap-6">
        {/* Left Section - Profile Picture */}
        <div className="flex-shrink-0">
          {isOwnProfile ? (
            <ProfileAvatar size="2xl" />
          ) : (
            <Avatar
              src={user.avatar_url}
              alt={user.name}
              size="2xl"
              userId={user.spotify_id}
              name={user.name}
            />
          )}
        </div>

        {/* Vertical Separator */}
        <div className="w-px bg-gray-200 dark:bg-gray-700" />

        {/* Middle Section - Top 5 */}
        <div className="flex-1 min-w-0">
          <TopFiveSection
            topPicks={topPicks}
            isEditable={isOwnProfile}
            userName={user.name}
          />
        </div>

        {/* Vertical Separator */}
        <div className="w-px bg-gray-200 dark:bg-gray-700" />

        {/* Right Section - Top 3s (Auto Stats) */}
        <div className="flex-1 min-w-0">
          <EnhancedTopThreesSection
            spotifyStats={currentStats}
            userName={user.name}
            userId={user.spotify_id}
            isOwnProfile={isOwnProfile}
            onStatsUpdated={updateStats}
          />
        </div>
      </div>
    </div>
  );
}

// Top 5 Section Component
interface TopFiveSectionProps {
  topPicks: ParsedTopPick[];
  isEditable: boolean;
  userName: string;
}

function TopFiveSection({ topPicks, isEditable, userName }: TopFiveSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isEditable ? 'My Top 5' : `${userName}'s Top 5`}
        </h3>
        {isEditable && (
          <button
            onClick={handleEdit}
            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {/* Top 5 List */}
      <div className="space-y-3">
        {topPicks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-sm">
              {isEditable ? 'Add your top 5 favorites' : 'No favorites selected yet'}
            </p>
            {isEditing && (
              <button className="mt-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 text-sm font-medium">
                + Add First Pick
              </button>
            )}
          </div>
        ) : (
          topPicks.map((pick, index) => (
            <TopPickItem
              key={pick.id}
              pick={pick}
              position={index + 1}
              isEditing={isEditing}
            />
          ))
        )}

        {/* Add Button when editing and have items */}
        {isEditing && topPicks.length > 0 && topPicks.length < 5 && (
          <button className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Pick #{topPicks.length + 1}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// Individual Top Pick Item
interface TopPickItemProps {
  pick: ParsedTopPick;
  position: number;
  isEditing: boolean;
}

function TopPickItem({ pick, position, isEditing }: TopPickItemProps) {
  const { type, spotify_data } = pick;
  const imageUrl = spotify_data.images?.[0]?.url || '';

  const getTypeIcon = () => {
    switch (type) {
      case 'song':
        return '🎵';
      case 'album':
        return '💿';
      case 'artist':
        return '🎤';
      default:
        return '🎵';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'song':
        return spotify_data.artist || '';
      case 'album':
        return spotify_data.artist || '';
      case 'artist':
        return spotify_data.genres?.slice(0, 2).join(', ') || '';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      {/* Position Number */}
      <div className="flex-shrink-0 w-6 text-center">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {position}
        </span>
      </div>

      {/* Image/Icon */}
      <div className="flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={spotify_data.name}
            className="w-10 h-10 rounded object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
            <span className="text-lg">{getTypeIcon()}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {spotify_data.name}
        </p>
        {getSubtitle() && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {getSubtitle()}
          </p>
        )}
      </div>

      {/* Edit Controls */}
      {isEditing && (
        <div className="flex items-center space-x-2">
          {/* Edit Button */}
          <button className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {/* Delete Button */}
          <button className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// Top 3s Section Component
interface TopThreesSectionProps {
  spotifyStats: ParsedSpotifyStats | null;
  userName: string;
}

function TopThreesSection({ spotifyStats, userName }: TopThreesSectionProps) {
  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Top 3s
        </h3>
        {spotifyStats?.last_updated && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Updated {new Date(spotifyStats.last_updated).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Stats Sections */}
      <div className="space-y-6">
        {/* Top Artists */}
        <StatSection
          title="🎤 Artists"
          items={spotifyStats?.top_artists || []}
          renderItem={(artist) => (
            <div key={artist.id} className="flex items-center space-x-2">
              {artist.images[0] && (
                <img
                  src={artist.images[0].url}
                  alt={artist.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {artist.name}
              </span>
            </div>
          )}
        />

        {/* Top Albums */}
        <StatSection
          title="💿 Albums"
          items={spotifyStats?.top_albums || []}
          renderItem={(album) => (
            <div key={album.id} className="flex items-center space-x-2">
              {album.images[0] && (
                <img
                  src={album.images[0].url}
                  alt={album.name}
                  className="w-6 h-6 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {album.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {album.artist}
                </p>
              </div>
            </div>
          )}
        />

        {/* Top Genres */}
        <StatSection
          title="🎭 Genres"
          items={spotifyStats?.top_genres || []}
          renderItem={(genre) => (
            <div key={genre.name} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {genre.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {genre.count}
              </span>
            </div>
          )}
        />
      </div>
    </div>
  );
}

// Generic Stat Section
interface StatSectionProps<T> {
  title: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function StatSection<T>({ title, items, renderItem }: StatSectionProps<T>) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          No data available
        </p>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 3).map((item, index) => renderItem(item, index))}
        </div>
      )}
    </div>
  );
}