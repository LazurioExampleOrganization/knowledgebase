---
title: "Authoring standard"
description: "Základní standard psaní a údržby knowledgebase stránek."
status: "draft"
owner: "founder"
confidence: "template"
source_type: "template"
---

Piš tak, aby stránku mohl použít člověk i agent.

## Pravidla

- Jedna stránka má mít jedno jasné téma.
- Rozhodnutí piš jako aktuální pravdu, ne jako volný brainstorm.
- Nejistotu označ přímo v textu nebo v `confidence`.
- Citlivé informace drž za jasně pojmenovanou access boundary.
- Nepoužívej absolutní lokální cesty typu `/Users/...`.

## Frontmatter

Minimální doporučené pole:

```yaml
title: "Název stránky"
description: "Jednovětý popis, k čemu stránka slouží."
status: "draft"
owner: "founder"
confidence: "template"
source_type: "template"
source_paths:
  - "<VYPLNIT_SOURCE>"
aliases:
  - "<VYPLNIT_ALIAS>"
```

