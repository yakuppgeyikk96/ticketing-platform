# Lab 04b: tenant leak, on purpose

Question: an organization endpoint has two defences, a role check on the route and a tenant column in the query. What does each one stop, and what leaks when it is missing?

## Setup

- Victim organization **V**: Vera (owner), Selim (staff).
- Attacker organization **A**: Ali (owner). Ali has no relation to V.
- Seven attacks in `apps/api/src/routes/tenant-isolation.test.ts`. Each one checks the HTTP answer and then the row in the table, because "404 but the row is gone" is still a breach.
- Each defence removed in turn, tests run, defence restored.

## The questions the code asks

For `DELETE /organizations/:organizationId/members/:userId`:

| #   | question                                           | where                                  |
| --- | -------------------------------------------------- | -------------------------------------- |
| 1   | who is calling?                                    | session cookie, never the request body |
| 2   | is the caller an owner of the organization in URL? | `requireRoles` preHandler              |
| 3   | is the caller still an owner?                      | service, after the row lock            |
| 4   | is the target a member of **this** organization?   | service, `findMembership`              |
| 5   | delete where `user_id = ? AND organization_id = ?` | service, the `DELETE` itself           |

## Run 1: role check removed from the route

Ali sends `DELETE /organizations/V/members/Selim`.

| attack                      | result | what happened                                                    |
| --------------------------- | ------ | ---------------------------------------------------------------- |
| 1 outsider removes a member | ✖      | row intact, but the answer is `403` instead of `404`             |
| 5 real id vs made-up id     | ✖      | real organization `403`, made-up id `404`: the two are different |
| 2, 3, 4, 6, 7               | ✔      |                                                                  |

No data was lost: question 3 in the service refused the caller. What leaked is **existence**: an outsider can tell a real organization id from a random one. The "non-member gets 404" rule lives only in the hook.

## Run 2: tenant column removed from the service

Questions 4 and 5 removed: the target lookup skipped, the `DELETE` filtering by `user_id` only. Hook in place.

Ali sends `DELETE /organizations/A/members/Selim`: his **own** organization, the victim's member.

| attack                            | result | what happened                                            |
| --------------------------------- | ------ | -------------------------------------------------------- |
| 3 remove through own organization | ✖      | `204`; Selim's membership in **V** was deleted           |
| 4 staff escalation                | ✖      | side effect: Selim is no longer in V, so `404` not `403` |
| 1, 2, 5, 6, 7                     | ✔      |                                                          |

This time data was lost. Ali passed questions 2 and 3 honestly, he is an owner of A. Nothing asked whether the record he named belongs to A.

## What each defence is for

| defence                    | answers                                       | missing means                    |
| -------------------------- | --------------------------------------------- | -------------------------------- |
| role check on the route    | may this person act in this organization?     | information leak, wrong statuses |
| tenant column in the query | does this record belong to this organization? | cross-tenant write               |

Rules that follow:

- The actor comes from the session. An id in the URL or body is a target, never the caller.
- Authorization is decided by the actor's role, not the target's.
- Every query on tenant-owned data carries the tenant column in its `WHERE`, even when a check a few lines above makes it look redundant. The check above can be removed by a refactor; the `WHERE` is the last line.
- A non-member and a nonexistent organization get the same answer.

## Kept

`tenant-isolation.test.ts` stays as a regression suite. Every new organization-scoped endpoint adds its attacks there.
