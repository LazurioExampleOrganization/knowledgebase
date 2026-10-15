---
title: "Nápady na první aplikaci pro Agent Automation Desk"
description: "Strategický brief pro první app směr navázaný na produktizovanou agentní automation službu."
status: "review"
owner: "founder"
last_verified: "2026-05-23"
confidence: "strategy-hypothesis"
source_type: "experiment-derived-strategy-brief"
source_paths:
  - "AgentMint/modules/experiments/specs/2026-05-23-agent-automation-desk.md"
  - "AgentMint/modules/experiments/shortlists/2026-05-23-first-monetization-experiments.md"
  - "AgentMint/modules/experiments/assets/agent-automation-desk-offer.md"
  - "https://www.designjoy.co/"
  - "https://www.fiverr.com/resources/guides/costs/ai-automation-experts"
  - "https://www.fiverr.com/resources/guides/reports/freelancing-and-future-of-work-statistics"
  - "https://zapier.com/playbooks/2026-trends"
aliases:
  - "Agent Automation Desk Portal"
  - "Automation Triage App"
  - "AI Ops Runbook Builder"
  - "first app ideas"
---

Tenhle brief zachycuje první app nápady pro AgentMint. Navazuje na experiment
**Agent Automation Desk**: produktizovanou agentní automation službu s jednou
aktivní request frontou, lidským schvalováním externích akcí a rychlým
dodáním malých provozních výstupů.

## Aktuální doporučení

Nestavět hned veřejný AI SaaS. První aplikace má být **interní delivery appka
pro Agent Automation Desk**, která pomůže dodat placené piloty, učit se z
requestů a teprve potom rozhodnout, co má smysl vystavit klientům jako
produkt.

Priorita:

1. **Agent Automation Desk Portal** jako interní request queue a delivery
   workflow.
2. **Automation Triage App** jako úzký diagnostický vstup pro nové leady.
3. **AI Ops Runbook Builder** jako opakovatelný výstup vznikající z delivery.

Veřejný klientský portál má smysl až po 2-3 placených pilotech, pokud se
opakují stejné typy requestů a delivery se vejde do rozumného času.

## 1. Agent Automation Desk Portal

Mechanismus: klient nebo interní operátor zadá request, přiloží kontext,
AgentMint ho zařadí do fronty, drží stav, připraví výstup a člověk schválí
delivery.

Proč dává smysl:

- odpovídá modelu productized service: fixed fee, queue, jeden aktivní request
  najednou
- pomáhá doručovat piloty před stavbou plného SaaS
- každý request zároveň vytváří data pro budoucí playbooky
- drží bezpečnou hranici: agent připravuje, člověk schvaluje externí akce

První MVP:

- intake formulář
- request queue se statusy
- pole pro scope, rizika, delivery typ a human approval
- delivery summary
- jednoduchý log, jestli byl request repeatable / one-off / out-of-scope

Riziko: appka může zakrýt hlavní otázku, jestli někdo za službu platí. Proto
má být nejdřív interní a co nejmenší.

První test: použít ji ručně u prvního placeného nebo discovery pilotu a měřit,
jestli zkracuje triage a drží kvalitu výstupu.

## 2. Automation Triage App

Mechanismus: uživatel popíše jeden ruční nebo opakovaný proces a appka vrátí
fit / no-fit verdikt, první měřitelný výstup, rizika, odhad pracnosti a návrh
dalšího kroku.

Proč dává smysl:

- dá se použít jako lead magnet nebo placený mini-produkt
- filtruje špatné requesty před discovery callem
- učí AgentMint, jaké procesy se opakují napříč zákazníky
- dobře sedí k nabídce 48h AI ops triage

První MVP:

- formulář pro popis procesu
- scoring podle opakovatelnosti, dostupnosti dat, rizika a business hodnoty
- výstup ve formátu automation briefu
- doporučení: testovat, odložit, zahodit, nebo navrhnout pilot

Riziko: pokud bude appka příliš obecná, sklouzne do "AI konzultace" bez
jasného nákupního momentu.

První test: dát ji několika fiktivním ukázkovým zájemcům jako strukturovaný pre-call intake a
sledovat, jestli vede ke kvalifikovaným callům nebo placenému pilotu.

## 3. AI Ops Runbook Builder

Mechanismus: z popisu ručního procesu a dodaných podkladů vznikne SOP,
checklist, datový model, automation blueprint a approval gates.

Proč dává smysl:

- výstup je užitečný i bez produkční integrace
- z delivery vzniká opakovatelná znalost pro playbooky
- snižuje riziko nekontrolované automatizace, protože pojmenovává guardrails
- dobře funguje pro firmy, které ještě nemají čistá data ani jasný proces

První MVP:

- vstupní šablona procesu
- generátor SOP/checklistu
- sekce "co neautomatizovat"
- seznam potřebných dat, nástrojů a approval kroků
- export do klientsky čitelného dokumentu

Riziko: může být hodnotné, ale méně blízko přímé platbě než request portal.
Nejlepší je stavět ho jako delivery komponentu, ne jako samostatný produkt
hned od začátku.

První test: použít ho jako výstup z prvních 3 requestů a vyhodnotit, jestli
klient chápe hodnotu runbooku bez dalšího vysvětlování.

## Důkazy a signály

- AgentMint experiment spec doporučuje nejdřív produktizovanou službu před
  stavbou SaaS.
- DesignJoy potvrzuje mechanismus fixed fee, request queue a one-at-a-time
  delivery jako funkční productized service pattern.
- Fiverr uvádí aktivní tržní poptávku po AI automation a workflow službách a
  veřejné cenové rozpětí projektů.
- Zapier 2026 trends podporují tezi, že firmy řeší orchestration, governance,
  quality gates a human approval, nejen samotné modely.

## Rozhodovací pravidlo

Appka má vzniknout až tam, kde zjednodušuje placenou delivery nebo zvyšuje
kvalitu rozhodnutí. Pokud nepomáhá získat pilot, zkrátit triage, snížit riziko
nebo převést opakovaný request do playbooku, je zatím předčasná.
