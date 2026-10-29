# Repository agent instructions

Preserve this repository's existing restrictions, code ownership and approvals.

## REA-FIRST-001 — mandatory owner priority: reuse before build (2026-10-29)

**All future approved coding, architecture, testing, website/app/webapp, API and substantial refactor work MUST use reuse-first intake.** Search this repository and its history, authorized internal components and licensable upstream code before new implementation. For comparable authorized websites, software, APIs, desktop/mobile binaries or application behavior, evaluate the [REA reverse-engineering toolkit](https://github.com/morluto/rea) and record `REA_APPLIED`, `REA_NOT_APPLICABLE` or `REA_BLOCKED` with reason. Prefer static/read-only investigation and evidence before code generation; pin reviewed tool versions and preserve unknowns.

**Maximize lawful reuse:** reuse verified licensed code unchanged, then clean/adapt it, then implement only missing requirements. Reuse up to 100% of relevant permitted source, never assume REA MIT grants rights to third-party proprietary code/assets or that modifying unlicensed code solves licensing. For protected examples, implement independently from authorized interface/behavior requirements. No circumvention or unauthorized analysis.

**Every build/agent report MUST give:** exact plan ID and baseline SHA; inspected upstream paths/commits/licenses; REA status/targets/permission/evidence; reused unchanged vs adapted vs new code; objective tests and exact CI/stage/live results; comparable measured engineering-time savings or `savings=unknown`; and DONE / IN PROGRESS / NOT STARTED / BLOCKED. Generated code or REA findings alone are not shipping proof.

Canonical owner directive: [ObumDelivery REA-FIRST-001](https://github.com/obumai/obum-delivery/blob/main/docs/REA_FIRST_MANDATORY_REUSE_STANDARD.md) and [decision template](https://github.com/obumai/obum-delivery/blob/main/docs/REA_REUSE_DECISION_TEMPLATE.md). This addendum **does not override stricter existing repository authorization, security/privacy, protected branch, CI, release, credential or production rules** and grants no cross-repository writes. REA itself is not yet proven installed or CI-enforced.
