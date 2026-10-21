# Changelog: knowledgebase

Date versions: `YYYYMMDD`. Several separate notable changes on one day use
`YYYYMMDD.2`, `YYYYMMDD.3` and so on.

## 20261020

### Changed

- Opened from `main`, the viewer App runs as its static build instead of the
  Astro development server: `app/v2/package.json` declares `build_output:
  "dist"` and `static_fallback: "404"`, and the Launchpad builds the commit
  (`astro build`), serves `dist/` with its own small static server and builds
  again after a pull (Module Standard 4.5, LazurioPlatform F58). `dev` stays
  the preview from a worktree. A build contract test checks that the build
  succeeds without the listener and that the health path `/` is a file of
  the output.

## 20261016.2

### Changed

- The knowledgebase is English only. The Czech locale is removed and the
  English pages are the single root locale, so `/` answers 200 and is the
  health path; the `/` → `/cs/` redirect is gone.
- The sidebar and the pagination labels are English ("Overview").
- Pages name the Organization "Lazurio Example Organization" and point to the
  workspace modules in `workspace/`; `TODO.md` is an English status page.

### Removed

- `03-technology-and-architecture/data-platform-history.md`, which existed
  only in Czech and described template lineage, not the company.

## 20261016

### Changed

- Adopted the Lazurio Module Standard. The viewer App is TypeScript only and
  reads its listener through `@lazurio/module-kit`; preparation (`astro
  sync`) and a single-process `dev` are declared in `app/v2/package.json`;
  Bun is pinned to 1.4.2 with a fresh `bun.lock`; `bun run check` (astro
  check and biome) and `bun test` (content and start contracts) run in CI on
  Ubuntu.
- The port lease moved into the Organization pool (`main` 5286 → 25300). The
  second listener for the local editor and its exception policy are gone.
- Pages are read from `data/v2/docs` through a `glob` loader instead of a
  symlink in the App.
- The App id is `lazurioexampleorganization-knowledgebase-v2`.

### Removed

- The local editor (`editor/v2`), the shared runtime listener script, the
  finished v1 to v2 migration tools (`migrations/v2`, `v2-target.json`), the
  unused title helpers, `SUMMARY.md`, the template fork notes and
  `TEMPLATE_VERSION`. The module has no template upstream.

## 20260523

- The knowledgebase was set up from a Lazurio knowledgebase template with
  Astro and Starlight, and its identity, governance and first foundations
  pages were written for the Organization.
