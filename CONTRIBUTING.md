# Contributing

Use Node.js 24 and `npm ci`. Read [architecture](docs/architecture.md) before changing rules or persistence.

## Branches

- `main`: stable, reviewable version.
- Short-lived work branches: `feat/character-picker`, `fix/timer-reconnect`, `chore/docs`.
- Initial submission preparation: `chore/submission-ready`.
- No permanent `develop` branch is needed at this scale.

Keep commits focused. PRs should explain purpose, behaviour, verification and remaining manual checks. Prefer squash merging a small feature, then delete its branch. Do not force-push `main`. Branch protection is a GitHub setting; this document alone does not enforce it. Require the `check` CI job when configuring protection.

Run `npm run check`, `npm test`, and `npm run build` before submitting.

## Conventions

- Rules/host permissions belong in `server/game.js`; SQL belongs in `server/hosted.js`; HTTP belongs in the adapters.
- Escape user text rendered as HTML. Never commit or publish seat tokens or credentials.
- Test rule changes, concurrency and regressions with meaningful failure cases. Simple styling edits need visual checks, not tests that repeat implementation.
- Preserve keyboard use, labels, readable feedback and reduced motion.
- New facts need a verified true claim, two invented decoys, explanation, source and credited/licensed imagery.
- Preserve third-party licences. Do not commit dependencies, generated builds or runtime databases.

See [testing](docs/testing.md) and [deployment](docs/deployment.md). Cloudflare deploys commits on `main`; passing GitHub CI on another branch does not publish.
