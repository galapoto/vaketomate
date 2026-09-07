# Prosessikuvaus migration status

## Current status

Prosessikuvaus is now a first-class VakeTomate module on branch `feat/prosessikuvaus-platform-foundation`.

The migration is being done in two tracks:

1. preserve the standalone v0.6.0 browser implementation as the behavioural/reference baseline;
2. move its domain logic onto the new shared VakeTomate architecture instead of copying the standalone structure unchanged.

## Completed in VakeTomate

- VakeTomate workspace/package structure
- module registry and shell/dashboard foundation
- Prosessikuvaus module manifest
- canonical process graph (`nodes` + `edges`)
- legacy step-model migration helper
- VAKE guide policy and validation engine
- VAKE symbol/color tokens
- TKKI/TKKI-yksikkö canonical actor normalization
- shared event/command/work-item contracts
- shared audit log
- shared artefact registry
- shared approval/review service
- 12-month review scheduling primitive
- shared ShareService
- centralized Outlook Graph adapter boundary
- centralized Teams Graph adapter boundary
- normalized reporting/metrics primitives
- Power BI Automation module manifest as a second platform consumer
- unified VakeTomate shell prototype
- CI workflow and initial platform/domain tests
- cross-app future opportunity register

## Still to migrate from standalone v0.6.0

- full deterministic Finnish text parser implementation
- the complete regression corpus (VTR, research-permit prose, funding process, malformed clipboard cases)
- current browser editing experience
- DrawIO/XML renderer/exporter
- HTML/PDF/SVG/ZIP exporters
- local JSON project open/save behaviour
- full edit-state regression coverage

These should be ported into domain-focused files rather than copied into one monolithic browser module.

## Target module decomposition

```text
apps/prosessikuvaus/
├── module.mjs
├── src/
│   ├── canonical-model.mjs
│   ├── guide-policy.mjs
│   ├── platform-integration.mjs
│   ├── parser/
│   │   ├── normalize-input.mjs
│   │   ├── sections.mjs
│   │   ├── signals.mjs
│   │   ├── actors.mjs
│   │   ├── actions.mjs
│   │   ├── decisions.mjs
│   │   └── parser.mjs
│   ├── layout/
│   │   ├── swimlanes.mjs
│   │   ├── routing.mjs
│   │   └── complexity.mjs
│   ├── render/
│   │   ├── drawio.mjs
│   │   ├── svg.mjs
│   │   ├── html-report.mjs
│   │   └── description-text.mjs
│   └── adapters/
│       └── ims.mjs
├── web/
│   ├── index.html
│   ├── app.mjs
│   └── style.css
├── reference/
└── tests/
```

## Build gates

### Gate 1 — parser parity

The migrated parser must pass every v0.6.0 regression case before the standalone parser is retired.

### Gate 2 — graph parity

Every parsed process must be representable by the canonical graph without losing actor, ordering, source evidence, system/document semantics or phase details.

### Gate 3 — renderer parity

DrawIO/XML output must remain editable and retain the supplied VAKE IMS styles.

### Gate 4 — editor persistence

Manual edits must survive switching phases/views, rerendering, autosave/restore and export.

### Gate 5 — platform integration

Prosessikuvaus must use shared VakeTomate audit, artefact, sharing, approval, review and reporting services rather than local duplicates.

### Gate 6 — Microsoft integration

Outlook/Teams sending is enabled only after approved organizational Graph authentication/permissions are available. Domain code must not contain tokens, client secrets or a separate OAuth implementation.

### Gate 7 — IMS integration

Direct IMS actions are enabled only through a supported/approved integration surface. Until then, VakeTomate prepares validated editable artefacts and tracks the handoff/approval lifecycle without claiming publication occurred.

## Immediate next coding sequence

1. port v0.6.0 parser and regression corpus into `src/parser/`;
2. convert parser output directly to canonical nodes/edges;
3. implement first-class decisions/branches and source evidence;
4. port DrawIO/SVG/text renderers to consume the canonical graph;
5. rebuild the simplified three-view UI on the graph model;
6. wire local download/artefact registration and shared approval lifecycle;
7. wire Outlook/Teams only through the shared Microsoft adapters after approved auth is available;
8. connect module metrics/work items to the unified shell dashboard.

## Migration rule

Do not delete or overwrite the standalone reference implementation until parity gates pass. The new architecture should become the production path only when it is demonstrably at least as reliable as v0.6.0 on the real workplace examples that originally exposed parser and edit-state bugs.
