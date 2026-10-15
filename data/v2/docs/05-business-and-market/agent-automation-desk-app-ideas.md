---
title: "First app ideas for Agent Automation Desk"
description: "Strategic brief for the first app direction connected to the productized agent automation service."
status: "review"
owner: "founder"
last_verified: "2026-05-23"
confidence: "strategy-hypothesis"
source_type: "experiment-derived-strategy-brief"
source_paths:
  - "experiments/specs/2026-05-23-agent-automation-desk.md"
  - "experiments/shortlists/2026-05-23-first-monetization-experiments.md"
  - "experiments/assets/agent-automation-desk-offer.md"
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

This brief captures the company's first app ideas. It builds on the
**Agent Automation Desk** experiment: a productized agent automation service
with one active request queue, human approval for external actions, and fast
delivery of small operational outputs.

## Current recommendation

Do not start with a public AI SaaS. The first app should be an **internal
delivery app for Agent Automation Desk** that helps deliver paid pilots, learn
from requests, and only then decide what deserves a client-facing product
surface.

Priority:

1. **Agent Automation Desk Portal** as an internal request queue and delivery
   workflow.
2. **Automation Triage App** as a narrow diagnostic entry point for new leads.
3. **AI Ops Runbook Builder** as a repeatable output created from delivery.

A public client portal makes sense after 2-3 paid pilots, if the same request
types repeat and delivery fits within a reasonable time budget.

## 1. Agent Automation Desk Portal

Mechanism: a client or internal operator submits a request, attaches context,
the company puts it in a queue, tracks status, prepares the output, and a human
approves delivery.

Why it makes sense:

- matches the productized service model: fixed fee, queue, one active request
  at a time
- helps deliver pilots before building a full SaaS
- each request creates data for future playbooks
- keeps a safe boundary: the agent prepares work, a human approves external
  actions

First MVP:

- intake form
- request queue with statuses
- fields for scope, risks, delivery type, and human approval
- delivery summary
- simple log marking a request as repeatable / one-off / out-of-scope

Risk: the app can hide the main question of whether someone pays for the
service. Keep it internal and minimal first.

First test: use it manually for the first paid or discovery pilot and measure
whether it shortens triage and keeps delivery quality stable.

## 2. Automation Triage App

Mechanism: a user describes one manual or repeated process, and the app returns
a fit / no-fit verdict, first measurable output, risks, effort estimate, and
recommended next step.

Why it makes sense:

- can be used as a lead magnet or paid mini-product
- filters poor requests before a discovery call
- teaches the company which processes repeat across customers
- fits the 48h AI ops triage offer

First MVP:

- process description form
- scoring by repeatability, data availability, risk, and business value
- output as an automation brief
- recommendation: test, park, reject, or propose a pilot

Risk: if it is too generic, it turns into broad AI consulting without a clear
purchase moment.

First test: give it to 5-10 warm contacts as structured pre-call intake and
watch whether it leads to qualified calls or a paid pilot.

## 3. AI Ops Runbook Builder

Mechanism: a manual process description and provided materials produce an SOP,
checklist, data model, automation blueprint, and approval gates.

Why it makes sense:

- the output is useful without production integration
- delivery creates repeatable knowledge for playbooks
- it reduces the risk of uncontrolled automation by naming guardrails
- it fits companies that do not yet have clean data or a clear process

First MVP:

- process input template
- SOP/checklist generator
- "what not to automate" section
- list of required data, tools, and approval steps
- export to a client-readable document

Risk: it may be valuable but less directly tied to payment than the request
portal. It is best built as a delivery component before becoming a standalone
product.

First test: use it as the output from the first 3 requests and evaluate whether
clients understand the value of the runbook without extra explanation.

## Evidence and signals

- The company's experiment spec recommends starting with a productized service
  before building SaaS.
- DesignJoy validates the fixed-fee, request-queue, one-at-a-time delivery
  mechanism as a productized service pattern.
- Fiverr shows market demand for AI automation and workflow services, including
  public project pricing ranges.
- Zapier 2026 trends support the thesis that companies need orchestration,
  governance, quality gates, and human approval, not just AI models.

## Decision rule

Build the app only where it simplifies paid delivery or improves decision
quality. If it does not help win a pilot, shorten triage, reduce risk, or turn a
repeated request into a playbook, it is too early.
