'use client';

import Link from 'next/link';

interface GenreCardProps {
  genre: string;
  roomCount: number;
  variant?: 'default' | 'compact';
}

// Genre-specific colors for visual variety
const GENRE_COLORS: Record<string, string> = {
  'Pop': 'from-pink-500 to-rose-500',
  'Rock': 'from-red-600 to-orange-600',
  'Hip Hop': 'from-purple-600 to-indigo-600',
  'Electronic': 'from-cyan-500 to-blue-500',
  'Indie': 'from-amber-500 to-yellow-500',
  'Jazz': 'from-blue-700 to-indigo-700',
  'Classical': 'from-purple-700 to-pink-700',
  'R&B': 'from-rose-600 to-pink-600',
  'Country': 'from-amber-600 to-orange-500',
  'Metal': 'from-gray-700 to-red-900',
  'Reggae': 'from-green-500 to-yellow-500',
  'Blues': 'from-blue-800 to-indigo-800',
  'Folk': 'from-emerald-600 to-teal-600',
  'Latin': 'from-red-500 to-orange-500',
  'Dance': 'from-fuchsia-500 to-purple-500'
};

// Genre emojis for fun visual indicators
const GENRE_EMOJIS: Record<string, string> = {
  'Pop': '🎤',
  'Rock': '🎸',
  'Hip Hop': '🎤',
  'Electronic': '🎧',
  'Indie': '🎵',
  'Jazz': '🎷',
  'Classical': '🎻',
  'R&B': '🎶',
  'Country': '🤠',
  'Metal': '🤘',
  'Reggae': '🌴',
  'Blues': '🎺',
  'Folk': '🪕',
  'Latin': '💃',
  'Dance': '🕺'
};

export default function GenreCard({ genre, roomCount, variant = 'default' }: GenreCardProps) {
  const normalizedGenre = genre.trim();
  const gradient = GENRE_COLORS[normalizedGenre] || 'from-indigo-600 to-purple-600';
  const emoji = GENRE_EMOJIS[normalizedGenre] || '🎵';
  const urlSafeGenre = encodeURIComponent(normalizedGenre.toLowerCase());

  if (variant === 'compact') {
    return (
      <Link
        href={`/discover/${urlSafeGenre}`}
        className="group block"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xl`}>
                {emoji}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {normalizedGenre}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {roomCount} {roomCount === 1 ? 'room' : 'rooms'}
                </p>
              </div>
            </div>
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/discover/${urlSafeGenre}`}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 duration-300">
        {/* Gradient Background */}
        <div className={`h-48 bg-gradient-to-br ${gradient} p-6 flex flex-col justify-between relative`}>
          {/* Decorative pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-20 -translate-y-20"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16 translate-y-16"></div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <div className="text-4xl mb-2">{emoji}</div>
            <h3 className="text-2xl font-bold text-white mb-1">{normalizedGenre}</h3>
            <p className="text-white/90 text-sm">
              {roomCount} active {roomCount === 1 ? 'room' : 'rooms'}
            </p>
          </div>

          {/* Explore button */}
          <div className="relative z-10 flex items-center text-white font-medium group-hover:gap-2 transition-all">
            <span>Explore</span>
            <svg
              className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
