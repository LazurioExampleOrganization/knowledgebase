# Knowledgebase architecture

## Role

The knowledgebase is:

- the highest authority for the Organization's private know-how;
- a Git-native documentation module on Astro and Starlight;
- the source from which wikis, public documentation, the website,
  presentations or delivery material may be derived.

It is not public documentation, a marketing website, a CMS or a database, a
browser-editable backend outside Git, or a store for secrets, credentials or
OAuth session data.

## Source of truth

- Pages: `data/v2/docs/`, Markdown or MDX with frontmatter, in English. This
  is the only page corpus.
- Navigation: `data/v2/sidebar.ts`.
- Static files: `data/v2/public/`.
- Data contract marker: `data/v2/knowledgebase.json`.

Root documents (`README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`)
describe the module; they are never a second content corpus.

## Runtime

`app/v2` is the viewer App:

- Starlight reads the pages through Astro's `glob` loader pointed at
  `data/v2/docs` (the same loader Starlight uses by default, with a different
  base), so the content needs no symlink or copy step;
- `data/v2/sidebar.ts` is the navigation authority and `data/v2/public` is
  the public directory;
- the App only reads data. Authoring happens in Git, through pull requests.

The App follows the Lazurio Module Standard. Its single lease `main` lives in
`lazurio.module.json`, inside the Organization's port pool. The App reads its
listener only from `LAZURIO_RUNTIME_LISTENER_APP_*` through
`@lazurio/module-kit` and refuses to start without it; the config reads it
only when Astro serves, never during `astro build`. The preparation is
`astro sync`. Opened from `main`, the App runs as its static build
(`build_output: "dist"`, Module Standard 4.5): the Launchpad runs `build`
(`astro build`, without the listener), serves `dist/` with its own small
static server and builds again after a pull. `dev` runs one Astro server, for
a preview from a worktree or an explicit development start. The knowledgebase
has one locale, English, at the root, so the health path `/` is
`dist/index.html` and answers 200 without a redirect.

## Metadata contract

Pages may declare `title` (required), `description`, `status`, `owner`,
`last_verified`, `confidence`, `source_type`, `source_paths` and `aliases`.
The metadata serves rendering, search and auditability; it never becomes a
separate database source of truth.

## Information architecture

1. `00-governance/`: authoring rules, lifecycle and the source map.
2. `01-foundations/`: the company, vocabulary and mission.
3. `02-product-and-ecosystem/`: the product or service model.
4. `03-technology-and-architecture/`: technical systems and integrations.
5. `04-delivery-and-operations/`: delivery, operations and processes.
6. `05-business-and-market/`: market, customers, positioning and pricing.
7. `06-company-operating-system/`: roles, tooling, cadence and source systems.
8. `07-case-studies-and-media/`: references, story assets and proof points.
9. `08-roadmap-and-decisions/`: focus, decision log and open questions.

## Invariants

- `data/v2/docs` is the only page corpus and `data/v2/sidebar.ts` the only
  navigation.
- Derived artefacts (`.astro/`, `dist/`) are rebuilt from Git and never
  committed.
- Secrets, platform accounts, raw exports and third-party customer data never
  enter the module.
- When a pattern is adapted from elsewhere, the pattern travels, never the
  data or the strategy.
