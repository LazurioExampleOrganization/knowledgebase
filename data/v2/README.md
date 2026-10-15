# Knowledgebase data v2

This directory is the Organization-owned source of truth of the knowledgebase.

- `docs/` holds the canonical Markdown or MDX pages, in English.
- `public/` holds files published at stable root URLs.
- `sidebar.ts` holds the declarative navigation.
- `knowledgebase.json` identifies the data contract.

The App in `app/v2` only reads this data.
