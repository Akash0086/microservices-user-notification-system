import { z } from "zod";

export const userCreatedEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal("user.created"),

  data: z.object({
    userId: z.number(),
    name: z.string(),
    email: z.string().email(),
  }),
});

export type UserCreatedEvent = z.infer<
  typeof userCreatedEventSchema
>;