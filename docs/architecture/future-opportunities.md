# VakeTomate future opportunity register

This file records capabilities discovered while building one module that are likely to be useful elsewhere in the department. Before creating a new app-specific implementation, check this register and the shared packages first.

## High-priority shared opportunities

### 1. Organizational role and recipient directory

**Discovered in:** Prosessikuvaus actor normalization and process-owner approval.

Potential uses:

- canonical role aliases and display names;
- process owner/approver lookup;
- Outlook recipients;
- Teams mentions/targets;
- meeting speaker-to-employee mapping where authorized;
- funding/report distribution lists.

Do not hard-code personal contact information into domain apps.

### 2. Approval inbox

**Discovered in:** IMS process-owner approval.

A single VakeTomate approval inbox can serve:

- process descriptions;
- funding reports before distribution;
- Power BI publication/update approvals;
- future document/publication workflows.

### 3. Notification center

One notification abstraction should collect:

- review reminders;
- automation failures;
- data-quality warnings;
- approval requests;
- approval outcomes;
- funding changes;
- scheduled report readiness.

Delivery adapters: in-app, Outlook, Teams and future approved channels.

### 4. Shared artefact library

Users should be able to find generated outputs from all modules in one place rather than searching browser downloads:

- process descriptions;
- funding reports;
- Power BI preparation packages;
- meeting outputs;
- approval packages.

Needs versioning, classification, source lineage and retention policy.

### 5. Shared source-evidence layer

Prosessikuvaus needs to explain where an inferred phase came from. Funding monitoring needs to retain page/source evidence. Meeting intelligence needs transcript/evidence references.

Create one evidence model with:

- source ID/type/location;
- captured timestamp;
- text/range/hash;
- derived entity link;
- confidence;
- access classification.

### 6. Scheduler and job center

Reusable for:

- 12-month process reviews;
- funding-source scans;
- Power BI refresh checks;
- report generation;
- meeting post-processing;
- future recurring departmental automations.

The unified dashboard should show queued/running/failed/succeeded jobs.

### 7. Connector health center

Centralize status for:

- Microsoft Graph;
- Outlook;
- Teams;
- SharePoint/OneDrive;
- Power BI/Fabric;
- IMS integration;
- external funding sources.

Users should see one place for expired permissions, failed connectors and last successful use.

### 8. Shared document/report renderer

Multiple apps will need branded HTML/PDF-ready outputs. Build one renderer/theme layer with:

- VAKE colors/typography;
- headers/footers;
- accessibility;
- print CSS;
- metadata/classification banners;
- common tables/cards;
- attachment packaging.

Prosessikuvaus can be its first consumer.

### 9. Shared version diff engine

Potential consumers:

- process version reviews;
- funding-call changes;
- Power BI model/config changes;
- document revisions;
- policy/config changes.

Use domain-specific semantic diff adapters on top of common version primitives.

### 10. Common validation framework

Each module has different rules but the result shape should be common:

```text
ValidationIssue
- code
- module
- entity_id
- severity
- field/path
- message
- source evidence
- suggested action
- blocking
```

The unified dashboard can then surface validation issues from every app consistently.

### 11. Common settings/policy center

Organization administrators should eventually manage centrally:

- connector permissions;
- actor aliases;
- email/Teams templates;
- review intervals;
- allowed AI features;
- storage/retention policies;
- report themes;
- module feature flags.

### 12. Governed AI gateway

When approved, one AI gateway can serve Prosessikuvaus, Meeting Intelligence and other modules while centralizing:

- model/provider policy;
- data-classification rules;
- redaction/allowed content;
- prompt/version audit;
- citations/evidence requirements;
- cost/usage reporting;
- human-review thresholds.

No module should independently send organizational data to an AI provider.

## Domain opportunities discovered specifically from Prosessikuvaus

- process hierarchy browser and placement assistant;
- subprocess decomposition assistant;
- process-owner review workspace;
- 12-month review campaign/dashboard;
- semantic process version diff;
- process library search;
- common process templates;
- process quality score;
- process handoff/role-change analysis;
- bottleneck and repeated-loop analysis;
- process-to-instruction linking;
- future process mining/import from operational data where suitable;
- later meeting-to-process pipeline: approved meeting transcript/notes → process-draft suggestions.

## Rule for future implementation

When a newly requested feature appears in two or more modules — or obviously will — implement the generic capability under `packages/` or a shared service boundary first, then create thin domain adapters in the apps.
