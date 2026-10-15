---
title: "Source map and ingestion plan"
description: "Map of sources used to populate and verify the knowledgebase."
status: "draft"
owner: "founder"
confidence: "workspace-baseline"
source_type: "workspace-root-docs"
---

Describe where knowledgebase content may come from and how authoritative each
source is.

## Source map

| Source | Role | Authority | Notes |
|---|---|---:|---|
| `AgentMint/README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `GLOSSARY.md` | Workspace baseline and rules | HIGH | Root docs define AgentMint's baseline boundaries. |
| `modules/research/` | Source for mechanism scans and evidence | MEDIUM | Move only generalized lessons into knowledgebase. |
| `modules/experiments/` | Source for test results and stop/scale decisions | HIGH | Lessons learned should link back to experiment evidence. |
| `modules/playbooks/` | Verified repeatable processes | HIGH | A playbook may link back to a knowledge principle. |

## Ingestion rules

- Do not import raw exports without reading them.
- Set access boundaries before adding customer data.
- Consolidate duplicate sources into one canonical page.
- Do not treat derived surfaces such as website or slides as more
  authoritative than knowledgebase.
