import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'
const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:8787'

// Production: a static export served by the Cloudflare Worker as assets (see wrangler.jsonc).
// Development: `next dev` proxies /api and /auth to `wrangler dev`.
const config: NextConfig = {
  output: isDev ? undefined : 'export',
  images: { unoptimized: true },
  // The dev-only badge sits on top of the dashboard's bottom-left corner
  devIndicators: false,
  ...(isDev && {
    rewrites: async () => [
      { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
      { source: '/auth/:path*', destination: `${apiOrigin}/auth/:path*` },
    ],
  }),
}

export default config
