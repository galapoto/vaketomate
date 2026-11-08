# VakeTomate shared-platform architecture

## 1. Goal

VakeTomate should become a department automation platform, not a collection of unrelated mini-apps.

Every new module is evaluated in two layers:

- **domain capability** — logic unique to the app;
- **platform capability** — logic that another app is likely to need.

When a platform capability appears for the first time, it is implemented generically and the first app becomes its first consumer.

## 2. Core architecture

```text
                        ┌─────────────────────────────┐
                        │      VakeTomate Shell       │
                        │ navigation + dashboard + UI │
                        └──────────────┬──────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
┌───────▼────────┐            ┌────────▼─────────┐           ┌────────▼─────────┐
│ Prosessikuvaus │            │ Power BI Auto   │           │ Future modules  │
│ domain engine  │            │ domain engine   │           │ domain engines  │
└───────┬────────┘            └────────┬─────────┘           └────────┬─────────┘
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       │
       ┌───────────────────────────────▼────────────────────────────────┐
       │                    Shared platform services                     │
       │ contracts · audit · approvals · sharing · Microsoft · files    │
       │ reporting · scheduler/jobs · notifications · policy · AI gateway│
       └───────────────────────────────┬────────────────────────────────┘
                                       │
               ┌───────────────────────┼────────────────────────┐
               │                       │                        │
        Microsoft 365/Graph      approved internal APIs      local/offline
       Outlook/Teams/SharePoint       IMS/Fabric/etc.          adapters
```

## 3. Shared capability map

### 3.1 Module registry

Every app publishes a manifest containing:

- module ID and version;
- human-readable name;
- routes/views;
- declared capabilities;
- emitted metric/event types;
- required integrations;
- required permissions;
- health/status provider;
- dashboard cards/widgets it contributes.

This prevents the central dashboard from hard-coding every future app.

### 3.2 Common event and command contracts

All modules use a common envelope:

```json
{
  "event_id": "...",
  "event_type": "prosessikuvaus.process.generated",
  "module": "prosessikuvaus",
  "entity_type": "process_description",
  "entity_id": "...",
  "occurred_at": "...",
  "actor": {"id": "...", "display_name": "..."},
  "correlation_id": "...",
  "severity": "info",
  "payload": {}
}
```

The same envelope powers audit history, dashboard reporting, notifications and later observability.

### 3.3 Audit trail

One audit system records:

- source ingestion;
- parsing/normalization;
- validations and warnings;
- manual changes;
- generated files;
- share/send actions;
- approval/rejection;
- publication/import;
- periodic review;
- connector errors.

Domain apps should not invent separate audit formats.

### 3.4 Sharing and messaging

One `ShareService` serves every app.

Target adapters:

- local download;
- Outlook email through Microsoft Graph;
- Teams message/card through approved Microsoft integration;
- SharePoint/OneDrive link sharing;
- copy-to-clipboard;
- future approved channels.

An app supplies a `SharePackage` with subject, recipients, message, attachments/links and classification metadata. The platform chooses the adapter.

**Rule:** Prosessikuvaus must not build a private Outlook sender while Power BI Automation builds another. They call the same service.

### 3.5 Microsoft integration layer

One Microsoft boundary owns:

- authentication/session abstraction;
- Graph client;
- Outlook mail;
- Teams delivery;
- SharePoint/OneDrive files;
- user/profile lookup where approved;
- future Power BI/Fabric integration where appropriate.

Application code never stores Microsoft secrets or implements OAuth flows independently.

### 3.6 Approval and review workflows

One generic approval engine supports workflows such as:

```text
DRAFT
  ↓ submit
IN_REVIEW
  ├─ approve → APPROVED
  └─ reject  → CHANGES_REQUESTED → DRAFT
```

It stores:

- requester;
- approver/role;
- submission message;
- decision;
- rejection reason;
- timestamps;
- links/artefacts;
- next review date.

Prosessikuvaus maps this to the VAKE/IMS process-owner approval workflow. Future funding reports, publishing workflows and other departmental approvals reuse the engine.

### 3.7 Unified reporting/dashboard

Every app publishes normalized metrics and work items. The central dashboard can show:

- module health;
- recent automation runs;
- failures/warnings;
- drafts awaiting work;
- approvals awaiting action;
- upcoming review dates;
- documents/reports recently generated;
- items shared/sent;
- data-quality issues;
- automation time saved when measurable.

Domain-specific dashboards can still exist, but operational reporting is one VakeTomate surface.

### 3.8 Shared job/scheduler layer

Future repeated tasks — funding scans, review reminders, report refresh checks, meeting post-processing — should use one scheduler/job abstraction with:

- job definition;
- run history;
- retry policy;
- idempotency key;
- status;
- failure reason;
- audit events;
- notification hooks.

### 3.9 File/artefact service

One artefact model should describe files generated by any module:

```text
Artefact
- id
- module
- entity_id
- type
- filename
- mime_type
- version
- created_at
- created_by
- checksum
- storage_location
- classification
```

Prosessikuvaus outputs DrawIO/XML/JSON/HTML/PDF-ready/SVG/text. Power BI Automation outputs prepared models/configs/reports. They should share lifecycle/versioning/storage primitives.

### 3.10 Policy and configuration

Organization rules must be versioned separately from generic engines:

- actor aliases (`TKKI` = `TKKI-yksikkö`);
- process-description guide rules;
- symbol/color library;
- review interval;
- publication rules;
- allowed connectors;
- email/Teams templates;
- data-classification restrictions.

### 3.11 AI gateway (future/optional)

AI should be a shared governed service rather than embedded ad hoc in modules.

It can later provide:

- messy prose → structured suggestions;
- missing-field suggestions;
- wording/imperative-form suggestions;
- meeting summarization;
- classification/relevance support.

Deterministic rules, permissions, audit, source evidence and human approval remain outside the model.

## 4. Prosessikuvaus as the first platform client

Prosessikuvaus will introduce/reuse these platform services first:

| Capability | Domain or shared? | First implementation |
|---|---|---|
| Finnish process-text parsing | Domain | Prosessikuvaus |
| VAKE IMS notation/rules | Domain config | Prosessikuvaus |
| DrawIO/IMS export | Domain adapter | Prosessikuvaus |
| HTML/PDF/ZIP artefacts | Shared artefact/share primitives | Prosessikuvaus first consumer |
| Outlook/Teams sharing | Shared | platform Microsoft + sharing |
| process-owner approval | Shared approval engine + domain policy | Prosessikuvaus first consumer |
| 12-month review reminder | Shared scheduler + approval/review | Prosessikuvaus first consumer |
| audit log | Shared | all modules |
| operational metrics | Shared | unified dashboard |

## 5. Prosessikuvaus end-state

```text
Source material
    ↓
Ingestion / paste / file / future connector
    ↓
Deterministic extraction
    ↓
Canonical process model
    ↓
VAKE guide validation
    ↓
Human correction only where uncertain
    ↓
Auto-layout / subprocess recommendation
    ↓
Three-page IMS description
    ├── Yhteenveto
    ├── Prosessikaavio
    └── Vaiheiden kuvaus
    ↓
Artefact generation
    ├── DrawIO/XML
    ├── shareable HTML/PDF-ready view
    ├── JSON source model
    └── textual descriptions
    ↓
Shared approval workflow
    ↓
IMS import/publish adapter when approved
    ↓
12-month review lifecycle
    ↓
Unified VakeTomate dashboard + audit trail
```

## 6. Automation opportunities discovered from VAKE instructions

Prosessikuvaus should ultimately automate more than drawing:

1. detect likely process level (process map / operating model / process flow) and stop incompatible fields from appearing;
2. validate end-to-end start/input and end/output semantics;
3. identify actors and normalize aliases;
4. identify over-detailed work-instruction content and move it to phase detail;
5. detect >20 key phases and recommend/subdivide subprocesses;
6. detect decisions and propose question-form branches;
7. distinguish activity, system, document and data-flow semantics;
8. generate and validate the three IMS views;
9. compare revisions and show exactly what changed;
10. prepare approval package for the process owner;
11. send approval/share messages through the shared Outlook/Teams service;
12. track rejection reasons and reopen required corrections;
13. record approval and publication state;
14. schedule the VAKE 12-month review;
15. notify responsible user when review is due;
16. generate review checklist and change summary;
17. recommend process hierarchy placement/subprocess links;
18. later integrate with IMS directly only through an approved adapter/API.

## 7. Security boundaries

- Do not send internal material to external services by default.
- Microsoft integrations must use least-privilege organizational permissions.
- Keep tokens/secrets out of domain modules and repository content.
- Sharing adapters must receive classification metadata and be policy-aware.
- Every consequential send/approve/publish operation must be auditable.
- Local deterministic operation remains available where integrations are unavailable.

## 8. Build sequence

### Foundation — now

- migrate Prosessikuvaus into VakeTomate;
- add common contracts, audit, approvals, sharing, Microsoft adapter interfaces, reporting and module registry;
- retain current deterministic browser app as a working reference implementation;
- establish tests in repository CI.

### Platform shell

- common navigation/design system;
- module registry discovery;
- unified operational dashboard;
- shared artefact library;
- shared settings/integration surface.

### Microsoft integration

- organization-approved Graph authentication;
- Outlook sender;
- Teams share adapter;
- SharePoint/OneDrive artefact storage/link sharing;
- central recipient/contact resolution where approved.

### Prosessikuvaus automation expansion

- structured branch graph;
- subprocess decomposition;
- version diff;
- approval/review lifecycle;
- IMS adapter/import assistance;
- optional AI suggestion layer.

### Additional apps

New apps plug into the same contracts instead of recreating platform capabilities.
