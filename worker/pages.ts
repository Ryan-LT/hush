import { app } from './app'

/** Cloudflare Pages advanced-mode entry (out/_worker.js): serves /api and /auth; Pages serves everything else. */
export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>
