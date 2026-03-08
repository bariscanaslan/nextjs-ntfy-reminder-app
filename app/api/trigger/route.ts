import { createAppRoute } from "@trigger.dev/nextjs";
import { triggerClient } from "@/trigger/client";

export const { POST, dynamic, runtime, preferredRegion } = createAppRoute(triggerClient);

