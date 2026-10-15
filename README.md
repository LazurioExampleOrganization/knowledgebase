---
title: "AgentMint Knowledgebase"
description: "Privátní Git-native knowledgebase modul pro AgentMint."
---

# AgentMint Knowledgebase

`AgentMint Knowledgebase` je privátní knowledgebase modul pro Workspace GEN2.
Je založený jako upstream-compatible fork repozitáře
upstream Lazurio knowledgebase šablony a přizpůsobený pro AgentMint.

Kanonické knowledge stránky žijí v
`data/v2/docs`, navigace v `data/v2/sidebar.ts` a root soubory
slouží jako governance vrstva modulu.

Do modulu patří jen vlastní znalosti AgentMintu: strategie, guardrails,
lessons learned, rozhodovací logika a stabilní principy. Surový research,
experiment logy a finanční evidence zůstávají v příslušných modulech.

## K čemu slouží

Do knowledgebase patří materiály, které mají být vyšší autoritou než wiki,
web, prezentace nebo veřejná dokumentace:

- strategie a rozhodnutí
- doménový slovník a aliasy
- produktový, servisní nebo delivery model
- technická a systémová architektura
- interní operating model
- case studies, proof points a reusable narrative assets
- roadmapa, decision log a otevřené otázky

## Struktura

- `app/v2/` — Astro/Starlight runtime, který čte Organization-owned data v2
- `editor/v2/` — lokální Git-native editor server pro `data/v2/docs`
- `data/v2/docs/cs` — české knowledge stránky
- `data/v2/docs/en` — anglické knowledge stránky
- `data/v2/sidebar.ts` — kanonická navigační hierarchie
- `migrations/v2/` — opakovatelný v1→v2 migrátor, retirement generator a
  v2-only kontrola pro synchronizace forku
- `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `TODO.md` — governance dokumenty
- `SUMMARY.md` — jen kompatibilní marker pro starší root-based modely
- `TEMPLATE.md` — poznámky k původu ve šabloně a údržbě forku

## Praktické příkazy

```bash
cd app/v2
bun install
bun test
bun run check
bun run build
```

## Pracovní princip

AgentMint kopíruje mechanismy, ne cizí identitu, obsah, účty ani zákaznická
data. Každý trvalý poznatek má být formulovaný jako vlastní AgentMint princip
a má odkazovat na zdrojový research, experiment nebo rozhodnutí, pokud z něj
vznikl.

- jedna kanonická cesta pro knowledge pages
- Git-native authoring
- Starlight runtime
- explicitní sidebar
- jednoduchý frontmatter contract
- root governance mimo hlavní page corpus
