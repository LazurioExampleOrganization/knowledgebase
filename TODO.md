# Knowledgebase status

This document describes the current state of the knowledgebase module. Plans
and tasks of the Organization live in Mission Control; this file only lists
the module's baseline, goals and open content work.

## Current baseline

- [x] The canonical pages live in `data/v2/docs`, in English.
- [x] The navigation lives in `data/v2/sidebar.ts`.
- [x] The viewer App runs on Astro and Starlight under the Lazurio Module
  Standard.
- [x] Authoring happens in Git through pull requests; there is no local editor
  server.
- [x] The root documents hold the governance, architecture and agent rules.
- [x] The module has no template upstream; it is maintained here on its own.

## Current goals

- Fill in the company's foundations: mission, glossary, mechanism model and
  guardrails.
- Bring in only stable lessons learned from the research and experiment
  modules.
- Prevent a return to a parallel root Markdown corpus.
- Keep the metadata contract simple and auditable.

## Next

- [ ] Finish `00-governance/authoring-standard.md` with the company's statuses
  and verification rules.
- [ ] Finish `01-foundations/glossary-and-aliases.md` from the root
  `GLOSSARY.md`.
- [ ] Add the first page on the company's mechanism model in
  `05-business-and-market/`.
- [ ] Add the first decision log entry to `08-roadmap-and-decisions/`.

## Risks to watch

- Copying another company's brand, content, customer data or non-public
  know-how.
- Breaking the link between the sidebar and the real page files (the tests
  check it).
- Adding a second authoring layer outside Git.
- Storing a hypothesis as evidence without a link to research or an
  experiment.
