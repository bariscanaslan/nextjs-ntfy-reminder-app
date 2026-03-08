import { TriggerClient } from "@trigger.dev/sdk";

export const triggerClient = new TriggerClient({
  id: "reminder-os",
  apiKey: process.env.TRIGGER_SECRET_KEY
});
