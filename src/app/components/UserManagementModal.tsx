'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface ConnectedUser {
  id: string;
  name: string;
  avatar_url?: string;
  isHost: boolean;
  joinedAt?: string;
}

interface BannedUser {
  id: string;
  user_id: string;
  ban_type: 'kick' | 'ban';
  reason?: string;
  created_at: string;
  user: {
    name: string;
    avatar_url?: string;
  };
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  connectedUsers: ConnectedUser[];
  isHost: boolean;
  onKickUser: (userId: string, reason?: string, banType?: 'kick' | 'ban') => void;
  onTransferHost: (userId: string) => void;
}

export default function UserManagementModal({
  isOpen,
  onClose,
  roomId,
  connectedUsers,
  isHost,
  onKickUser,
  onTransferHost
}: UserManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'banned'>('users');
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [kickingUser, setKickingUser] = useState<string | null>(null);
  const [kickReason, setKickReason] = useState('');
  const [kickType, setKickType] = useState<'kick' | 'ban'>('kick');

  const fetchBannedUsers = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/banned`);
      if (response.ok) {
        const data = await response.json();
        setBannedUsers(data);
      }
    } catch (error) {
      console.error('Error fetching banned users:', error);
    }
  }, [roomId]);

  useEffect(() => {
    if (isOpen && isHost) {
      fetchBannedUsers();
    }
  }, [isOpen, isHost, fetchBannedUsers]);

  const handleKickUser = async (userId: string) => {
    if (!kickReason.trim() && kickType === 'ban') {
      alert('Please provide a reason for banning this user.');
      return;
    }

    try {
      onKickUser(userId, kickReason.trim() || undefined, kickType);
      setKickingUser(null);
      setKickReason('');
      setKickType('kick');
      
      if (kickType === 'ban') {
        await fetchBannedUsers(); // Refresh banned users list
      }
    } catch (error) {
      console.error('Error kicking user:', error);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/unban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        await fetchBannedUsers(); // Refresh the list
      } else {
        alert('Failed to unban user');
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Failed to unban user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Room Users
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            Connected Users ({connectedUsers.length})
          </button>
          {isHost && (
            <button
              onClick={() => setActiveTab('banned')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'banned'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              Banned Users ({bannedUsers.length})
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'users' ? (
            <div className="space-y-3">
              {connectedUsers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No users connected
                </p>
              ) : (
                connectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-600 dark:to-gray-500 rounded-full flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                          {user.isHost && (
                            <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                              Host
                            </span>
                          )}
                        </h4>
                        {user.joinedAt && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Joined {new Date(user.joinedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {isHost && !user.isHost && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onTransferHost(user.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                          title="Transfer host"
                        >
                          👑
                        </button>
                        <button
                          onClick={() => setKickingUser(user.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                        >
                          Kick
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {bannedUsers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No banned users
                </p>
              ) : (
                bannedUsers.map((ban) => (
                  <div key={ban.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-800 dark:to-red-700 rounded-full flex items-center justify-center overflow-hidden">
                        {ban.user.avatar_url ? (
                          <Image
                            src={ban.user.avatar_url}
                            alt={ban.user.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {ban.user.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {ban.ban_type === 'ban' ? 'Banned' : 'Kicked'} • {new Date(ban.created_at).toLocaleDateString()}
                        </p>
                        {ban.reason && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Reason: {ban.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnbanUser(ban.user_id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                    >
                      Unban
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Kick User Modal */}
        {kickingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Kick User
              </h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Action
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="kick"
                      checked={kickType === 'kick'}
                      onChange={(e) => setKickType(e.target.value as 'kick')}
                      className="text-indigo-600"
                    />
                    <span className="text-sm">Kick (can rejoin)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="ban"
                      checked={kickType === 'ban'}
                      onChange={(e) => setKickType(e.target.value as 'ban')}
                      className="text-indigo-600"
                    />
                    <span className="text-sm">Ban (cannot rejoin)</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="kickReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason {kickType === 'ban' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  id="kickReason"
                  value={kickReason}
                  onChange={(e) => setKickReason(e.target.value)}
                  placeholder="Enter reason for kick/ban..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setKickingUser(null);
                    setKickReason('');
                    setKickType('kick');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleKickUser(kickingUser)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  {kickType === 'ban' ? 'Ban User' : 'Kick User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}