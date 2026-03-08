import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/),
  defaultIconKey: z.string().min(1),
  description: z.string().max(1000).optional()
});

