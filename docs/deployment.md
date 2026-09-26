# Deployment and updates

Public game: https://oddly-true.oddlytrue-play.workers.dev

| | Local | Public |
| --- | --- | --- |
| Entry point | `server/index.js` | `server/worker.js` |
| State | Process memory | Shared Cloudflare D1 rooms |
| Updates | SSE | Approximately 900 ms polling |
| Restart | Rooms reset | Compatible room state survives |
| Configuration | `PORT`, `HOST` | `DB` and `ASSETS` bindings in `wrangler.jsonc` |

The game runs on Cloudflare Workers Free with a neutral `workers.dev` address. GitHub holds the source and runs checks. Cloudflare Workers Builds connects to this repository's `main` branch and automatically deploys it after a successful build. Preview builds are disabled. No deployment credentials are stored in Git.

## Build and database

`npm run build` generates `dist/server/index.js` and browser files in `dist/client/`. Build output is ignored by Git. The root `wrangler.jsonc` names the Worker, assets and D1 database; its database ID is a resource identifier, not a credential.

The D1 database `oddly-true` stores room state. Its initial `rooms` table and expiry index were created from `drizzle/0000_fat_cable.sql` in Cloudflare's SQL console. The existing database was initialized manually, so the initial migration is not recorded in Wrangler's migration ledger. Do not apply `0000_fat_cable.sql` again to this database. For later schema changes, generate and inspect new SQL, plan how to record or apply it to this database, and keep stored room JSON compatible with the new code.

## Release workflow

1. Branch from `main` with `feat/...`, `fix/...` or `chore/...`.
2. Run `npm run check`, `npm test`, `npm run build`, and a Wrangler deployment dry run for Worker/config changes.
3. Open a PR explaining purpose, behaviour and verification.
4. Review and merge after checks pass. Cloudflare Builds installs dependencies, runs `npm ci && npm run build`, then `npx wrangler deploy` from the repository root.
5. Wait for Cloudflare's successful build/deployment status and perform the relevant [manual checks](testing.md). Use a quiet period for changes to room state, rules or protocol.

To roll back code, revert the commit and merge it to `main`; Cloudflare deploys the revert. A code rollback does not reverse a database change. Running out of Free plan request or D1 quotas can make the public game temporarily unavailable until limits reset.
