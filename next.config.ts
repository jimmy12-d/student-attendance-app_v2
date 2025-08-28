const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // Enable PWA for unified service worker
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/firestore\.googleapis\.com\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'firestore-api',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
      },
    },
    {
      urlPattern: /^https?:\/\/.*\.googleapis\.com\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'google-apis',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/(login|student\/attendance|student)$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app-pages',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
    {
      urlPattern: /\/api\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5, // 5 minutes
        },
      },
    },
  ],
  buildExcludes: [/middleware-manifest\.json$/],
  customWorkerDir: 'worker',
});

module.exports = withPWA({
  async redirects() {
    return [
      {
        source: '/student/dashboard',
        destination: '/student/mock-exam',
        permanent: true,
      },
    ]
  },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: process.env.IS_OUTPUT_EXPORT ? "export" : "standalone",
  
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: (config, { isServer }) => {
    // Fix for face-api.js Node.js compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    
    return config;
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.justboil.me",
      },
    ],
  },
});
