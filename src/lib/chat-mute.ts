/**
 * Chat Muting Utility
 * Manages muted users for chat messages using localStorage
 * This is a client-side only feature for hiding messages from specific users
 */

const MUTED_USERS_KEY = 'lusten_muted_users';

export interface MutedUser {
  userId: string;
  userName: string;
  mutedAt: string;
  reason?: string;
}

/**
 * Get all muted users from localStorage
 */
export function getMutedUsers(): MutedUser[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(MUTED_USERS_KEY);
    if (!stored) return [];

    const muted = JSON.parse(stored) as MutedUser[];
    return Array.isArray(muted) ? muted : [];
  } catch (error) {
    console.error('Failed to get muted users:', error);
    return [];
  }
}

/**
 * Check if a user is muted
 */
export function isUserMuted(userId: string): boolean {
  const mutedUsers = getMutedUsers();
  return mutedUsers.some(mu => mu.userId === userId);
}

/**
 * Mute a user (add to muted list)
 */
export function muteUser(userId: string, userName: string, reason?: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const mutedUsers = getMutedUsers();

    // Don't add if already muted
    if (mutedUsers.some(mu => mu.userId === userId)) {
      return false;
    }

    const newMute: MutedUser = {
      userId,
      userName,
      mutedAt: new Date().toISOString(),
      reason
    };

    mutedUsers.push(newMute);
    localStorage.setItem(MUTED_USERS_KEY, JSON.stringify(mutedUsers));

    // Dispatch custom event for other components to react
    window.dispatchEvent(new CustomEvent('muteListChanged', { detail: { userId, action: 'mute' } }));

    return true;
  } catch (error) {
    console.error('Failed to mute user:', error);
    return false;
  }
}

/**
 * Unmute a user (remove from muted list)
 */
export function unmuteUser(userId: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const mutedUsers = getMutedUsers();
    const filtered = mutedUsers.filter(mu => mu.userId !== userId);

    if (filtered.length === mutedUsers.length) {
      return false; // User wasn't muted
    }

    localStorage.setItem(MUTED_USERS_KEY, JSON.stringify(filtered));

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('muteListChanged', { detail: { userId, action: 'unmute' } }));

    return true;
  } catch (error) {
    console.error('Failed to unmute user:', error);
    return false;
  }
}

/**
 * Clear all muted users
 */
export function clearAllMutes(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(MUTED_USERS_KEY);
    window.dispatchEvent(new CustomEvent('muteListChanged', { detail: { action: 'clear' } }));
    return true;
  } catch (error) {
    console.error('Failed to clear mutes:', error);
    return false;
  }
}

/**
 * Get mute count
 */
export function getMutedCount(): number {
  return getMutedUsers().length;
}
