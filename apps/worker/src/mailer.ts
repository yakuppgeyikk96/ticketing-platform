import { Resend } from "resend";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const resend = new Resend(requireEnv("RESEND_API_KEY"));
const mailFrom = requireEnv("MAIL_FROM");

export async function sendMail({
  to,
  subject,
  html,
  idempotencyKey,
}: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}): Promise<string> {
  const { data, error } = await resend.emails.send(
    {
      from: mailFrom,
      to,
      subject,
      html,
    },
    {
      idempotencyKey,
    },
  );

  if (error) throw new Error(`resend ${error.name}: ${error.message}`);

  return data.id;
}
