'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface StatusSelectorProps {
  className?: string;
  showLabel?: boolean;
}

const statusConfig = {
  online: {
    label: 'Online',
    icon: '🟢',
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/20'
  },
  idle: {
    label: 'Idle',
    icon: '🟡',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
  },
  dnd: {
    label: 'Do Not Disturb',
    icon: '🔴',
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/20'
  },
  invisible: {
    label: 'Invisible',
    icon: '⚫',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20'
  }
};

export default function StatusSelector({ className = '', showLabel = true }: StatusSelectorProps) {
  const { data: session } = useSession();
  const [currentStatus, setCurrentStatus] = useState<keyof typeof statusConfig>('online');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchCurrentStatus();
    }
  }, [session]);

  const fetchCurrentStatus = async () => {
    try {
      const response = await fetch('/api/user/visibility');
      if (response.ok) {
        const data = await response.json();
        setCurrentStatus(data.visibility || 'online');
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const updateStatus = async (newStatus: keyof typeof statusConfig) => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newStatus })
      });

      if (response.ok) {
        setCurrentStatus(newStatus);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) return null;

  const current = statusConfig[currentStatus];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${current.bgColor}`}
        disabled={loading}
      >
        <span className="text-sm">{current.icon}</span>
        {showLabel && (
          <span className={`text-sm font-medium ${current.color}`}>
            {current.label}
          </span>
        )}
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            {Object.entries(statusConfig).map(([status, config]) => (
              <button
                key={status}
                onClick={() => updateStatus(status as keyof typeof statusConfig)}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  status === currentStatus ? 'bg-gray-50 dark:bg-gray-700' : ''
                }`}
                disabled={loading}
              >
                <span className="text-sm">{config.icon}</span>
                <span className={`text-sm ${config.color}`}>{config.label}</span>
                {status === currentStatus && (
                  <svg className="w-4 h-4 text-indigo-600 ml-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentStatus === 'invisible' 
                ? "You won't appear in the active users feed" 
                : "You'll appear as active to other users"
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}