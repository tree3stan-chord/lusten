'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ReportUserModal from './ReportUserModal';

interface UserActionsMenuProps {
  userId: string;
  userName: string;
  onBlock?: () => void;
  onUnblock?: () => void;
  onReport?: () => void;
}

export default function UserActionsMenu({
  userId,
  userName,
  onBlock,
  onUnblock,
  onReport
}: UserActionsMenuProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if user is blocked
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!session?.user?.id || userId === session.user.id) return;

      try {
        const response = await fetch(`/api/users/${userId}/is-blocked`);
        if (response.ok) {
          const data = await response.json();
          setIsBlocked(data.blocked);
        }
      } catch (error) {
        console.error('Failed to check block status:', error);
      }
    };

    checkBlockStatus();
  }, [session, userId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't show menu for own profile
  if (!session || userId === session.user?.id) {
    return null;
  }

  const handleBlock = async () => {
    if (!confirm(`Are you sure you want to block ${userName}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: null })
      });

      if (response.ok) {
        setIsBlocked(true);
        setIsOpen(false);
        onBlock?.();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to block user');
      }
    } catch (error) {
      console.error('Failed to block user:', error);
      alert('Failed to block user');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!confirm(`Are you sure you want to unblock ${userName}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/unblock`, {
        method: 'POST'
      });

      if (response.ok) {
        setIsBlocked(false);
        setIsOpen(false);
        onUnblock?.();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Failed to unblock user:', error);
      alert('Failed to unblock user');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = () => {
    setIsOpen(false);
    setShowReportModal(true);
    onReport?.();
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="User actions"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="py-1">
              {isBlocked ? (
                <button
                  onClick={handleUnblock}
                  disabled={loading}
                  className="w-full text-left px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Unblock User
                </button>
              ) : (
                <button
                  onClick={handleBlock}
                  disabled={loading}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Block User
                </button>
              )}

              <button
                onClick={handleReport}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Report User
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportUserModal
          userId={userId}
          userName={userName}
          onClose={() => setShowReportModal(false)}
          onSuccess={onReport}
        />
      )}
    </>
  );
}
