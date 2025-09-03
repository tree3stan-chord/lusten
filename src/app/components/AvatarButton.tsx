'use client';

import { useSession } from 'next-auth/react';
import Avatar from './Avatar';
import { useUserAvatar } from '../hooks/useUserAvatar';

interface AvatarButtonProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

export default function AvatarButton({
  size = 'md',
  className = '',
  showOnlineIndicator = false,
  isOnline = false,
}: AvatarButtonProps) {
  const { data: session } = useSession();
  const { avatarUrl } = useUserAvatar();

  if (!session?.user) {
    return null;
  }

  const userId = (session.user as { id?: string }).id;
  const userName = session.user.name || 'User';

  return (
    <Avatar
      src={avatarUrl || session.user.image}
      alt={`${userName}'s avatar`}
      size={size}
      userId={userId}
      name={userName}
      className={className}
      showOnlineIndicator={showOnlineIndicator}
      isOnline={isOnline}
    />
  );
}