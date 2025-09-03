'use client';

import { useSession, getSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { spotifyApi } from '../../lib/spotify-api-client';

interface SessionHealthState {
  isHealthy: boolean;
  isChecking: boolean;
  lastCheck: number | null;
  reconnectAttempts: number;
  connectionState: 'connected' | 'reconnecting' | 'disconnected' | 'error';
}

interface UseSessionHealthOptions {
  checkInterval?: number; // How often to check session health (ms)
  preemptiveRefreshTime?: number; // Refresh token X seconds before expiry
  maxReconnectAttempts?: number;
  onConnectionStateChange?: (state: SessionHealthState['connectionState']) => void;
  onHealthChange?: (isHealthy: boolean) => void;
}

export const useSessionHealth = (options: UseSessionHealthOptions = {}) => {
  const { data: session, update: updateSession } = useSession();
  const {
    checkInterval = 60000, // Check every minute
    preemptiveRefreshTime = 300000, // Refresh 5 minutes before expiry
    maxReconnectAttempts = 5,
    onConnectionStateChange,
    onHealthChange
  } = options;

  const [healthState, setHealthState] = useState<SessionHealthState>({
    isHealthy: false,
    isChecking: false,
    lastCheck: null,
    reconnectAttempts: 0,
    connectionState: 'disconnected'
  });

  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isCheckingRef = useRef(false);

  /**
   * Update health state and notify listeners
   */
  const updateHealthState = useCallback((updates: Partial<SessionHealthState>) => {
    setHealthState(prev => {
      const newState = { ...prev, ...updates };
      
      // Notify about connection state changes
      if (prev.connectionState !== newState.connectionState && onConnectionStateChange) {
        onConnectionStateChange(newState.connectionState);
      }

      // Notify about health changes
      if (prev.isHealthy !== newState.isHealthy && onHealthChange) {
        onHealthChange(newState.isHealthy);
      }

      return newState;
    });
  }, [onConnectionStateChange, onHealthChange]);

  /**
   * Check if token needs preemptive refresh
   */
  const needsPreemptiveRefresh = useCallback((session: { accessToken?: string; expiresAt?: number | string }): boolean => {
    if (!session?.accessToken || !session?.expiresAt) {
      return false;
    }

    const now = Date.now();
    const expiresAt = typeof session.expiresAt === 'number' 
      ? session.expiresAt * 1000 
      : parseInt(session.expiresAt) * 1000;
    
    const timeUntilExpiry = expiresAt - now;
    
    console.log('useSessionHealth: Token check:', {
      timeUntilExpiry: Math.floor(timeUntilExpiry / 1000),
      preemptiveRefreshTime: preemptiveRefreshTime / 1000,
      needsRefresh: timeUntilExpiry < preemptiveRefreshTime
    });

    return timeUntilExpiry < preemptiveRefreshTime;
  }, [preemptiveRefreshTime]);

  /**
   * Perform session health check
   */
  const checkSessionHealth = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current) {
      console.log('useSessionHealth: Health check already in progress');
      return healthState.isHealthy;
    }

    isCheckingRef.current = true;
    updateHealthState({ isChecking: true });

    try {
      console.log('useSessionHealth: Starting health check...');

      // Get current session
      const currentSession = await getSession();
      
      if (!(currentSession as unknown as { accessToken?: string })?.accessToken) {
        console.log('useSessionHealth: No session or access token');
        updateHealthState({
          isHealthy: false,
          connectionState: 'disconnected',
          isChecking: false,
          lastCheck: Date.now()
        });
        return false;
      }

      // Check if we need preemptive refresh
      if (currentSession && needsPreemptiveRefresh(currentSession as unknown as { accessToken?: string; expiresAt?: number | string })) {
        console.log('useSessionHealth: Performing preemptive token refresh...');
        updateHealthState({ connectionState: 'reconnecting' });
        
        try {
          // Trigger session refresh
          await updateSession();
          console.log('useSessionHealth: Preemptive refresh successful');
          
          // Get the updated session
          const refreshedSession = await getSession();
          if (!(refreshedSession as unknown as { accessToken?: string })?.accessToken) {
            throw new Error('Session refresh failed - no new token');
          }
        } catch (error) {
          console.error('useSessionHealth: Preemptive refresh failed:', error);
          updateHealthState({
            isHealthy: false,
            connectionState: 'error',
            isChecking: false,
            lastCheck: Date.now(),
            reconnectAttempts: healthState.reconnectAttempts + 1
          });
          return false;
        }
      }

      // Test the session health with a real API call
      const isHealthy = await spotifyApi.checkSessionHealth();

      if (isHealthy) {
        console.log('useSessionHealth: Session is healthy');
        updateHealthState({
          isHealthy: true,
          connectionState: 'connected',
          isChecking: false,
          lastCheck: Date.now(),
          reconnectAttempts: 0 // Reset on successful connection
        });
        return true;
      } else {
        console.log('useSessionHealth: Session health check failed');
        
        const newAttempts = healthState.reconnectAttempts + 1;
        const connectionState = newAttempts >= maxReconnectAttempts ? 'error' : 'reconnecting';
        
        updateHealthState({
          isHealthy: false,
          connectionState,
          isChecking: false,
          lastCheck: Date.now(),
          reconnectAttempts: newAttempts
        });
        return false;
      }

    } catch (error) {
      console.error('useSessionHealth: Health check error:', error);
      
      const newAttempts = healthState.reconnectAttempts + 1;
      const connectionState = newAttempts >= maxReconnectAttempts ? 'error' : 'reconnecting';
      
      updateHealthState({
        isHealthy: false,
        connectionState,
        isChecking: false,
        lastCheck: Date.now(),
        reconnectAttempts: newAttempts
      });
      return false;
    } finally {
      isCheckingRef.current = false;
    }
  }, [healthState, updateHealthState, needsPreemptiveRefresh, updateSession, maxReconnectAttempts]);

  /**
   * Manual recovery attempt
   */
  const attemptRecovery = useCallback(async (): Promise<boolean> => {
    console.log('useSessionHealth: Manual recovery attempt...');
    updateHealthState({ 
      reconnectAttempts: 0,
      connectionState: 'reconnecting'
    });
    
    return await checkSessionHealth();
  }, [checkSessionHealth, updateHealthState]);

  /**
   * Reset error state and try again
   */
  const resetErrorState = useCallback(() => {
    console.log('useSessionHealth: Resetting error state...');
    updateHealthState({
      reconnectAttempts: 0,
      connectionState: 'disconnected'
    });
  }, [updateHealthState]);

  // Set up periodic health checks
  useEffect(() => {
    if (!(session as unknown as { accessToken?: string })?.accessToken) {
      updateHealthState({
        isHealthy: false,
        connectionState: 'disconnected'
      });
      return;
    }

    // Initial health check
    checkSessionHealth();

    // Set up interval for periodic checks
    intervalRef.current = setInterval(() => {
      if (!isCheckingRef.current) {
        checkSessionHealth();
      }
    }, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session, checkInterval, checkSessionHealth, updateHealthState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...healthState,
    checkSessionHealth,
    attemptRecovery,
    resetErrorState,
    // Convenience computed properties
    canRetry: healthState.reconnectAttempts < maxReconnectAttempts,
    isConnected: healthState.connectionState === 'connected',
    isReconnecting: healthState.connectionState === 'reconnecting',
    hasError: healthState.connectionState === 'error'
  };
};