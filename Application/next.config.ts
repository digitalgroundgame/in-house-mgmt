import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

// Warning if accidently ran in production
if (!process.env.BACKEND_URL) {
  console.warn(
    'BACKEND_URL not set, falling back to http://localhost:8080'
  )
} else {
  console.warn(
    `BACKEND_URL set to ${BACKEND_URL}`
  )
}


module.exports = {
  async rewrites() {
    return [
      {
        source: "/accounts/:path*",
        destination: `${BACKEND_URL}/accounts/:path*/`,
      },
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*/`,
      },
      {
        source: '/admin/:path*',
        destination: `${BACKEND_URL}/admin/:path*/`,
      },
      {
        source: '/django/:path*',
        destination: `${BACKEND_URL}/django/:path*/`,
      },
    ]
  },
}

export default nextConfig;
