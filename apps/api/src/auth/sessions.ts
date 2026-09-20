import { sessions, users, type Db } from "@ticketing/db";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

export interface CreateSessionInput {
  userId: string;
  userAgent: string | null;
  ip: string | null;
}

export type SessionUser = Pick<
  typeof users.$inferSelect,
  "id" | "email" | "fullName"
>;

export interface ActiveSession {
  sessionId: string;
  user: SessionUser;
}

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30days

// What the browser holds is `token`; what the table holds is its hash
// SHA-256 is enough: the token is 32 random bytes, there is nothing to brute-force.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Returns the plain token exactly once, for the cookie. The table never sees it.
export async function createSession(
  db: Db,
  input: CreateSessionInput,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId: input.userId,
    expiresAt,
    userAgent: input.userAgent,
    ip: input.ip,
  });

  return token;
}

export async function findSessionByToken(
  db: Db,
  token: string,
): Promise<ActiveSession | null> {
  const [row] = await db
    .select({
      sessionId: sessions.id,
      user: { id: users.id, email: users.email, fullName: users.fullName },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

// Revoke rather than delete: the row stays for "my sessions" history and
// audit; the WHERE guard makes a repeated logout a no-op.
export async function revokeSession(db: Db, sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({
      revokedAt: new Date(),
    })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

// "Log out everywhere". Callers that want to keep the current session
// (password change) pass its id in `except`.
export async function revokeUserSessions(
  db: Db,
  userId: string,
  options: { except?: string } = {},
): Promise<void> {
  const conditions = [eq(sessions.userId, userId), isNull(sessions.revokedAt)];
  if (options.except) conditions.push(ne(sessions.id, options.except));
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(...conditions));
}
