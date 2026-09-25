# Deployment and updates

Public game: https://oddly-true.lucky-upay.chatgpt.site

| | Local | Public |
| --- | --- | --- |
| Entry point | `server/index.js` | `server/worker.js` |
| State | Process memory | Shared D1 rooms |
| Updates | SSE | Approximately 900 ms polling |
| Restart | Rooms reset | Compatible room state survives |
| Configuration | `PORT`, `HOST` | Managed `DB` and `ASSETS` bindings |

Sites hosts the game on Cloudflare Workers. GitHub stores source and runs checks; a push **does not automatically deploy**. No deployment credentials are stored in Git.

## Build

`npm run build` generates `dist/server/index.js`, its Worker configuration, and browser files in `dist/client/`. Build output is ignored by Git. `.openai/hosting.json` contains the existing Site identity and logical binding, not a secret. Publishing requires the owning account's authorised Sites workflow.

## Release workflow

1. Branch from `main` with `feat/...`, `fix/...` or `chore/...`.
2. Run syntax checks, tests and build.
3. Open a PR explaining purpose, behaviour and verification.
4. Review and merge after checks pass; tag a tested submission when appropriate.
5. Publish merged source through the existing Sites workflow and wait for successful deployment status.
6. Perform the relevant [manual checks](testing.md). Use a quiet period for changes to room state, rules or protocol.

Edit `db/schema.ts` and run `npm run db:generate` for schema changes. Inspect and commit SQL plus metadata. Never rewrite an applied migration. Stored room JSON must remain readable across a compatible release.

To roll back, revert source on a branch, verify and publish a new version. A code rollback does not reverse a database migration. There is no separate staging deployment or automatic GitHub-to-production pipeline yet; local checks and preview builds are the pre-publication gates.
