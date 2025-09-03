'use client';

import { Session } from 'next-auth';
import { signOut, getSession } from 'next-auth/react';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

interface SpotifyApiOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  timeout?: number;
  skipRetry?: boolean;
}

class SpotifyApiClient {
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second base delay
    maxDelay: 8000, // 8 seconds max delay
    retryableStatuses: [401, 429, 500, 502, 503, 504] // Auth failures, rate limits, server errors
  };

  private isRefreshingToken = false;
  private pendingRequests: Array<() => void> = [];

  constructor(private retryConfig: RetryConfig = {}) {
    this.retryConfig = { ...this.defaultRetryConfig, ...retryConfig };
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(exponentialDelay + jitter, this.retryConfig.maxDelay);
    return delay;
  }

  /**
   * Check if the response status is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return this.retryConfig.retryableStatuses.includes(status);
  }

  /**
   * Refresh the current session to get a new token
   */
  private async refreshSession(): Promise<Session | null> {
    if (this.isRefreshingToken) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve) => {
        this.pendingRequests.push(() => {
          getSession().then(resolve).catch(() => resolve(null));
        });
      });
    }

    this.isRefreshingToken = true;

    try {
      console.log('SpotifyApiClient: Refreshing session...');
      
      // Force session refresh by getting a new session
      const newSession = await getSession();
      
      // Notify all pending requests that refresh is complete
      const callbacks = [...this.pendingRequests];
      this.pendingRequests = [];
      callbacks.forEach(callback => callback());
      
      console.log('SpotifyApiClient: Session refreshed successfully');
      return newSession;
    } catch (error) {
      console.error('SpotifyApiClient: Failed to refresh session:', error);
      
      // If session refresh fails completely, sign out user
      await signOut({ redirect: false });
      return null;
    } finally {
      this.isRefreshingToken = false;
    }
  }

  /**
   * Make a request to Spotify API with automatic retry and token refresh
   */
  async request(
    url: string, 
    options: SpotifyApiOptions = {},
    session?: Session | null
  ): Promise<Response> {
    const { 
      method = 'GET', 
      body, 
      headers = {}, 
      timeout = 10000,
      skipRetry = false 
    } = options;

    // Get current session if not provided
    let currentSession = session || await getSession();
    
    if (!currentSession?.accessToken) {
      throw new Error('No valid session or access token available');
    }

    const makeRequest = async (attempt: number): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const requestHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(currentSession as Session & { accessToken: string })?.accessToken}`,
          ...headers
        };

        console.log(`SpotifyApiClient: Making request (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}) to ${url}`);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Handle successful responses
        if (response.ok) {
          if (attempt > 0) {
            console.log(`SpotifyApiClient: Request succeeded after ${attempt + 1} attempts`);
          }
          return response;
        }

        // Handle specific error cases
        if (response.status === 401) {
          console.log('SpotifyApiClient: Token expired, refreshing session...');
          
          // Try to refresh the session
          const newSession = await this.refreshSession();
          if (newSession?.accessToken) {
            currentSession = newSession;
            
            // Retry the request with the new token
            if (!skipRetry && attempt < this.retryConfig.maxRetries) {
              const delay = this.calculateDelay(attempt);
              console.log(`SpotifyApiClient: Retrying in ${delay}ms with new token...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return makeRequest(attempt + 1);
            }
          } else {
            throw new Error('Authentication failed: Unable to refresh token');
          }
        }

        if (response.status === 429) {
          // Rate limited - check for Retry-After header
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.calculateDelay(attempt);
          
          console.log(`SpotifyApiClient: Rate limited, retrying in ${delay}ms...`);
          
          if (!skipRetry && attempt < this.retryConfig.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequest(attempt + 1);
          }
        }

        // Handle other retryable errors
        if (this.isRetryableStatus(response.status) && !skipRetry && attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.log(`SpotifyApiClient: Retryable error ${response.status}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(attempt + 1);
        }

        // If we can't retry or max retries reached, return the response
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`SpotifyApiClient: Request failed with status ${response.status}:`, errorText);
        return response;

      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.error(`SpotifyApiClient: Request timed out after ${timeout}ms`);
          throw new Error(`Request timeout after ${timeout}ms`);
        }

        // Network errors - retry if possible
        if (!skipRetry && attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.log(`SpotifyApiClient: Network error, retrying in ${delay}ms...`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(attempt + 1);
        }

        console.error('SpotifyApiClient: Request failed:', error);
        throw error;
      }
    };

    return makeRequest(0);
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  async get(url: string, session?: Session | null): Promise<Response> {
    return this.request(url, { method: 'GET' }, session);
  }

  async post(url: string, data?: unknown, session?: Session | null): Promise<Response> {
    return this.request(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }, session);
  }

  async put(url: string, data?: unknown, session?: Session | null): Promise<Response> {
    return this.request(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }, session);
  }

  async delete(url: string, session?: Session | null): Promise<Response> {
    return this.request(url, { method: 'DELETE' }, session);
  }

  /**
   * Check if the current session is healthy
   */
  async checkSessionHealth(session?: Session | null): Promise<boolean> {
    try {
      const currentSession = session || await getSession();
      if (!currentSession?.accessToken) {
        return false;
      }

      // Make a simple API call to check token validity
      const response = await this.request(
        'https://api.spotify.com/v1/me',
        { skipRetry: true, timeout: 5000 },
        currentSession
      );

      return response.ok;
    } catch (error) {
      console.error('SpotifyApiClient: Session health check failed:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const spotifyApi = new SpotifyApiClient();

// Export types for use in other files
export type { SpotifyApiOptions, RetryConfig };
export { SpotifyApiClient };