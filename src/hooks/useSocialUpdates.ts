'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import type { UserWithStatus } from '../lib/sqlite-db';

interface FriendRequest {
  friendship: {
    id: string;
    status: 'pending' | 'accepted';
  };
  user: UserWithStatus;
}

interface SocialData {
  friends: UserWithStatus[];
  activeUsers: UserWithStatus[];
  pendingRequests: FriendRequest[];
}

export function useSocialUpdates() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socialData, setSocialData] = useState<SocialData>({
    friends: [],
    activeUsers: [],
    pendingRequests: []
  });
  const [loading, setLoading] = useState(true);

  // Fetch initial social data
  const fetchSocialData = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      
      // Fetch all social data in parallel
      const [friendsResponse, activeResponse, requestsResponse] = await Promise.all([
        fetch('/api/friends/list'),
        fetch('/api/social/active'),
        fetch('/api/friends/pending')
      ]);

      const [friendsData, activeData, requestsData] = await Promise.all([
        friendsResponse.ok ? friendsResponse.json() : [],
        activeResponse.ok ? activeResponse.json() : [],
        requestsResponse.ok ? requestsResponse.json() : []
      ]);

      setSocialData({
        friends: friendsData,
        activeUsers: activeData,
        pendingRequests: requestsData
      });
    } catch (error) {
      console.error('Error fetching social data:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Update active users list
  const refreshActiveUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/social/active');
      if (response.ok) {
        const activeData = await response.json();
        setSocialData(prev => ({ ...prev, activeUsers: activeData }));
      }
    } catch (error) {
      console.error('Error refreshing active users:', error);
    }
  }, []);

  // Socket connection and real-time updates
  useEffect(() => {
    if (!session?.user || !(session.user as { id?: string }).id) return;

    const socketConnection = io();
    setSocket(socketConnection);

    // Authenticate with socket for status tracking
    socketConnection.emit('user-authenticate', { userId: (session.user as { id?: string }).id });

    // Listen for user status changes
    socketConnection.on('user-status-changed', ({ userId, status }) => {
      console.log(`User ${userId} status changed:`, status);
      refreshActiveUsers(); // Refresh the entire active users list
    });

    // Listen for user coming online/offline
    socketConnection.on('user-offline', ({ userId }) => {
      console.log(`User ${userId} went offline`);
      setSocialData(prev => ({
        ...prev,
        activeUsers: prev.activeUsers.filter(user => user.spotify_id !== userId)
      }));
    });

    // Listen for room changes
    socketConnection.on('user-room-changed', ({ userId, roomId, action }) => {
      console.log(`User ${userId} ${action}ed room ${roomId}`);
      refreshActiveUsers(); // Refresh to show updated room status
    });

    return () => {
      socketConnection.disconnect();
      setSocket(null);
    };
  }, [session, refreshActiveUsers]);

  // Initial data fetch
  useEffect(() => {
    fetchSocialData();
  }, [fetchSocialData]);

  // Broadcast status updates when user changes visibility
  const broadcastStatusUpdate = useCallback((status: Record<string, string | boolean | null>) => {
    const userId = (session?.user as { id?: string })?.id;
    if (socket && userId) {
      socket.emit('user-status-update', { userId, status });
    }
  }, [socket, session]);

  // Broadcast room join/leave
  const broadcastRoomUpdate = useCallback((roomId: string | null, action: 'join' | 'leave') => {
    const userId = (session?.user as { id?: string })?.id;
    if (socket && userId) {
      socket.emit('user-room-update', { 
        userId, 
        roomId, 
        action 
      });
    }
  }, [socket, session]);

  return {
    ...socialData,
    loading,
    refreshData: fetchSocialData,
    refreshActiveUsers,
    broadcastStatusUpdate,
    broadcastRoomUpdate,
    socket
  };
}