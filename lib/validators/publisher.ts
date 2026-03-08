import { z } from "zod";

export const publisherSchema = z.object({
  name: z.string().min(1).max(80),
  serverUrl: z.string().url(),
  topic: z.string().min(1).max(120),
  authMode: z.enum(["none", "token"]),
  token: z.string().optional(),
  tokenSecretRef: z.string().optional(),
  isDefault: z.boolean().optional()
});

