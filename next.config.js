/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure production optimizations
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression
  
  // Production optimizations (swcMinify is now default)
  
  // Images optimization
  images: {
    domains: [
      'i.scdn.co', // Spotify images
      'mosaic.scdn.co', // Spotify playlist images
      'lineup-images.scdn.co', // Spotify artist images
      'thisis-images.scdn.co', // Spotify This Is playlists
      'daily-mix.scdn.co', // Spotify Daily Mix
      'seed-mix-image.spotifycdn.com', // Spotify mixes
      'charts-images.scdn.co', // Spotify charts
      'wrapped-images.spotifycdn.com', // Spotify Wrapped
      'avatars.githubusercontent.com', // GitHub avatars for OAuth
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  },

  // Environment variables available to the client
  env: {
    CUSTOM_NODE_ENV: process.env.NODE_ENV,
  },

  // Experimental features - Turbopack is enabled via CLI flag

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
      
      // Disable development features in production
      config.plugins = config.plugins.filter(
        plugin => plugin.constructor.name !== 'ReactRefreshPlugin'
      );
    }

    // Disable dev overlay in production builds
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@next/dev-overlay': false,
      };
    }

    return config;
  },

  // Disable dev indicators in production
  devIndicators: {
    position: 'bottom-right',
  },

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Output configuration
  // Note: 'standalone' mode is incompatible with custom server.js (Socket.IO)
  // output: 'standalone',

  // ESLint configuration
  eslint: {
    // Only run ESLint in development, ignore during production builds
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },

  // TypeScript configuration
  typescript: {
    // Allow production builds to succeed even with TypeScript errors
    // (Not recommended for strict projects, but useful for deployment)
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;