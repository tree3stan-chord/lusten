'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import type { PrivacySettings } from '../../lib/sqlite-db';

interface ProfileEditorProps {
  initialBio?: string;
  initialStatus?: string;
  initialPrivacy?: PrivacySettings;
  onUpdate?: () => void;
}

const DEFAULT_PRIVACY: PrivacySettings = {
  profile_visibility: 'public',
  activity_visibility: 'public',
  show_listening: true
};

export default function ProfileEditor({
  initialBio = '',
  initialStatus = '',
  initialPrivacy = DEFAULT_PRIVACY,
  onUpdate
}: ProfileEditorProps) {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [customStatus, setCustomStatus] = useState(initialStatus);
  const [privacy, setPrivacy] = useState<PrivacySettings>(initialPrivacy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = async () => {
    if (!session?.user?.email) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio,
          customStatus,
          privacySettings: privacy
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message || 'Profile updated successfully!');
        setIsEditing(false);
        onUpdate?.();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setBio(initialBio);
    setCustomStatus(initialStatus);
    setPrivacy(initialPrivacy);
    setIsEditing(false);
    setError('');
  };

  if (!session) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Profile Settings
        </h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Bio */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Bio
        </label>
        {isEditing ? (
          <div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Tell others about yourself, your music taste, favorite genres..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {bio.length}/500 characters
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {bio || <span className="italic text-gray-400">No bio yet</span>}
          </p>
        )}
      </div>

      {/* Custom Status */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Custom Status
        </label>
        {isEditing ? (
          <div>
            <input
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              maxLength={100}
              placeholder="e.g., Vibing to indie rock 🎸"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {customStatus.length}/100 characters
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {customStatus || <span className="italic text-gray-400">No status set</span>}
          </p>
        )}
      </div>

      {/* Privacy Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Privacy Settings
        </h4>

        {/* Profile Visibility */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Profile Visibility
          </label>
          {isEditing ? (
            <select
              value={privacy.profile_visibility}
              onChange={(e) => setPrivacy(prev => ({
                ...prev,
                profile_visibility: e.target.value as 'public' | 'friends' | 'private'
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="public">Public - Everyone can view your profile</option>
              <option value="friends">Friends Only - Only friends can view</option>
              <option value="private">Private - Only you can view</option>
            </select>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
              {privacy.profile_visibility}
            </p>
          )}
        </div>

        {/* Activity Visibility */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Activity Visibility
          </label>
          {isEditing ? (
            <select
              value={privacy.activity_visibility}
              onChange={(e) => setPrivacy(prev => ({
                ...prev,
                activity_visibility: e.target.value as 'public' | 'friends' | 'private'
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="public">Public - Everyone can see your activity</option>
              <option value="friends">Friends Only - Only friends can see</option>
              <option value="private">Private - Only you can see</option>
            </select>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
              {privacy.activity_visibility}
            </p>
          )}
        </div>

        {/* Show Listening */}
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Show Current Listening
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Display what you're currently listening to on Spotify
            </p>
          </div>
          {isEditing ? (
            <button
              onClick={() => setPrivacy(prev => ({ ...prev, show_listening: !prev.show_listening }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacy.show_listening ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacy.show_listening ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          ) : (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {privacy.show_listening ? 'Enabled' : 'Disabled'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
