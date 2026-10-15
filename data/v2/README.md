# Knowledgebase data v2

Tahle složka je Organization-owned source of truth Knowledgebase v2.

- `docs/` drží kanonické Markdown/MDX stránky a případné lokální assets.
- `public/` drží Organization-owned soubory publikované na stabilních root URL.
- `sidebar.ts` drží deklarativní navigaci.
- `knowledgebase.json` identifikuje datový kontrakt.
- `v2-target.json` deklaruje kontrolovatelný cílový layout a migrační corpusy.

Aplikační runtime v `app/v2` data pouze čte. Při vědomém fork syncu se
`data/v2/**` nikdy nepřebírá z template přes vlastní obsah Organizace.
