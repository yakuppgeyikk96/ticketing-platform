# Lab 00: ESM / CJS boundary and the dual-package hazard

Branch `lab/esm-cjs`, thrown away after the experiment. Node 24.18, pnpm 12.3.

## Setup

`@ticketing/contracts` is a pure ESM workspace package consumed by `@ticketing/api` (ESM). We changed its format step by step and watched what Node does.

## 1. ESM imports CJS: named import works... sometimes

`index.cjs` with `exports.API_VERSION = "0.0.1"` → `import { API_VERSION }` from ESM **works**.
Node cannot execute CJS before linking ESM, so it scans the CJS source text with `cjs-module-lexer` and synthesizes named exports for patterns it recognizes.

Same package, `module.exports = build()` → `SyntaxError: The requested module '@ticketing/contracts' does not provide an export named 'API_VERSION'`, thrown at `#asyncInstantiate`, before any code runs. The lexer cannot see through a function call.

Fix: `import contracts from "@ticketing/contracts"` then `contracts.API_VERSION`. The whole `module.exports` object is always the `default` export. Named exports from CJS are a guess; default is a guarantee. This is why `lodash-es` exists next to `lodash`.

## 2. CJS requires ESM

`require("@ticketing/contracts")` from a `.cjs` file **works** on Node 24 and returns `[Module: null prototype] { API_VERSION: '0.0.1' }`: a module namespace object, not a plain object.

Add `await Promise.resolve()` at the top level of the ESM file → `ERR_REQUIRE_ASYNC_MODULE: require() cannot be used on an ESM graph with top-level await`. `require` is synchronous; a module with top-level await is asynchronous by definition. A library that uses top-level await locks out every CJS consumer.

## 3. Dual package: two copies of one module

`exports: { ".": { "import": "./src/index.ts", "require": "./src/index.cjs" } }`, both files export `registry = new Set()`.
In one process: `require()` then `import()` the same package name.

```
esm registry: Set(0) {}
cjs registry: Set(1) { 'from-cjs' }
same object? false
```

Two files, two module instances, two singletons. No error anywhere. Real-world shapes of this bug: `instanceof` on an error class always false, two connection pools, a `configure()` call that "has no effect". You rarely trigger it yourself; a CJS dependency that requires the same package does.

Way out: publish one format. On Node 22.12+ `require(esm)` works, so pure ESM serves both sides with a single instance. Our contracts package stays pure ESM.

## 4. Transitive weight

Declared packages: 7. Unique packages in `node_modules/.pnpm`: 102. `pnpm why semver` shows it arriving through five typescript-eslint sub-packages, deduplicated to one copy.

## What we keep

- Contracts stays pure ESM; no dual build.
- `.cjs` / `.mjs` extensions override `package.json#type`; `.ts` follows the nearest `type`.
- When the editor and the CLI disagree, trust the CLI and restart the TS server.
