import type { TFunction } from "i18next";
import { ApiError } from "./client.ts";

// Every problem type the API answers with, mapped to the key of its sentence.
// Keyed by problem.type, never by message text: titles are English and may change.
const problemMessageKeys: Record<string, string> = {
  "/problems/unauthenticated": "errors.problems.unauthenticated",
  "/problems/insufficient-role": "errors.problems.insufficientRole",
  "/problems/cross-site-request": "errors.problems.crossSiteRequest",
  "/problems/not-found": "errors.problems.notFound",
  "/problems/validation": "errors.problems.validation",
  "/problems/internal": "errors.problems.internal",
  "/problems/invalid-credentials": "errors.problems.invalidCredentials",
  "/problems/email-taken": "errors.problems.emailTaken",
  "/problems/organization-not-found": "errors.problems.organizationNotFound",
  "/problems/invalid-name": "errors.problems.invalidName",
  "/problems/invalid-title": "errors.problems.invalidTitle",
  "/problems/slug-taken": "errors.problems.slugTaken",
  "/problems/user-not-found": "errors.problems.userNotFound",
  "/problems/already-member": "errors.problems.alreadyMember",
  "/problems/cannot-remove-self": "errors.problems.cannotRemoveSelf",
  "/problems/last-owner": "errors.problems.lastOwner",
  "/problems/member-not-found": "errors.problems.memberNotFound",
  "/problems/event-not-found": "errors.problems.eventNotFound",
  "/problems/event-archived": "errors.problems.eventArchived",
  "/problems/event-not-published": "errors.problems.eventNotPublished",
  "/problems/venue-not-found": "errors.problems.venueNotFound",
  "/problems/occurrence-not-found": "errors.problems.occurrenceNotFound",
  "/problems/invalid-transition": "errors.problems.invalidTransition",
};

// One place turns a failure into words. A screen may override the key for
// problem types it wants to phrase for its own context; an unknown type falls
// back to the server's title, no response at all to a network message.
export function describeError(
  err: unknown,
  t: TFunction,
  overrides: Record<string, string> = {},
): string {
  if (err instanceof ApiError) {
    const key =
      overrides[err.problem.type] ?? problemMessageKeys[err.problem.type];
    return key ? t(key) : err.problem.title;
  }
  return t("errors.network");
}

// Server-side validation comes back as problem.errors[{ field, message }],
// already in the request's language. Keyed by field name so a form can place
// each message under its input; field names match the API body fields.
export function fieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiError && err.problem.type === "/problems/validation") {
    return Object.fromEntries(
      (err.problem.errors ?? []).map((e) => [e.field, e.message]),
    );
  }
  return {};
}

// True when the failure is not attributable to any single field, so the form
// should show it as a whole.
export function isFormLevelError(err: unknown): boolean {
  return Object.keys(fieldErrors(err)).length === 0;
}
