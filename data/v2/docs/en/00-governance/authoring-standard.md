---
title: "Authoring standard"
description: "Baseline writing and maintenance rules for knowledgebase pages."
status: "draft"
owner: "founder"
confidence: "template"
source_type: "template"
---

Write so a page can be used by both humans and agents.

## Rules

- One page should have one clear topic.
- Write decisions as current truth, not loose brainstorming.
- Mark uncertainty directly in text or in `confidence`.
- Keep sensitive information behind a clear access boundary.
- Do not use local absolute paths such as `/Users/...`.

## Frontmatter

Recommended minimum:

```yaml
title: "Page title"
description: "One-sentence description of what this page is for."
status: "draft"
owner: "founder"
confidence: "template"
source_type: "template"
source_paths:
  - "<FILL_SOURCE>"
aliases:
  - "<FILL_ALIAS>"
```

