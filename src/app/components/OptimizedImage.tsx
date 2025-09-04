'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackClassName?: string;
  priority?: boolean;
  quality?: number;
}

export default function OptimizedImage({
  src,
  alt,
  width = 32,
  height = 32,
  className = "",
  fallbackClassName = "",
  priority = false,
  quality = 75
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Fallback icon when image fails to load
  const FallbackIcon = () => (
    <div className={`bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center ${fallbackClassName || className}`}>
      <svg className="w-1/2 h-1/2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    </div>
  );

  if (imageError) {
    return <FallbackIcon />;
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 dark:bg-gray-600 rounded animate-pulse ${className}`} />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        quality={quality}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
      />
    </div>
  );
}

// Specialized component for Spotify album/artist images
interface SpotifyImageProps {
  images: Array<{ url: string; width: number; height: number }>;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  priority?: boolean;
}

export function SpotifyImage({
  images,
  alt,
  size = 'md',
  className,
  priority = false
}: SpotifyImageProps) {
  // Choose the best image size based on the requested size
  const getBestImage = () => {
    if (!images || images.length === 0) return null;
    
    const targetSize = size === 'sm' ? 64 : size === 'md' ? 160 : 320;
    
    // Sort images by how close they are to our target size
    const sortedImages = [...images].sort((a, b) => {
      const diffA = Math.abs(a.width - targetSize);
      const diffB = Math.abs(b.width - targetSize);
      return diffA - diffB;
    });
    
    return sortedImages[0];
  };

  const bestImage = getBestImage();
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };
  
  const roundedClasses = {
    sm: 'rounded',
    md: 'rounded',
    lg: 'rounded-lg'
  };

  const finalClassName = `${sizeClasses[size]} ${roundedClasses[size]} object-cover ${className || ''}`;

  if (!bestImage) {
    return (
      <div className={`${finalClassName} bg-gray-200 dark:bg-gray-600 flex items-center justify-center`}>
        <svg className="w-1/2 h-1/2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  return (
    <OptimizedImage
      src={bestImage.url}
      alt={alt}
      width={bestImage.width}
      height={bestImage.height}
      className={finalClassName}
      priority={priority}
      quality={85}
    />
  );
}