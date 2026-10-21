# Knowledgebase: rules for agents

This repository is the knowledgebase module of Lazurio Example Organization.
These rules add to the Organization root `AGENTS.md`.

## Scope

- One repository is one module: `lazurio.module.json` sits in the root and the
  App lives in `app/v2/`.
- The slot, Teams and access are declared in the Organization root's
  `modules.manifest.json`. Change them with a pull request to the root, not
  here.
- One change, one worktree, one branch, one pull request. The primary checkout
  stays on `main`.

## What belongs here

- Generalised, durable knowledge: strategy, guardrails, lessons learned,
  decision logic and vocabulary.
- Raw sources, longlists and mechanism scans belong in the `research` module;
  experiment specs, run logs, metrics and stop or scale decisions belong in
  `experiments`. Bring only the lesson learned here and link to its evidence.
- Never bring in other companies' data, paid content, secrets, platform
  accounts or identity.

## Content rules

- Add pages only to `data/v2/docs/`. Every page declares its `title` in
  frontmatter.
- Keep the navigation in `data/v2/sidebar.ts` by hand; every entry must point
  at an existing page (the tests check it).
- Write pages in English. The knowledgebase has a single locale.
- When you change a source-of-truth boundary, update `ARCHITECTURE.md` in the
  same pull request.
- No machine-specific absolute paths in documents.

## Lazurio Module Standard

- `dev` starts one Astro server and nothing else; `prepare:app` (`astro sync`)
  is the preparation and `check:prepared` checks it.
- Opened from `main`, the App runs as its static build (`build_output:
  "dist"`, Module Standard 4.5). `build` (`astro build`) must succeed without
  the listener and write `dist/index.html` for the health path `/`; the static
  build stays in `build`, never in `prepare:app`. The build contract test
  checks both.
- The App reads its host and port only from
  `LAZURIO_RUNTIME_LISTENER_APP_HOST` and `_PORT` through `@lazurio/module-kit`
  and exits with code 2 without them. The port lives only in
  `lazurio.module.json`.
- No `.env*` files, secrets in the repository or imports from outside this
  repository.
- A deviation is fixed in the module, never with an exception in the
  Launchpad.

## Verification before a pull request

```sh
cd app/v2
bun install --frozen-lockfile
bun run check
bun test
lazurio module setup <path to the module> --root <Lazurio Folder> --json
```

The expected `module setup` status is `current`.
