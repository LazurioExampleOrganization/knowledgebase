# AgentMint Knowledgebase TODO

Tento dokument popisuje aktuální stav knowledgebase modulu.

## Current baseline

- [x] Kanonické stránky žijí v `data/v2/docs`.
- [x] Navigace žije v `data/v2/sidebar.ts`.
- [x] Runtime používá Astro/Starlight.
- [x] Lokální editor server authoruje kanonický docs strom a sidebar přes Git.
- [x] Root dokumenty drží governance, architekturu a pravidla pro agenty.
- [x] Modul je napojený na upstream Lazurio knowledgebase šablonu jako
  `upstream`.
- [x] v1 runtime byl převeden na jediný target v2; migrační a retirement
  nástroje zůstávají verzované pro bezpečné fork synchronizace.

## Current goals

- Začít plnit AgentMint foundations: mission, glossary, mechanism model a
  guardrails.
- Přenášet sem až stabilní lessons learned z research a experiment modulů.
- Zabránit návratu k paralelnímu root markdown corpusu.
- Držet metadata contract jednoduchý a auditovatelný.

## Next

- [ ] Dopsat `00-governance/authoring-standard.md` pro AgentMint statusy a
  ověřování.
- [ ] Dopsat `01-foundations/glossary-and-aliases.md` z root `GLOSSARY.md`.
- [ ] Doplnit první stránku k AgentMint mechanism modelu v
  `05-business-and-market/`.
- [ ] Přidat první decision log entry do `08-roadmap-and-decisions/`.

## Risks to watch

- Zkopírování cizího brandu, obsahu, zákaznických dat nebo neveřejného know-how.
- Rozbití vazby mezi sidebar navigací a reálnými docs soubory.
- Přidání druhé authoring vrstvy mimo Git.
- Uložení hypotézy jako důkazu bez odkazu na research nebo experiment.
