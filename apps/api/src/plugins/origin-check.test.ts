import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { problemSchema } from "@ticketing/contracts";
import { startApp, type TestApp } from "../testing/harness.ts";

let app: TestApp;
before(async () => {
  app = await startApp();
});
after(() => app.close());

// A state-changing request that needs no session: wrong credentials give 401
// when the request reaches the handler, so 401 here means "the check let it in".
function login(headers: Record<string, string>) {
  return app.inject({
    method: "POST",
    url: "/auth/login",
    headers,
    payload: { email: "nobody@example.com", password: "whatever" },
  });
}

test("state-changing requests from another site or a sibling subdomain are refused", async () => {
  for (const site of ["cross-site", "same-site", "something-new"]) {
    const res = await login({ "sec-fetch-site": site });

    assert.equal(res.statusCode, 403, site);
    assert.equal(
      problemSchema.parse(res.json()).type,
      "/problems/cross-site-request",
    );
  }
});

test("state-changing requests from our own origin, or typed by the user, pass the check", async () => {
  for (const site of ["same-origin", "none"]) {
    const res = await login({ "sec-fetch-site": site });

    assert.equal(res.statusCode, 401, site);
  }
});

test("requests without the header pass: not a browser, so not a victim's cookie", async () => {
  const res = await login({});

  assert.equal(res.statusCode, 401);
});

test("safe methods pass from anywhere", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/health",
    headers: { "sec-fetch-site": "cross-site" },
  });

  assert.equal(res.statusCode, 200);
});
