import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "local-dev",
  runtime: "node",
  maxDuration: 300,
  dirs: ["./trigger"]
});
