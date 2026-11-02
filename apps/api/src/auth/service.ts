import { isUniqueViolation, outbox, users, type Db } from "@ticketing/db";
import { ConflictError, UnauthorizedError } from "../errors.ts";
import type { SessionUser } from "./sessions.ts";
import { hashPassword, verifyPassword } from "./passwords.ts";
import { and, eq, sql, isNull } from "drizzle-orm";
import type { Locale } from "@ticketing/contracts";

export interface RegisterUserReturn {
  id: string;
  email: string;
  createdAt: Date;
}

export async function registerUser(
  db: Db,
  input: { email: string; password: string; locale: Locale },
): Promise<RegisterUserReturn> {
  try {
    const passwordHash = await hashPassword(input.password);

    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          passwordHash,
          emailVerifiedAt: new Date(),
          locale: input.locale,
        })
        .returning({
          id: users.id,
          email: users.email,
          locale: users.locale,
          createdAt: users.createdAt,
        });

      if (!user) {
        throw new Error("insert return no row");
      }

      // The worker has no request to read the language from, so the event
      // carries it.
      await tx.insert(outbox).values({
        type: "user.registered",
        payload: { userId: user.id, email: user.email, locale: user.locale },
      });

      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      };
    });
  } catch (err) {
    if (isUniqueViolation(err, "users_email_lower_idx")) {
      throw new ConflictError(
        "email-taken",
        "Email already registered",
        "An account with this email already exists",
      );
    }

    throw err;
  }
}

export async function authenticate(
  db: Db,
  input: { email: string; password: string },
): Promise<SessionUser> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      locale: users.locale,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(
      and(sql`lower(${users.email}) = ${input.email}`, isNull(users.deletedAt)),
    )
    .limit(1);

  // Always run argon2: unknown email, deleted user and OIDC-only user all
  // take the dummy path and cost the same as a real check.
  const ok = await verifyPassword(user?.passwordHash ?? null, input.password);

  if (!user || !ok) {
    throw new UnauthorizedError(
      "invalid-credentials",
      "Invalid email or password",
    );
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    locale: user.locale,
  };
}

export async function updateLocale(
  db: Db,
  userId: string,
  locale: Locale,
): Promise<void> {
  await db.update(users).set({ locale }).where(eq(users.id, userId));
}
