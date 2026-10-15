---
title: "Source map and ingestion plan"
description: "Mapa zdrojů, ze kterých se knowledgebase doplňuje."
status: "draft"
owner: "founder"
confidence: "workspace-baseline"
source_type: "workspace-root-docs"
---

Sepiš, odkud se smí knowledgebase plnit a jakou autoritu jednotlivé zdroje
mají.

## Zdrojová mapa

| Zdroj | Role | Autorita | Poznámka |
|---|---|---:|---|
| `AgentMint/README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `GLOSSARY.md` | Workspace baseline a pravidla | HIGH | Root dokumenty určují základní hranice AgentMintu. |
| `modules/research/` | Zdroj mechanism scans a evidence | MEDIUM | Do knowledgebase přenášej až zobecněný poznatek. |
| `modules/experiments/` | Zdroj výsledků testů a stop/scale rozhodnutí | HIGH | Lesson learned musí odkazovat na experiment evidence. |
| `modules/playbooks/` | Ověřené opakovatelné postupy | HIGH | Playbook může zpětně odkazovat na knowledge princip. |

## Ingestion pravidla

- Nepřenášej raw exporty bez čtení.
- U klientských dat nejdřív urč access boundary.
- Duplicitní zdroje konsoliduj do jedné kanonické stránky.
- Derived povrchy jako web nebo prezentace neber jako vyšší autoritu než
  knowledgebase.
