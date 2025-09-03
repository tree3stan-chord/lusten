'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Avatar from './Avatar';
import AvatarUpload from './AvatarUpload';
import { useUserAvatar } from '../hooks/useUserAvatar';

interface ProfileAvatarProps {
  size?: 'lg' | 'xl' | '2xl';
  className?: string;
}

export default function ProfileAvatar({
  size = 'xl',
  className = '',
}: ProfileAvatarProps) {
  const { data: session } = useSession();
  const { avatarUrl, updateAvatar } = useUserAvatar();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleUploadSuccess = (newAvatarUrl: string) => {
    updateAvatar(newAvatarUrl);
  };

  if (!session?.user) {
    return null;
  }

  const userId = (session.user as { id?: string }).id;
  const userName = session.user.name || 'User';

  const badgeSizes = {
    lg: 'w-5 h-5 -bottom-1 -right-1',
    xl: 'w-6 h-6 -bottom-1.5 -right-1.5',
    '2xl': 'w-8 h-8 -bottom-2 -right-2',
  };

  const iconSizes = {
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5',
  };

  return (
    <>
      <div className="relative inline-block">
        <Avatar
          src={avatarUrl || session.user.image}
          alt={`${userName}'s avatar`}
          size={size}
          userId={userId}
          name={userName}
          className={className}
        />
        
        {/* Edit badge with + icon */}
        <button
          onClick={() => setShowUploadModal(true)}
          className={`absolute ${badgeSizes[size]} bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900`}
          title="Change profile picture"
        >
          <svg
            className={iconSizes[size]}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <AvatarUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
        currentAvatar={avatarUrl || session.user.image}
      />
    </>
  );
}