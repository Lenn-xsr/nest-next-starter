import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle, enabled by the Dockerfile. It is opt-in
  // because the trace step creates symlinks, which Windows only allows with
  // Developer Mode or elevated rights.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  experimental: {
    // Trace dependencies from the monorepo root so workspace packages and the
    // pnpm store are included in the standalone output.
    outputFileTracingRoot: workspaceRoot,
  },

  // Same-origin API: the browser calls /api/* on the web origin and Next
  // forwards it to the API. Auth cookies are therefore first-party and
  // SameSite=Strict works in production; no CORS is involved.
  //
  // API_URL is read when the app is BUILT — the destination is compiled into
  // the routes manifest.
  async rewrites() {
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
