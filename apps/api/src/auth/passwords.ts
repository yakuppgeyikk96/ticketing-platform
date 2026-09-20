import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

// Verified against when the email is unknown, so both paths cost one argon2 run
const DUMMY_HASH = await hashPassword("dummy-password");

export async function verifyPassword(
  storedHash: string | null,
  password: string,
): Promise<boolean> {
  return await verify(storedHash ?? DUMMY_HASH, password);
}
