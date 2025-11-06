'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any> | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!session?.user?.email) return;

    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!session?.user?.email) return;

    try {
      const response = await fetch('/api/notifications/unread-count');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // Initialize Socket.io for real-time notifications
  useEffect(() => {
    if (!session?.user?.email) return;

    const socketConnection = io();
    setSocket(socketConnection);

    // Subscribe to notifications
    socketConnection.emit('subscribe-notifications', { userId: session.user.email });

    // Listen for new notifications
    socketConnection.on('notification', (notification: Notification) => {
      console.log('Received notification:', notification);
      setNotifications(prev => [notification, ...prev].slice(0, 10));
      setUnreadCount(prev => prev + 1);

      // Optional: Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon.svg'
        });
      }
    });

    return () => {
      socketConnection.disconnect();
    };
  }, [session]);

  // Initial fetch
  useEffect(() => {
    if (session?.user?.email) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [session]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!session?.user?.email) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (!session) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6 text-gray-700 dark:text-gray-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors ${
                      notification.is_read
                        ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        : 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon based on type */}
                      <div className="flex-shrink-0 mt-1">
                        {notification.type === 'friend_request' && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        )}
                        {notification.type === 'friend_accepted' && (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {notification.type === 'mention' && (
                          <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                        {!['friend_request', 'friend_accepted', 'mention'].includes(notification.type) && (
                          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                router.push('/notifications');
                setIsOpen(false);
              }}
              className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
