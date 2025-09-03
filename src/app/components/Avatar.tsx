'use client';

import { useState } from 'react';
import { getDefaultAvatarUrl } from '../../lib/image-utils';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  userId?: string;
  name?: string;
  className?: string;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  '2xl': 'w-32 h-32',
};

const indicatorSizes = {
  xs: 'w-1.5 h-1.5 -bottom-0.5 -right-0.5',
  sm: 'w-2 h-2 -bottom-0.5 -right-0.5',
  md: 'w-3 h-3 -bottom-0.5 -right-0.5',
  lg: 'w-4 h-4 -bottom-1 -right-1',
  xl: 'w-5 h-5 -bottom-1 -right-1',
  '2xl': 'w-6 h-6 -bottom-1.5 -right-1.5',
};

export default function Avatar({
  src,
  alt,
  size = 'md',
  userId,
  name,
  className = '',
  showOnlineIndicator = false,
  isOnline = false,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Generate fallback avatar if needed
  const fallbackSrc = (userId && name) ? getDefaultAvatarUrl(userId, name) : null;
  const displaySrc = hasError ? fallbackSrc : src;

  const baseClasses = `
    inline-block rounded-full object-cover border-2 border-gray-200 dark:border-gray-600
    ${sizeClasses[size]}
    ${className}
  `.trim();

  return (
    <div className="relative inline-block">
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={alt}
          className={`${baseClasses} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div
          className={`${baseClasses} bg-gray-300 dark:bg-gray-600 flex items-center justify-center`}
        >
          <svg
            className={`${size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : size === 'lg' ? 'w-8 h-8' : size === 'xl' ? 'w-12 h-12' : 'w-16 h-16'} text-gray-400 dark:text-gray-500`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && displaySrc && (
        <div className={`absolute inset-0 ${baseClasses} bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
          <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${
            size === 'xs' ? 'w-3 h-3' : 
            size === 'sm' ? 'w-4 h-4' : 
            size === 'md' ? 'w-6 h-6' : 
            size === 'lg' ? 'w-8 h-8' : 
            size === 'xl' ? 'w-12 h-12' : 'w-16 h-16'
          }`}></div>
        </div>
      )}

      {/* Online indicator */}
      {showOnlineIndicator && (
        <div
          className={`absolute rounded-full border-2 border-white dark:border-gray-800 ${indicatorSizes[size]} ${
            isOnline ? 'bg-green-400' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  );
}