# VakeTomate Prosessikuvaus

This module is the migrated VAKE Prosessikuvausautomaatti reference implementation.

## Current status

The working browser app from standalone v0.6.0 is preserved under `web/` while the module is progressively refactored onto shared VakeTomate platform services.

Current domain capabilities:

- messy Finnish process text → structured process model;
- numbered and unnumbered action recovery;
- passive/obligation action preservation;
- actor extraction and organization-specific alias normalization;
- `TKKI` and `TKKI-yksikkö` normalized to `TKKI-yksikkö`;
- VAKE three-view model: Yhteenveto / Prosessikaavio / Vaiheiden kuvaus;
- exact VAKE/IMS color and symbol semantics;
- actor-only swimlanes;
- system/document semantics embedded in actor lanes rather than generic auxiliary lanes;
- editable DrawIO/XML output;
- shareable HTML/PDF-ready/SVG/JSON/text package;
- regression cases for VTR, research-permit prose and funding-process feedback.

## Run locally

From repository root:

```bash
python -m http.server 8773
```

Open:

```text
http://127.0.0.1:8773/apps/prosessikuvaus/web/
```

## Architecture boundary

### Stays in Prosessikuvaus

- parsing and process inference;
- VAKE process-description policy/configuration;
- canonical process graph/model;
- IMS/DrawIO renderer and adapter;
- process-specific validation;
- process hierarchy/subprocess logic.

### Moves to/reuses shared VakeTomate packages

- audit log;
- Outlook/Teams/file sharing;
- approval workflow;
- scheduled review reminders;
- artefact registry/versioning;
- operational metrics/dashboard;
- Microsoft authentication/connectors;
- common UI/design system;
- optional future AI gateway.

## Organizational guide rules

The product specification remains the supplied VAKE Prosessienkuvaamisohje and IMS instructions. Domain rules are versioned under `reference/` and should be changed only when organizational guidance changes or an explicit organization-specific rule is confirmed.

## Next implementation target

The next structural upgrade is to replace the current mostly-linear step representation with an explicit graph (`nodes[]` + `edges[]`) so decisions, branches, rework loops and subprocess links are first-class rather than inferred only during rendering.
