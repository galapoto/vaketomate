# Prosessikuvaus — VakeTomate roadmap

## Mission

Prosessikuvaus should automate the complete lifecycle of a VAKE process description, not merely draw a swimlane diagram.

The module must remain faithful to organizational process-description guidance, preserve a human approval point, and reuse VakeTomate platform capabilities wherever the same function will be needed by other apps.

## Product modes

### 1. Fast capture

For a user who has prose, meeting notes, bullet points or a numbered draft.

```text
Paste/import source → Interpret → Review uncertainties → Generate process description
```

### 2. Guided creation

For a user starting without a complete source text.

The app asks only the minimum necessary questions:

- What triggers the process?
- What is the expected outcome?
- Who are the actors?
- What are the key phases?
- Where are decisions?
- What systems/documents are essential?

It progressively builds the same canonical model.

### 3. Review/update

For an existing process description:

- open previous model/IMS export;
- compare with proposed current state;
- show additions/removals/changed responsibilities;
- validate against current VAKE rules;
- prepare review/approval package.

### 4. Approval/review lifecycle

For an otherwise complete process:

- assign owner/approver;
- generate approval message;
- send via shared VakeTomate sharing service;
- record approve/reject/change-request decision;
- schedule next review;
- surface status on unified dashboard.

## Canonical process model

The browser UI, DrawIO, HTML/PDF, approval workflow and future IMS integration must all consume the same canonical model.

Recommended structure:

```text
ProcessDescription
- id
- title
- process_level
- state_mode            # as-is / lightly-developed / target-state
- hierarchy_parent
- summary
- actors[]
- nodes[]
- edges[]
- phase_details[]
- source_evidence[]
- validations[]
- warnings[]
- artefacts[]
- approval
- review
- audit metadata
```

### Node types

- start
- end
- activity
- decision
- system
- document
- process-link / subprocess
- support-process reference

### Edge types

- sequence
- interactive flow
- data flow
- conditional branch
- return-to-earlier-step

## Automation scope

### A. Source ingestion

Support progressively:

- pasted text;
- `.txt` / Markdown;
- Word/PDF text extraction where approved;
- existing JSON project;
- existing DrawIO/XML;
- later: IMS process export/API;
- later: meeting-notes handoff from Meeting Intelligence;
- later: approved SharePoint/OneDrive source.

Every source becomes evidence linked to extracted nodes/fields.

### B. Text understanding without requiring perfect formatting

Deterministic engine first:

- Unicode/clipboard normalization;
- numbering reconstruction;
- actor + action extraction;
- passive action retention (`haetaan`, `tallennetaan`, `tulee ottaa yhteyttä`);
- multi-action sentence splitting when actors change;
- heading/noise/gibberish rejection;
- restarted numbering/substep classification;
- parenthetical action promotion when it is a real process step;
- source-order recovery with explicit uncertainty warning;
- actor alias normalization (`TKKI` → `TKKI-yksikkö`).

Optional governed AI later proposes structure only when deterministic confidence is low.

### C. Actor and responsibility automation

- detect explicit actors;
- canonicalize aliases;
- detect combined responsibility;
- flag missing responsible actor as `Tarkista toimija` rather than guessing;
- detect same actor expressed in multiple grammatical forms;
- suggest actor merges with evidence;
- produce only real responsibility swimlanes;
- no generic system/document lanes.

Future shared platform opportunity: organizational role/directory service usable by approvals, meeting intelligence and other apps.

### D. Activity/document/system classification

Use organizational notation rules:

- ordinary work → activity;
- actual decision → decision;
- direct system interaction → system node where appropriate;
- document creation/handling → document node where appropriate;
- contextual system/document mentions remain phase guidance instead of forcing a diagram node.

Examples:

- `Vie aiehakemuksen ideasalkkuun (Hypergene)` → system-shaped node in actor lane.
- `Laatii rahoitushakemuksen` → document-shaped node when the document is the core object of the activity.
- `Katso Intrasta talouden partneri` inside a guidance note → phase guidance, not a separate system node.

### E. Decision/branch engine

Build a graph rather than only a linear step array.

Detect patterns:

- jos / mikäli / kun;
- kyllä / ei outcomes;
- tarvittaessa;
- hyväksytään / hylätään;
- exists / does not exist;
- repeat/rework loops.

The engine should:

1. identify candidate condition;
2. propose decision question;
3. identify branch targets;
4. label edges;
5. merge branches when appropriate;
6. preserve source evidence;
7. request human confirmation if semantics are ambiguous.

### F. Process-level and hierarchy automation

VAKE distinguishes process map, operating model and process-flow descriptions.

The module should:

- ask/detect intended description level;
- prevent process-flow-only fields from being required at higher levels;
- suggest parent hierarchy placement;
- warn when a detailed work instruction is being modelled as a process flow;
- identify likely subprocesses;
- create process-link nodes for decomposition;
- preserve parent-child relationships for future IMS integration.

### G. Complexity management

The organizational guide recommends key phases only and about max 20 phases for a process-flow diagram.

Automation should calculate:

- node count;
- actor count;
- branch count;
- line crossings;
- average text length;
- responsibility handoffs;
- subprocess candidates.

When complexity exceeds thresholds, present a proposed split such as:

```text
Parent process
├── Preparation
├── Assessment/approval
├── Execution
└── Closure/follow-up
```

The user approves the split before the model is rewritten.

### H. Three-page IMS description generation

#### Yhteenveto

Generate/prefill only source-supported facts. Never fabricate organizational facts.

Required fields remain aligned with VAKE guidance:

- Nimi
- Luokka
- Prosessin tarkoitus
- Prosessin omistaja
- Prosessin lähtötilanne
- Prosessin lopputilanne
- Prosessin asiakkaat ja sidosryhmät
- Asiakkaiden tarpeet ja vaatimukset
- Prosessin keskeiset resurssit
- Prosessin tavoitteet
- Prosessin mittarit
- Prosessin rajapinnat
- Prosessin ohjaus- ja kehittämismenettely
- Havaitut kehittämiskohteet prosessissa

The app distinguishes `missing` from `derived` from `confirmed` values.

#### Prosessikaavio

- exact organizational symbol styles/colors;
- actor-only swimlanes;
- start/end;
- left-to-right normal progression;
- branch routing;
- information-flow labels;
- editable shapes;
- subprocess links;
- layout quality score and warnings.

#### Vaiheiden kuvaus

For each phase:

- Vaihe;
- Vastuu;
- Kriittiset tehtävät;
- Ohjeet, menetelmät ja mallit;
- Syntyvä ja jäljitettävä tieto.

The app should automatically move over-detailed operational instructions out of the diagram into phase details when safe.

### I. Quality gate before export/approval

A process can have statuses such as:

- `draft`
- `needs_review`
- `ready_for_owner_review`
- `submitted_for_approval`
- `changes_requested`
- `approved`
- `review_due`
- `archived`

Quality checks include:

- all diagram phases have actor/responsibility;
- decision nodes are questions;
- start and end exist;
- no orphan nodes;
- no unreachable nodes;
- no duplicated actor aliases;
- no unexplained backward flow;
- summary required fields reviewed;
- no unsupported/invented facts marked as confirmed;
- process complexity threshold;
- generated DrawIO XML valid;
- phase names/details synchronized;
- source evidence available for automated interpretations.

### J. Export/artefact automation

Produce from one canonical model:

- editable `.drawio` / IMS-compatible XML;
- JSON source model;
- shareable HTML;
- PDF-ready print view;
- SVG preview;
- description Markdown/text;
- validation report;
- approval package;
- version-diff report.

All generated files are registered through the shared VakeTomate artefact service.

### K. Sharing automation

Prosessikuvaus calls the shared platform `ShareService`.

User chooses:

- Outlook email;
- Teams;
- SharePoint/OneDrive link;
- local download.

The same sender/recipient/template/file handling must serve other VakeTomate apps.

### L. Approval automation

Organizational process-description approval is a first consumer of the shared approval engine.

Flow:

```text
Draft ready
  ↓
Select/confirm process owner
  ↓
Generate approval message
  ↓
Send via shared Outlook/Teams service or IMS-approved route
  ↓
Owner reviews current operating method
  ├── Approve
  └── Reject / changes requested + reason
```

When no approved IMS API exists, VakeTomate prepares and tracks the handoff without pretending the IMS decision happened automatically.

### M. Review-cycle automation

The VAKE review interval is 12 months after approval.

The shared scheduler should create a review task and dashboard item:

- due date;
- responsible user/role;
- reminder status;
- previous approved version;
- change-diff package;
- review outcome.

This scheduler becomes reusable by Power BI refresh/review, funding-source maintenance and other apps.

### N. Versioning and diff

Every saved/approved version should support semantic diff:

- added/removed phases;
- changed actor;
- changed phase text;
- changed branch;
- changed system/document;
- changed summary field;
- changed phase detail;
- changed process hierarchy.

This is more useful for review/approval than comparing raw XML.

### O. Unified dashboard contribution

Prosessikuvaus should publish dashboard metrics/work items such as:

- drafts;
- ready-for-review processes;
- approval requests outstanding;
- rejected/change-requested processes;
- approved this month;
- reviews due in 30/60/90 days;
- processes with unresolved validation warnings;
- average phases/actors;
- number of generated artefacts;
- failed IMS/Outlook/Teams handoffs;
- recent edits.

## Build waves

### Wave 0 — migrated reference implementation

- move v0.6 browser app into VakeTomate;
- preserve regression tests;
- add shared platform contracts/packages;
- CI runs parser tests.

### Wave 1 — canonical graph + quality engine

- explicit nodes/edges;
- decisions/branches;
- validation framework;
- model migrations/versioning;
- source evidence references.

### Wave 2 — shared platform integration

- audit events;
- artefact registry;
- share service;
- approval engine;
- dashboard metrics.

### Wave 3 — Microsoft integration

- central Graph authentication adapter;
- Outlook send;
- Teams share;
- SharePoint/OneDrive artefact storage;
- common contact/recipient resolution where approved.

### Wave 4 — process lifecycle automation

- approval package;
- review scheduler;
- semantic version diff;
- review dashboard;
- process hierarchy/subprocess management.

### Wave 5 — IMS integration

Depending on available/approved Arter IMS integration surface:

- direct import preparation;
- process hierarchy mapping;
- approval status synchronization;
- version/publication synchronization;
- review-cycle synchronization.

No unsupported browser automation should be treated as a production integration.

### Wave 6 — governed AI assistance

Only after deterministic model, audit and approval boundaries are stable.

## Definition of done for the mature module

A user can provide messy source material and, with only necessary confirmations, reach a VAKE-compliant, editable, shareable, auditable process description; route it for owner review; track approval/rejection; publish/import through approved mechanisms; and automatically manage its 12-month review lifecycle — while VakeTomate reuses the same sharing, approval, reporting, scheduling, Microsoft and audit infrastructure for every other module.
