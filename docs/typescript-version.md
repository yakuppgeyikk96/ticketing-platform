- The latest version of TypeScript is 7, which is Go-rewritten version of the compiler.

- But the ecosystem hasn't caught up yet; typescript-eslint doesn't support TS 7

- Our decision: TypeScript 6.0.3 for now. Reason: We need the type-aware lint rule and the no-floating-promises feature, and that's tied to the TS 6 API. We'll do a lab later on migrating to TS 7 and measure the compile time.
