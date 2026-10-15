---
title: "Datová platforma: šablonový kontext a evoluce"
description: "Archivní poznámka o Firebase/Firestore v šablonové linii AgentMintu a proč to pro AgentMint dnes není baseline."
status: "canonical"
owner: "founder"
confidence: "workspace-baseline"
source_type: "workspace-root-docs"
aliases:
  - "firebase"
  - "firestore"
  - "data platform history"
---

## Jedna věta

AgentMint sám žádnou aplikaci na Firebase/Firestore nikdy nepostavil ani
neprovozoval; zmínky o Firebase v tomto workspace jsou zděděný šablonový
kontext, ne popis reálné AgentMint integrace.

## Odkud zmínky pochází

`AgentMint` vychází z upstream Lazurio Organization šablony (a pro tenhle
modul z Lazurio knowledgebase šablony), jejíž generační historie sahá ke
GEN2 šablonám. V téhle širší šablonové linii platí:

- v1 aplikace historicky používaly Firebase/Firestore jako datastore;
- v1 data se přemigrovala do v2 Git filesystem database;
- v2 se dál migruje na `repository-db` v3.

Doctor tooling a část skillů zděděných z GEN2 katalogu proto obsahují
generické háčky pro Firebase mirror sync (`--firebase-production-synced` v
`company/scripts/doctor.sh`/`doctor.ps1`). U AgentMintu jsou to neaktivní,
stale zbytky — v `modules.manifest.json` má `firebase_dependent: false`
každý plánovaný slot a žádný modul AgentMintu Firebase mirror nemá.

## Co z toho platí pro AgentMint dnes

- AgentMint nemá a neplánuje Firebase/Firestore jako baseline datastore.
- Business zápisy jdou přes canonical writer ownera modulu; u budoucích v3
  modulů přes `repository-db` publikační flow (viz root `AGENTS.md`, blok
  Model spolupráce, sekce Publikace dat).
- Pokud budoucí modul skutečně přinese živou databázovou závislost, zapiš ji
  jako `firebase_dependent: true` (nebo jinou konkrétní hodnotu) u
  příslušného `module_slots[]` záznamu a popiš ji tady jako aktuální fakt, ne
  jako šablonovou domněnku.

## Co agent nesmí zaměnit

- Šablonový/GEN2 zbytek za živou AgentMint integraci.
- Stale flag v doctor toolingu za doporučený AgentMint pracovní postup.
