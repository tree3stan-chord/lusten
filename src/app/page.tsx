'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateRoomModal from './components/CreateRoomModal';

interface Room {
  id: string;
  name: string;
  currentTrack?: string;
  currentArtist?: string;
  listeners: number;
}

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([
    {
      id: '1',
      name: 'Chill Vibes',
      currentTrack: 'Midnight City',
      currentArtist: 'M83',
      listeners: 5
    },
    {
      id: '2',
      name: 'Study Session',
      currentTrack: 'Weightless',
      currentArtist: 'Marconi Union',
      listeners: 12
    }
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const router = useRouter();

  const handleCreateRoom = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateRoomSubmit = (roomName: string) => {
    const newRoomId = Math.random().toString(36).substr(2, 9);
    const newRoom: Room = {
      id: newRoomId,
      name: roomName,
      listeners: 1
    };
    setRooms(prev => [...prev, newRoom]);
    setIsCreateModalOpen(false);
    router.push(`/room/${newRoomId}`);
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LUSTEN</h1>
            </div>
            <div className="flex space-x-4">
              <button className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 text-sm font-medium">
                Sign In
              </button>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Listen Together
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Create shared listening experiences with friends. Host a room or join others to enjoy music together in real-time.
          </p>
          
          {/* Create Room Button */}
          <button
            onClick={handleCreateRoom}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-full text-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 mx-auto"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Room
          </button>
        </div>

        {/* Active Rooms */}
        {rooms.length > 0 && (
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
              Active Rooms
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {room.name}
                    </h4>
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-sm px-2 py-1 rounded-full">
                      {room.listeners} listening
                    </span>
                  </div>
                  
                  {room.currentTrack && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Now playing:</p>
                      <p className="font-medium text-gray-900 dark:text-white">{room.currentTrack}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{room.currentArtist}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Join Room
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRoom={handleCreateRoomSubmit}
      />
    </div>
  );
}
