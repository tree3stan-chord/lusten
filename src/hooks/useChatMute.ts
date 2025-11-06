import { useState, useEffect, useCallback } from 'react';
import {
  getMutedUsers,
  isUserMuted,
  muteUser,
  unmuteUser,
  clearAllMutes,
  getMutedCount,
  type MutedUser
} from '../lib/chat-mute';

/**
 * React hook for managing chat muting
 * Provides mute state and actions with automatic reactivity
 */
export function useChatMute() {
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [mutedCount, setMutedCount] = useState(0);

  // Load initial muted users
  useEffect(() => {
    setMutedUsers(getMutedUsers());
    setMutedCount(getMutedCount());
  }, []);

  // Listen for mute list changes
  useEffect(() => {
    const handleMuteListChange = () => {
      setMutedUsers(getMutedUsers());
      setMutedCount(getMutedCount());
    };

    window.addEventListener('muteListChanged', handleMuteListChange);

    return () => {
      window.removeEventListener('muteListChanged', handleMuteListChange);
    };
  }, []);

  const mute = useCallback((userId: string, userName: string, reason?: string) => {
    const success = muteUser(userId, userName, reason);
    if (success) {
      setMutedUsers(getMutedUsers());
      setMutedCount(getMutedCount());
    }
    return success;
  }, []);

  const unmute = useCallback((userId: string) => {
    const success = unmuteUser(userId);
    if (success) {
      setMutedUsers(getMutedUsers());
      setMutedCount(getMutedCount());
    }
    return success;
  }, []);

  const clearAll = useCallback(() => {
    const success = clearAllMutes();
    if (success) {
      setMutedUsers([]);
      setMutedCount(0);
    }
    return success;
  }, []);

  const isMuted = useCallback((userId: string) => {
    return isUserMuted(userId);
  }, [mutedUsers]);

  return {
    mutedUsers,
    mutedCount,
    mute,
    unmute,
    clearAll,
    isMuted
  };
}
