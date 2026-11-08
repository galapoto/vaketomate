# VakeTomate

VakeTomate is a modular automation platform for Vantaan ja Keravan hyvinvointialue workflows.

The repository is intentionally organized as a **shared platform plus independent apps**, so capabilities that repeat across the department are built once and reused.

## Platform principles

1. **One capability, one shared implementation.** Email, Teams sharing, audit logging, approvals, reporting, scheduling, Microsoft authentication, files and common UI primitives belong to shared packages/services rather than individual apps.
2. **Apps own domain logic.** Prosessikuvaus, Power BI Automation, funding monitoring and future apps keep their specific rules and workflows inside their own module boundaries.
3. **One operational dashboard.** Every app emits normalized status, audit and metric events so VakeTomate can provide a single dashboard for activity, warnings, approvals, failures and outstanding work.
4. **Organization rules are first-class configuration.** VAKE guides, symbol libraries, naming/role aliases and approval/review rules are versioned implementation inputs rather than informal developer knowledge.
5. **Human approval at consequential boundaries.** Automation prepares, validates and routes work; publication/approval actions remain explicit unless an approved organizational integration authorizes them.
6. **Offline/local first where useful, Microsoft-integrated when approved.** Domain engines should remain deterministic and testable without cloud access. Outlook/Teams/SharePoint/Power BI integrations are adapters around the same domain model.
7. **Auditability by default.** Inputs, transformations, warnings, edits, generated artefacts, sharing and approval transitions must be traceable.

## Repository direction

```text
vaketomate/
├── apps/
│   ├── prosessikuvaus/
│   ├── power-bi-automation/          # future implementation; design docs already exist
│   ├── funding-monitor/              # future
│   └── meeting-intelligence/         # future
├── packages/
│   ├── contracts/                    # shared events/commands and IDs
│   ├── audit/                        # shared audit trail
│   ├── approvals/                    # reusable approval/review state machine
│   ├── sharing/                      # one share/send abstraction
│   ├── microsoft/                    # Outlook/Teams/SharePoint/Graph adapters
│   ├── reporting/                    # metrics/events for the unified dashboard
│   ├── module-registry/              # app manifests/capabilities
│   └── ui/                           # future shared VakeTomate design system
├── docs/
│   ├── architecture/
│   └── prosessikuvaus/
└── .github/workflows/
```

## First migrated app: Prosessikuvaus

The standalone VAKE Prosessikuvausautomaatti is being migrated into `apps/prosessikuvaus/`. Its deterministic parser, VAKE/IMS rule engine, editable swimlane renderer, three-page description model and export support remain the domain core. Shared capabilities are progressively moved into platform packages instead of duplicated inside the app.

The authoritative process-description behavior is based on the supplied VAKE `Prosessienkuvaamisohje`, IMS symbol/color library and IMS approval instructions.

See:

- `docs/architecture/vaketomate-platform.md`
- `docs/prosessikuvaus/roadmap.md`
- `apps/prosessikuvaus/README.md`
