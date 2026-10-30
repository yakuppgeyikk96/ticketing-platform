# Dev image for every app in the monorepo. No source is copied: compose bind
# mounts the repo at /workspace and the `deps` service runs `pnpm install`
# into named volumes, so native modules (argon2, esbuild) are built for Linux
# instead of being shadowed by the macOS node_modules on the host.
FROM node:24-bookworm-slim

# Keep in sync with "packageManager" in package.json.
RUN npm install -g pnpm@12.3.4

WORKDIR /workspace
