import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

if (!process.env.BACKEND_URL) {
  console.warn("BACKEND_URL not set, falling back to http://localhost:8080");
} else {
  console.warn(`BACKEND_URL set to ${BACKEND_URL}`);
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/accounts/:path*",
        destination: `${BACKEND_URL}/accounts/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*/`,
      },
      {
        source: "/admin/:path*",
        destination: `${BACKEND_URL}/admin/:path*/`,
      },
      {
        source: "/django/:path*",
        destination: `${BACKEND_URL}/django/:path*/`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
