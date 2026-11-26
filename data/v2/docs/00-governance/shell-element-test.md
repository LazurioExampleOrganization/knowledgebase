---
title: "Test page: Lazurio's shell element (temporary)"
description: "Temporary test page. It carries its own Lazurio shell elements so the apps host's rewrite to the production version can be checked live."
status: "draft"
owner: "founder"
confidence: "test"
source_type: "test"
aliases:
  - "shell element test"
---

**This is a test page.** It exists only to check one behaviour of the apps host
live (Lazurio/LazurioPlatform#1244, HumanAndMachine-ai/Machines#1580), and it
will be removed after the check.

The page carries its own Lazurio shell elements. When the apps host serves it,
every one of them should announce `version="production"`, keep its other
attributes, and the host should add no element and no shell script of its own.

<lazurio-buddy></lazurio-buddy>

<lazurio-buddy version="development" data-test="kept"></lazurio-buddy>

<!-- <lazurio-buddy version="development"> in a comment stays as it is -->
