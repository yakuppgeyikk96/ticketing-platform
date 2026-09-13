# Schema notes

Conventions: table names plural, snake_case. Every table has `created_at` and `updated_at` (`timestamptz`, not null, default `now()`). Primary keys are UUIDv7. Money is integer minor units (kuruş), never float. Time is stored in UTC.

## Identity and tenancy

### users

Who logs in. A person, never an organization.

| column        | type        | constraints                              | note                                                         |
| ------------- | ----------- | ---------------------------------------- | ------------------------------------------------------------ |
| id            | uuid        | pk, default uuidv7()                     |                                                              |
| email         | text        | not null, unique index on `lower(email)` | DB enforces case-insensitive uniqueness; app also normalizes |
| password_hash | text        | nullable                                 | argon2id output; null for OIDC-only accounts (slice 4)       |
| full_name     | text        | nullable                                 | required at checkout, not at signup                          |
| created_at    | timestamptz | not null, default now()                  |                                                              |
| updated_at    | timestamptz | not null, default now()                  |                                                              |

Product decision: guest checkout exists. Orders therefore carry buyer name and email themselves; `user_id` on an order will be nullable.

### organizations

The tenant. A company or a venue operator, not a person. Owns events.

| column      | type        | constraints             | note                                                    |
| ----------- | ----------- | ----------------------- | ------------------------------------------------------- |
| id          | uuid        | pk, default uuidv7()    |                                                         |
| name        | text        | not null                | not unique; many honest "Anadolu Tiyatro" can exist     |
| slug        | text        | not null, unique        | public URL segment                                      |
| tax_number  | text        | nullable                | collected at verification, before payout, not at signup |
| logo_url    | text        | nullable                | file upload is a later slice                            |
| verified_at | timestamptz | nullable                | set when identity/tax documents are verified            |
| created_at  | timestamptz | not null, default now() |                                                         |
| updated_at  | timestamptz | not null, default now() |                                                         |

Duplicate organizations are a verification problem, not a data-integrity problem. No constraint can tell a real "Zorlu PSM" from a fake one; the payout verification step does.

### organization_members

Which users act on behalf of which organization, and with what role.

| column          | type        | constraints                                    | note                |
| --------------- | ----------- | ---------------------------------------------- | ------------------- |
| user_id         | uuid        | fk users(id)                                   |                     |
| organization_id | uuid        | fk organizations(id)                           |                     |
| role            | text        | not null, check in ('owner', 'admin', 'staff') | fixed roles for now |
| created_at      | timestamptz | not null, default now()                        |                     |
| updated_at      | timestamptz | not null, default now()                        |                     |

Primary key is `(user_id, organization_id)`: one membership per person per organization, no surrogate id.

**Invariant not expressible in the schema:** every organization has at least one owner. A CHECK constraint sees one row only. Enforced in the application inside a transaction: creating an organization inserts the creator as owner in the same transaction; demoting or removing an owner first locks the organization row, counts owners, and refuses if this is the last one (slice 7). Per-organization custom roles are deferred; if needed they arrive via expand/contract.
