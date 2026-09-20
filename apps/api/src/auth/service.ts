import { isUniqueViolation, users, type Db } from "@ticketing/db";
import { ConflictError, UnauthorizedError } from "../errors.ts";
import type { SessionUser } from "./sessions.ts";
import { hashPassword, verifyPassword } from "./passwords.ts";
import { and, sql, isNull } from "drizzle-orm";

export interface RegisterUserReturn {
  id: string;
  email: string;
  createdAt: Date;
}

export async function registerUser(
  db: Db,
  input: { email: string; password: string },
): Promise<RegisterUserReturn> {
  try {
    const passwordHash = await hashPassword(input.password);

    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      });

    if (!user) {
      throw new Error("insert return no row");
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
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
  };
}
