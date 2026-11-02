import { z } from "zod";
import { localeSchema } from "@ticketing/contracts";
import { sendMail } from "./mailer.ts";
import { welcomeMail } from "./mail-copy.ts";

export type Handler = (payload: unknown, outboxId: string) => Promise<void>;

// Rows written before the locale existed carry no field; they were Turkish.
const userRegistered = z.object({
  userId: z.uuid(),
  email: z.email(),
  locale: localeSchema.default("tr"),
});

export const handlers: Record<string, Handler> = {
  "user.registered": async (payload, outboxId) => {
    const { email, locale } = userRegistered.parse(payload);

    const messageId = await sendMail({
      to: email,
      ...welcomeMail[locale],
      idempotencyKey: outboxId,
    });
    console.log(
      `user.registered: welcome mail sent to ${email} (${messageId})`,
    );
  },
};

export const handledTypes = Object.keys(handlers);
