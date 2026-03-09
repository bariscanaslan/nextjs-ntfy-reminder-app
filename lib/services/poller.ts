/**
 * In-process poller — fires processDueJobs every 30 s.
 * Works for both `next dev` and `next start` (long-running Node.js process).
 * The global flag prevents duplicate intervals across hot-reload cycles.
 */
import { processDueJobs, reconcileStaleNextTriggers } from "./reconcile";

const POLL_MS = 30_000;
// Run stale-trigger reconciliation less frequently than job processing.
const RECONCILE_EVERY_N_POLLS = 4; // every ~2 minutes

declare global {
  // eslint-disable-next-line no-var
  var _reminderPollerStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var _reminderPollerCount: number | undefined;
}

export function ensurePollerStarted() {
  if (global._reminderPollerStarted) return;
  global._reminderPollerStarted = true;
  global._reminderPollerCount = 0;

  setInterval(async () => {
    try {
      await processDueJobs(50);
    } catch {
      // Silent — will retry next interval
    }

    global._reminderPollerCount = (global._reminderPollerCount ?? 0) + 1;
    if (global._reminderPollerCount % RECONCILE_EVERY_N_POLLS === 0) {
      try {
        await reconcileStaleNextTriggers(20);
      } catch {
        // Silent — will retry next interval
      }
    }
  }, POLL_MS);
}
