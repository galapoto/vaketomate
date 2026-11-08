# VAKE process-description implementation rules

This file is the domain policy baseline for the VakeTomate Prosessikuvaus module.

## Process-flow description structure

The module follows the IMS three-page technique:

1. Prosessin yhteenveto
2. Prosessikaavio
3. Vaiheiden kuvaus

Only essential/useful information belongs in the summary and phase-detail views.

## Summary fields

- Nimi
- Luokka: Ydinprosessi / tukiprosessi / avainprosessi / luokittelematon
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

Do not invent organizational facts merely from a title or detected system/document names.

## Diagram rules

- Every process actor has a dedicated swimlane.
- Process normally proceeds left to right.
- A return to the left means returning to an earlier phase.
- Start and end use their dedicated symbols.
- Input/output and information flows are labelled where relevant.
- Phase text is present-tense third person, e.g. `täyttää hakemuksen`.
- Keep key phases only; recommended maximum is about 20 phases.
- Complex processes should be split using subprocess/process links when necessary.
- Process description and detailed work instruction are different things.

## Phase-detail fields

- Vaihe: name from diagram
- Vastuu: responsible role; can specify assisting/informed roles
- Kriittiset tehtävät: mandatory tasks, one per line, imperative form
- Ohjeet, menetelmät ja mallit: guides/documents/methods/required IT systems; no activity here
- Syntyvä ja jäljitettävä tieto: traceable information/metrics and documentation location

## Symbols

- Vaihe
- Valinta / päätös — normally a question with branches
- Tietojärjestelmä
- Asiakirja
- Prosessin alku
- Prosessin loppu
- Virta, yhdensuuntainen
- Virta, vuorovaikutteinen
- Tietovuo
- Uimarata
- Prosessi
- Tukiprosessi

## Colors extracted from supplied VAKE IMS symbol library

- activity/decision green: `#C7E2AA`
- alternative light blue: `#C8EAFA`
- alternative light pink: `#F7BAD5`
- system/document fill: `#E6E6E6`
- system/document stroke: `#808080`
- white: `#FFFFFF`
- black: `#000000`

## Approval and review

- process owner is normally the approver;
- completed process description is submitted to the owner for approval;
- approval means the description matches the owner's understanding of current operating practice;
- rejected approval must carry a reason/change request;
- VAKE review interval: 12 months;
- after approval, next review is scheduled through the shared VakeTomate review service.

## Organization-specific normalization

- `TKKI` and `TKKI-yksikkö` are the same actor.
- canonical label: `TKKI-yksikkö`.
- combined responsibilities remain distinct unless the organization explicitly defines an alias.
