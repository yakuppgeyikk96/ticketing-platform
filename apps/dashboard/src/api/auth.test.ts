import { afterEach, expect, test, vi } from "vitest";
import { ApiError } from "./client.ts";
import { register } from "./auth.ts";

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("register posts to /auth/register and returns the created user", async () => {
  const created = {
    id: "01a0df5c-0085-7a27-8f78-c2f13f239902",
    email: "vera@example.com",
    createdAt: "2026-11-01T10:00:00.000Z",
  };
  const fetchMock = stubFetch(201, created);

  const result = await register({
    email: "vera@example.com",
    password: "correct horse",
  });

  expect(result).toEqual(created);
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe("/api/auth/register");
  expect(init?.method).toBe("POST");
});

test("a taken email surfaces as an ApiError with the email-taken problem", async () => {
  stubFetch(409, {
    type: "/problems/email-taken",
    title: "Email already registered",
    status: 409,
  });

  const error: unknown = await register({
    email: "vera@example.com",
    password: "correct horse",
  }).catch((e: unknown) => e);

  expect(error).toBeInstanceOf(ApiError);
  if (!(error instanceof ApiError)) return;
  expect(error.status).toBe(409);
  expect(error.problem.type).toBe("/problems/email-taken");
});
