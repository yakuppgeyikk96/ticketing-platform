import { z } from "zod";
import { sendMail } from "./mailer.ts";

export type Handler = (payload: unknown, outboxId: string) => Promise<void>;

const userRegistered = z.object({
  userId: z.uuid(),
  email: z.email(),
});

export const handlers: Record<string, Handler> = {
  "user.registered": async (payload, outboxId) => {
    const { email } = userRegistered.parse(payload);

    const messageId = await sendMail({
      to: email,
      subject: "Hoş geldiniz",
      html: "<p>Hesabınız oluşturuldu, hoş geldiniz.</p>",
      idempotencyKey: outboxId,
    });
    console.log(
      `user.registered: welcome mail sent to ${email} (${messageId})`,
    );
  },
};

export const handledTypes = Object.keys(handlers);
