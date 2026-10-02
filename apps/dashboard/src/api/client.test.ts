import { currentUserSchema } from "@ticketing/contracts";
import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { ApiError, request } from "./client.ts";

// The module under test owns HTTP; the test owns `fetch`. No server needed.
function stubFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
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

const user = {
  id: "01a0df5c-0085-7a27-8f78-c2f13f239902",
  email: "vera@example.com",
  fullName: null,
};

test("returns the parsed body on success and calls the API under /api", async () => {
  const fetchMock = stubFetch(200, user);

  const result = await request("/auth/me", { response: currentUserSchema });

  expect(result).toEqual(user);
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe("/api/auth/me");
  expect(init?.method).toBe("GET");
  expect(init?.body ?? null).toBeNull();
});

test("sends a JSON body with the content-type header", async () => {
  const fetchMock = stubFetch(200, user);
  const body = { email: "vera@example.com", password: "correct horse" };

  await request("/auth/login", {
    method: "POST",
    body,
    response: currentUserSchema,
  });

  const [, init] = fetchMock.mock.calls[0] ?? [];
  expect(init?.method).toBe("POST");
  expect(init?.body).toBe(JSON.stringify(body));
  expect(new Headers(init?.headers).get("content-type")).toBe(
    "application/json",
  );
});

test("a 204 resolves without reading a body", async () => {
  stubFetch(204);

  await expect(
    request("/auth/logout", { method: "POST", response: z.undefined() }),
  ).resolves.toBeUndefined();
});

test("a problem+json answer becomes an ApiError carrying the problem", async () => {
  const problem = {
    type: "/problems/invalid-credentials",
    title: "Invalid email or password",
    status: 401,
  };
  stubFetch(401, problem);

  const error: unknown = await request("/auth/login", {
    method: "POST",
    body: {},
    response: currentUserSchema,
  }).catch((e: unknown) => e);

  expect(error).toBeInstanceOf(ApiError);
  if (!(error instanceof ApiError)) return;
  expect(error.status).toBe(401);
  expect(error.problem).toEqual(problem);
  expect(error.message).toBe(problem.title);
});

test("a failed answer that is not a problem is a plain Error, not an ApiError", async () => {
  stubFetch(502, { oops: true });

  const error: unknown = await request("/auth/me", {
    response: currentUserSchema,
  }).catch((e: unknown) => e);

  expect(error).toBeInstanceOf(Error);
  expect(error).not.toBeInstanceOf(ApiError);
});

test("a 200 that breaks the contract is rejected instead of returned", async () => {
  stubFetch(200, { id: "not-a-uuid", email: "vera@example.com" });

  await expect(
    request("/auth/me", { response: currentUserSchema }),
  ).rejects.toThrow();
});

test("a network failure passes through untouched", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("fetch failed"))),
  );

  await expect(
    request("/auth/me", { response: currentUserSchema }),
  ).rejects.toThrow(TypeError);
});
