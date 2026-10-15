---
title: "Content lifecycle"
description: "How a knowledgebase page moves from draft to canonical truth."
status: "draft"
owner: "founder"
confidence: "template"
source_type: "template"
---

Use a simple status model:

- `draft` — useful working note, not yet verified
- `review` — ready for human review
- `canonical` — approved current truth

## Recommended flow

1. Create a page with a clear owner and source.
2. Add source references to `source_paths`.
3. Separate current truth from open questions.
4. After review, change `status` to `canonical`.
5. For major changes, update changelog or decision log.

