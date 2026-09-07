# tsconfig: why these flags

All apps and packages extend `packages/tsconfig/base.json`. `strict` is the floor, not the ceiling.

- **`module: nodenext`** — sets `moduleResolution` too. Whether a file is ESM or CJS is decided by the nearest `package.json` `type` field, exactly like Node does.
- **`noUncheckedIndexedAccess`** — `arr[0]` and `record[key]` are `T | undefined`. Kills the "cannot read property of undefined" class of runtime errors at compile time.
- **`exactOptionalPropertyTypes`** — `{ a?: string }` cannot be assigned `undefined` explicitly. "Key missing" and "key present but undefined" are different things in JSON and in the DB.
- **`verbatimModuleSyntax`** — type-only imports must be written as `import type`. The compiler never guesses which imports it can erase; in ESM a wrongly kept import is a runtime load.
- **`erasableSyntaxOnly`** — no `enum`, `namespace` with values, or parameter properties. Node 24 runs `.ts` by stripping types only and ignores tsconfig, so this flag catches syntax Node cannot run. Result: no build step in dev.
- **`noImplicitOverride`** — overriding a base class method requires the `override` keyword. Renaming the base method then fails loudly.
- **`skipLibCheck`** — do not type-check `.d.ts` files in `node_modules`. Faster, and third-party type conflicts are not ours to fix.
