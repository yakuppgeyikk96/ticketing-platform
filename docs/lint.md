# Lint and format: ESLint + Prettier

**Decision:** ESLint with typescript-eslint in type-aware mode, Prettier for formatting.

**Why not Biome:** Biome is one Rust binary that lints and formats, and it is much faster. We still chose ESLint for a single rule: `@typescript-eslint/no-floating-promises`. It catches a promise that is neither awaited nor handled, the most common silent bug in Node code (Backend map 01.2: "lost await, floating promise detection"). The rule needs full type information, and only typescript-eslint has that maturely today.

**Cost we accept:** slower lint, two tools instead of one, and typescript-eslint lags behind new TypeScript majors (see `typescript-version.md`).

**When to revisit:** when Biome's type-aware `noFloatingPromises` covers cross-file inference, or when typescript-eslint supports TypeScript 7. Measure lint time on CI before and after.
