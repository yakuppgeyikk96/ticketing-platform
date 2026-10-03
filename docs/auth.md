# Authentication

Decision taken before any code.

## Decision

**Browser surfaces (public site, dashboard) use server-side sessions.** A login creates a row in a `sessions` table in PostgreSQL; the client receives only a random session id in a cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. Every request looks the session up.

Not JWT for these surfaces. The product requires immediate revocation: logout must take effect on the next request, removing a member from an organization must cut their access now, and a password change must terminate every other device. A self-contained token cannot be revoked before it expires; the usual fixes (short life plus refresh rotation, or a deny-list) reintroduce server-side state, which is exactly what a session is.

## Three doors, two models

| door                         | who                       | credential                                         | model                                  |
| ---------------------------- | ------------------------- | -------------------------------------------------- | -------------------------------------- |
| Email + password             | people in a browser       | session id in an `HttpOnly` cookie                 | server session                         |
| "Sign in with Google" (OIDC) | people in a browser       | Google ID token exchanged for **the same session** | server session                         |
| Partner API                  | machines (agencies, orgs) | client credentials → short-lived token with scopes | token, no cookie, no interactive login |

OIDC is a second way to open the session, not a second session model. The partner API exists because integrators call us as a program, at 3 a.m., with no user present; it needs revocable, scoped, quota-limited machine credentials. It is also the pull side of the webhooks.

There is no service-to-service HTTP auth in this system: `api` and `worker` share the database and the queue rather than calling each other.

## Where the credential lives: cookie, not localStorage

- **XSS** (a script injected into our page, e.g. an event description rendered as HTML) can read `localStorage` and exfiltrate a token. It cannot read an `HttpOnly` cookie. It can still _use_ the cookie by issuing requests from the page, so XSS must be prevented regardless: escape output (React does by default), sanitize rich text, ship a CSP.
- **CSRF** (a foreign page making the victim's browser send a request to us with our cookie attached) is the cookie's cost. Mitigations, layered: `SameSite=Lax` (browser omits the cookie on cross-site POST), JSON-only request bodies (an HTML form cannot produce `application/json`; `fetch` from another origin hits CORS preflight), and an `Origin` header check on state-changing routes.

A stolen token has no remedy; CSRF has cheap, browser-backed remedies. The cookie wins.

## Why PostgreSQL, not Redis, for sessions

"Log out everywhere", "show my active sessions", "revoke all sessions of user X when they leave organization Y" are relational queries over `sessions` joined with `users` and `organization_members`. Latency of the per-request lookup is a primary-key read. If it shows up in a flame graph under load testing, a Redis read-through cache goes in front of the table, measured before and after.

## When a mobile app arrives

The model carries over. A native app has no cookie jar, so it sends the same session id as `Authorization: Bearer <session-id>` and keeps it in the platform's secure storage (Keychain / Keystore). The server reads the id from the cookie first, then from the header. CSRF and XSS do not apply to a native client, so the bearer header is safe there. OIDC on mobile is the same authorization-code + PKCE flow. No switch to JWT is needed; the revocation requirement is the same on every client.

## Where errors are thrown

- Service functions (`apps/api/src/auth/service.ts`) throw business outcomes: email taken, invalid credentials. They know the rule, so they raise it.
- Hooks (`requireAuth`) throw gate errors. Handlers throw nothing business-related; only `unreachable` guards.
- Programmer errors are plain `Error` (become 500, logged, hidden from the client); user-facing outcomes are `AppError` subclasses.
- One place converts: the errors plugin, into RFC 9457 bodies.

Known debt: `AppError` carries the HTTP status, so services indirectly know HTTP. The clean form is domain error classes (`EmailTakenError`) mapped to status/type in the error handler. Trigger to do it: a service called from outside HTTP (worker, CLI), or the mapping growing past a handful of cases. Exceptions over a Result type is also a choice: less noise with Fastify's error handler; revisit if services start nesting.

## Authorization inside an organization

- The actor comes from the session, never from the URL or body. Ids in the request are targets.
- `requireRoles(...)` on the route answers "may this person act in this organization": non-member `404` (same answer as a nonexistent organization), member with the wrong role `403`. Each route lists its allowed roles; there is no role hierarchy in code.
- Every query on tenant-owned data carries `organization_id` in its `WHERE`. The hook does not check that the named record belongs to the organization; the query does.
- Changes to the membership set lock the organization row first and re-check the actor inside the transaction.

Measured in `labs/04-tenant-leak.md` and `labs/04-row-lock.md`; attacks live in `apps/api/src/routes/tenant-isolation.test.ts`.

## Browser security: how the dashboard talks to the API

Two different gatekeepers: **origin** (scheme + host + port) decides whether JavaScript may read a response (same-origin policy, CORS); **site** (registrable domain, ports and subdomains ignored) decides whether a `SameSite` cookie is sent.

| decision         | choice                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| dashboard ↔ API  | same origin through a proxy; the API is served under `/api`            |
| CORS             | none. Arrives only with the partner API, for those routes, cookie-less |
| CSRF             | `SameSite=Lax` + JSON-only bodies + `Sec-Fetch-Site` check; no token   |
| GET              | never changes state (Lax still sends the cookie on top-level GET)      |
| `__Host-` prefix | when the deployment serves HTTPS                                       |

Why three CSRF layers: `SameSite` stops other sites but not a sibling subdomain (`blog.example.com` is same-site). JSON-only stops HTML forms and forces a preflight for `fetch`, but depends on nobody adding a form-encoded endpoint. The `Sec-Fetch-Site` check rejects any state-changing request that is not `same-origin`, whatever the body type. CORS is not a CSRF defence: it blocks reading the response, not sending a simple request.

## Deferred

- OIDC (Google) and the partner API with client credentials: when the dashboard needs them.
- Add-member becomes an invite flow (email + token) once the job queue exists.
- "Leave organization" and role changes; the last-owner count becomes reachable then.
