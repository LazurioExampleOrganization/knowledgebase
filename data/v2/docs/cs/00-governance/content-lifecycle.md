---
title: "Content lifecycle"
description: "Jak se knowledgebase stránka posouvá od draftu ke kanonické pravdě."
status: "draft"
owner: "founder"
confidence: "template"
source_type: "template"
---

Používej jednoduchý stavový model:

- `draft` — pracovní poznámka, užitečná, ale neověřená
- `review` — připravené k lidské kontrole
- `canonical` — schválená aktuální pravda

## Doporučený postup

1. Vytvoř stránku s jasným ownerem a zdrojem.
2. Doplň odkazy na podklady do `source_paths`.
3. Odděl aktuální pravdu od otevřených otázek.
4. Po kontrole změň `status` na `canonical`.
5. Při zásadní změně doplň changelog nebo decision log.

