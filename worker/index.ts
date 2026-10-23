import { app } from './app'
import { runCron } from './sync'

/** Background Worker (no public URL): runs the every-minute sync. Serves the API too for local dev. */
export default {
  fetch: app.fetch,
  scheduled(controller, env, ctx) {
    ctx.waitUntil(runCron(env, controller.scheduledTime))
  },
} satisfies ExportedHandler<Env>
