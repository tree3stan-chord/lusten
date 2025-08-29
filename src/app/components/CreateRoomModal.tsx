'use client';

import { useState } from 'react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomName: string, roomType: 'private' | 'public' | 'profile') => void;
}

export default function CreateRoomModal({ isOpen, onClose, onCreateRoom }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<'private' | 'public' | 'profile'>('private');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      onCreateRoom(roomName.trim(), roomType);
      setRoomName('');
      setRoomType('private');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Room</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Room Name
            </label>
            <input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Room Type
            </label>
            <div className="space-y-3">
              {/* Private Room */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  value="private"
                  checked={roomType === 'private'}
                  onChange={(e) => setRoomType(e.target.value as 'private')}
                  className="mt-1 text-indigo-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">🔒 Private</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Only people with the link can join</div>
                </div>
              </label>
              
              {/* Public Room */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  value="public"
                  checked={roomType === 'public'}
                  onChange={(e) => setRoomType(e.target.value as 'public')}
                  className="mt-1 text-indigo-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">🌍 Public</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Discoverable on homepage (temporary)</div>
                </div>
              </label>
              
              {/* Profile Room */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  value="profile"
                  checked={roomType === 'profile'}
                  onChange={(e) => setRoomType(e.target.value as 'profile')}
                  className="mt-1 text-indigo-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">👤 My Profile Room</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Persistent room on your profile (replaces existing)</div>
                </div>
              </label>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!roomName.trim()}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}