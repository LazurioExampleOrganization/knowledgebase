# Knowledgebase

The knowledgebase of **Lazurio Example Organization**, Lazurio's public
reference Organization. All content is fictional.

It holds the Organization's own durable knowledge: strategy, guardrails,
lessons learned, decision logic and stable vocabulary. Raw research,
experiment logs and financial evidence stay in their own modules; this module
receives the generalised lesson that should outlive a single sprint.

The module follows the
[Lazurio Module Standard](https://github.com/HumanAndMachines/Lazurio/blob/main/manual/module-standard.md).
It is document-native: the pages are Markdown in Git, and the App is a
read-only viewer.

## Layout

| Path | Holds |
|---|---|
| `data/v2/docs/` | The canonical pages, in English |
| `data/v2/sidebar.ts` | The navigation |
| `data/v2/public/` | Files published at stable root URLs |
| `app/v2/` | The viewer App (Astro and Starlight, TypeScript) |
| `lazurio.module.json` | Module id, port lease and Apps |

## Run it

Start the App through Lazurio, for example `lazurio module start
LazurioExampleOrganization/knowledgebase`, or open it from the Launchpad. The
App reads its host and port only from the listener that Lazurio assigns; run
directly without it, it refuses to start.

## Develop

```sh
cd app/v2
bun install --frozen-lockfile
bun run prepare:app   # astro sync: generates the content types
bun run check         # astro check and biome
bun test              # content contract and start contract
bun run build         # static build
```

## Origin

The module started from a pre-standard copy of a Lazurio knowledgebase
template. It has no template upstream: it was converted to the Module
Standard by hand and is maintained here on its own.
