/**
 * In-process poller — fires processDueJobs every 30 s.
 * Works for both `next dev` and `next start` (long-running Node.js process).
 * The global flag prevents duplicate intervals across hot-reload cycles.
 */
import { processDueJobs } from "./reconcile";

const POLL_MS = 30_000;

declare global {
  // eslint-disable-next-line no-var
  var _reminderPollerStarted: boolean | undefined;
}

export function ensurePollerStarted() {
  if (global._reminderPollerStarted) return;
  global._reminderPollerStarted = true;

  setInterval(async () => {
    try {
      await processDueJobs(50);
    } catch {
      // Silent — will retry next interval
    }
  }, POLL_MS);
}
