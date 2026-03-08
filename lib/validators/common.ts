import { z } from "zod";

export const dateRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime()
});

