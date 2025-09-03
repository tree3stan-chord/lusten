'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface UserAvatarData {
  avatar_url: string | null;
  updated_at: string | null;
}

export function useUserAvatar() {
  const { data: session } = useSession();
  const [avatarData, setAvatarData] = useState<UserAvatarData>({ avatar_url: null, updated_at: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch current avatar data
  const fetchAvatar = useCallback(async () => {
    if (!session?.user) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/avatar');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch avatar');
      }

      setAvatarData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch avatar');
      console.error('Avatar fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Update avatar
  const updateAvatar = useCallback(async (avatarUrl: string) => {
    setAvatarData(prev => ({
      ...prev,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    }));
  }, []);

  // Delete avatar
  const deleteAvatar = useCallback(async () => {
    setAvatarData({
      avatar_url: null,
      updated_at: null
    });
  }, []);

  // Load avatar data when session is available
  useEffect(() => {
    if (session?.user) {
      fetchAvatar();
    } else {
      setAvatarData({ avatar_url: null, updated_at: null });
    }
  }, [session, fetchAvatar]);

  return {
    avatarUrl: avatarData.avatar_url,
    updatedAt: avatarData.updated_at,
    isLoading,
    error,
    updateAvatar,
    deleteAvatar,
    refetch: fetchAvatar,
  };
}