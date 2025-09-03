'use client';

import { useState, useEffect } from 'react';
import type { Room } from '../../lib/sqlite-db';

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onUpdateRoom: (updates: Partial<Room>) => void;
  onDeleteRoom: () => void;
  isOwner: boolean;
}

export default function EditRoomModal({ 
  isOpen, 
  onClose, 
  room, 
  onUpdateRoom, 
  onDeleteRoom,
  isOwner 
}: EditRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [roomType, setRoomType] = useState<'private' | 'public' | 'profile'>('private');
  const [maxUsers, setMaxUsers] = useState(50);
  const [password, setPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form with room data
  useEffect(() => {
    if (room && isOpen) {
      setRoomName(room.name);
      setDescription(room.description || '');
      setRoomType(room.type);
      setMaxUsers(room.max_users);
      setPassword(room.password || '');
      setShowDeleteConfirm(false);
    }
  }, [room, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim() && isOwner) {
      onUpdateRoom({
        name: roomName.trim(),
        description: description.trim() || null,
        type: roomType,
        max_users: maxUsers,
        password: password.trim() || null
      });
      onClose();
    }
  };

  const handleDelete = () => {
    if (showDeleteConfirm && isOwner) {
      onDeleteRoom();
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isOwner ? 'Edit Room' : 'Room Details'}
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
        
        <form onSubmit={handleSubmit}>
          {/* Room Name */}
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
              disabled={!isOwner}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus={isOwner}
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your room..."
              disabled={!isOwner}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Max Users */}
          <div className="mb-4">
            <label htmlFor="maxUsers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Users
            </label>
            <select
              id="maxUsers"
              value={maxUsers}
              onChange={(e) => setMaxUsers(parseInt(e.target.value))}
              disabled={!isOwner}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={5}>5 users</option>
              <option value={10}>10 users</option>
              <option value={25}>25 users</option>
              <option value={50}>50 users</option>
              <option value={100}>100 users</option>
            </select>
          </div>
          
          {/* Room Type */}
          <div className="mb-4">
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
                  disabled={!isOwner}
                  className="mt-1 text-indigo-600 disabled:opacity-50"
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
                  disabled={!isOwner}
                  className="mt-1 text-indigo-600 disabled:opacity-50"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">🌍 Public</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Discoverable on homepage</div>
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
                  disabled={!isOwner}
                  className="mt-1 text-indigo-600 disabled:opacity-50"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">👤 Profile Room</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Persistent room on your profile</div>
                </div>
              </label>
            </div>
          </div>

          {/* Password (for private rooms) */}
          {roomType === 'private' && (
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set room password..."
                disabled={!isOwner}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {isOwner ? 'Cancel' : 'Close'}
            </button>
            
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    showDeleteConfirm
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20'
                  }`}
                >
                  {showDeleteConfirm ? 'Confirm Delete' : 'Delete Room'}
                </button>
                
                <button
                  type="submit"
                  disabled={!roomName.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
          
          {showDeleteConfirm && isOwner && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                ⚠️ This will permanently delete the room and disconnect all users. This action cannot be undone.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}