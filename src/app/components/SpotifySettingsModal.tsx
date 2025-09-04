'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface SpotifySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface SpotifySettings {
  auto_refresh_enabled: boolean;
  refresh_frequency: 'daily' | 'weekly' | 'manual';
  privacy_level: 'public' | 'friends' | 'private';
  time_range_preference: 'short_term' | 'medium_term' | 'long_term';
  show_genres: boolean;
  show_last_updated: boolean;
}

const DEFAULT_SETTINGS: SpotifySettings = {
  auto_refresh_enabled: true,
  refresh_frequency: 'daily',
  privacy_level: 'public',
  time_range_preference: 'medium_term',
  show_genres: true,
  show_last_updated: true
};

export default function SpotifySettingsModal({ 
  isOpen, 
  onClose, 
  userId 
}: SpotifySettingsModalProps) {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<SpotifySettings>(DEFAULT_SETTINGS);
  const [isLoading, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load user settings (this would typically come from an API)
  useEffect(() => {
    if (isOpen && session && userId === session.user?.id) {
      // TODO: Load actual user settings from API
      // For now, use localStorage as a demo
      const savedSettings = localStorage.getItem(`spotify-settings-${userId}`);
      if (savedSettings) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
        } catch (error) {
          console.warn('Failed to load settings:', error);
        }
      }
    }
  }, [isOpen, session, userId]);

  const handleSettingChange = <K extends keyof SpotifySettings>(
    key: K,
    value: SpotifySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // TODO: Save settings to API
      // For now, use localStorage as a demo
      localStorage.setItem(`spotify-settings-${userId}`, JSON.stringify(settings));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Spotify Top 3s Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Customize how your listening data is displayed and updated
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Auto Refresh Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                🔄 Auto Refresh
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Control how often your Top 3s are automatically updated from Spotify
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Enable Auto Refresh
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatically update your stats based on your listening activity
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_refresh_enabled}
                  onChange={(e) => handleSettingChange('auto_refresh_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {settings.auto_refresh_enabled && (
              <div className="ml-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Refresh Frequency
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'daily' as const, label: 'Daily', desc: 'Update every day' },
                    { value: 'weekly' as const, label: 'Weekly', desc: 'Update weekly' },
                    { value: 'manual' as const, label: 'Manual', desc: 'Only when requested' }
                  ].map(option => (
                    <label
                      key={option.value}
                      className={`relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        settings.refresh_frequency === option.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="refresh_frequency"
                        value={option.value}
                        checked={settings.refresh_frequency === option.value}
                        onChange={(e) => handleSettingChange('refresh_frequency', e.target.value as any)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {option.desc}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                🔒 Privacy
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Control who can see your Top 3s on your profile
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Who can see your Top 3s
              </label>
              <div className="space-y-3">
                {[
                  { value: 'public' as const, label: 'Public', desc: 'Everyone can see your Top 3s', icon: '🌍' },
                  { value: 'friends' as const, label: 'Friends Only', desc: 'Only your friends can see your Top 3s', icon: '👥' },
                  { value: 'private' as const, label: 'Private', desc: 'Only you can see your Top 3s', icon: '🔒' }
                ].map(option => (
                  <label
                    key={option.value}
                    className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      settings.privacy_level === option.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="privacy_level"
                      value={option.value}
                      checked={settings.privacy_level === option.value}
                      onChange={(e) => handleSettingChange('privacy_level', e.target.value as any)}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{option.icon}</span>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {option.desc}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                🎨 Display
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Customize how your Top 3s are displayed
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Show Genres Section
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Display your top music genres
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.show_genres}
                    onChange={(e) => handleSettingChange('show_genres', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Show Last Updated Time
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Display when your stats were last refreshed
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.show_last_updated}
                    onChange={(e) => handleSettingChange('show_last_updated', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <button
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Reset to Defaults
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                hasChanges && !isLoading
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}