module.exports = {
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

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.justboil.me",
      },
    ],
  },
};
