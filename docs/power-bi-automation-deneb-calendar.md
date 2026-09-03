# VakeTomate Power BI Automation — Deneb Annual Calendar Reference

## Purpose

This document records the production-direction decisions from the manual Power BI reference implementation of **Tutkimusrahoituksen vuosikalenteri**. It complements `docs/power-bi-automation.md` and captures the final calendar behavior that VakeTomate should generate automatically.

## Reference UX

The primary report page is a no-page-scroll, 16:9 internal view with:

1. report title and internal-use subtitle
2. compact top filters
3. selected-funding-call detail panel
4. continuous annual timeline
5. exact moving `Tänään` marker
6. direct/open-source link action

### Top filters

- Kategoria — dropdown
- Ala — dropdown
- Hakijatyyppi — dropdown
- Rahoitushaku — dropdown
- Jatkuva haku — compact boolean control
- Kuukausi — 12 always-visible buttons from a proper month dimension
- Kvartaali — Q1/Q2/Q3/Q4 buttons from the same month dimension
- optional one-click reset of all filters

### Selected-call detail panel

Clicking one funding-call bar selects one `Haku_ID` and updates:

- Rahoitushaku
- Kategoria
- Hakija(t)
- Ala(t)
- Jatkuva haku
- Kuvaus
- Huomiot
- dynamic link/open action

Long text uses dynamic text values and wraps without horizontal scrolling.

## Production annual calendar visual

Preferred visual: **Deneb / Vega-Lite** when allowed by tenant custom-visual policy.

Fallback: native duration-aware Power BI Matrix when Deneb is not permitted.

### Deneb dataset fields

Reference fields passed into Deneb:

- `Haku_ID`
- `Rahoittaja` / future `Haku_nimi`
- `Kategoria`
- `Jatkuva_haku`
- `Kuvaus`
- `Linkki`
- `Kvartaali_alkaa` (temporary reference start date)
- `Kvartaali_päättyy` (temporary reference end date)
- `Tanaan_Pvm`
- `Vuoden_Alku`
- `Vuoden_Loppu`

Future preferred source fields are `Haku_alkaa` and `Haku_päättyy`; the report template must allow start/end field aliases so the visual does not need redesign when the source schema improves.

### Timeline behavior

- x-axis is a continuous date scale, not categorical months
- annual scale always includes 1 January through 31 December of the displayed year
- month labels appear at the top in Finnish
- one row per funding call
- bar start = opening/start date
- bar end = closing/end date
- tooltips expose key metadata
- no count numbers are shown

### Exact current-date marker

The visual includes a vertical rule driven by `TODAY()`.

It is positioned on the exact continuous date scale:

- 1 September: line at the beginning of September
- mid-September: line approximately halfway across September
- end of September: line near the September/October boundary

The marker must advance automatically when the report is reevaluated/refreshed.

### Selection behavior

Deneb cross-filtering must be enabled using **Expose cross-filtering values for dataset rows** with **Simple** management mode.

The specification should use Deneb's `__selected__` field to visually de-emphasize unselected bars and highlight the selected bar.

Clicking a bar filters the selected-call detail panel. Clicking empty Deneb canvas clears the selection.

### Link behavior

Preferred UX:

- click bar: select call and reveal details
- click an adjacent `↗` link mark or the selected-call `Avaa rahoitushaku` button: open the source URL

This avoids making one click simultaneously navigate away and perform Power BI selection.

### Continuous calls

Calls where `Jatkuva_haku = KYLLÄ` should have an explicit visual cue such as `∞` at the bar end. Any artificial year-end endpoint used only for drawing must remain distinguishable from a real closing date.

## Duration-aware month and quarter filtering

The original single `Kuukausi` field is insufficient for a call spanning multiple months.

VakeTomate must generate:

`Bridge_HakuKuukaudet(Haku_ID, Kuukausi_alku, Kuukausi_nro, Kuukausi, Kvartaali)`

A call spanning January–August must be filterable from every month January through August and from every quarter it overlaps.

Reference relationships:

```text
DimKuukausi (1) ---- (*) Bridge_HakuKuukaudet (*) ---- (1) Fact_Rahoitushaut
```

Recommended filter behavior:

- `DimKuukausi -> Bridge_HakuKuukaudet`: single direction
- `Fact_Rahoitushaut <-> Bridge_HakuKuukaudet`: bidirectional in the current reference implementation so a month selection reaches the fact table; the generated production model should validate ambiguity and prefer a cleaner star-schema strategy where practical

Top month and quarter slicers use `DimKuukausi`, ensuring all 12 months and Q1–Q4 remain available instead of disappearing under other filters.

## Branding

Use the approved VAKE palette/theme rather than arbitrary visual colors. Color encoding should ultimately represent the confirmed T/K/K/I service mapping when that source field is available; current `Kategoria` coloring is only an interim encoding.

The automation template must allow a configuration mapping from semantic category/service values to brand hex colors.

## No-scroll acceptance rule

The generated page targets a standard 16:9 desktop viewport and should not require page-level scrolling.

Recommended hierarchy:

```text
Title + subtitle
Compact slicers
Selected-call summary cards
Kuvaus + Huomiot + open-link action
Deneb annual timeline
```

The Deneb visual should use the available container dimensions so the active result set remains visible without a horizontal timeline scrollbar. If future data volumes make all rows illegible, the template should rely on filtering or separate overview/detail pages rather than microscopic labels.

## Automation responsibilities

The VakeTomate Power BI module should eventually automate:

- source-schema mapping
- Kyllä/Ei normalization
- stable `Haku_ID`
- applicant and discipline bridge tables
- duration-aware month bridge
- relationships
- selected-record DAX measures
- current-date/year measures
- Deneb field bindings
- Deneb JSON specification generation
- report theme and layout
- slicers and reset behavior
- selected-call panel
- URL/open-source action
- validation and refresh checks
- approved Matrix fallback when custom visuals are unavailable

## Outstanding source-semantic requirements

The report generator must not guess these mappings:

1. exact T/K/K/I service/color mapping
2. whether `Ala_Kaikki` means every defined discipline for filtering
3. explicit `Valtionavustus` exclusion flag for technical enforcement
4. actual funder vs. funding-call-name field separation
5. future exact `Haku_alkaa` / `Haku_päättyy` dates
6. people/responsibility-page semantics
7. Koulutusvuosikello requirements from Sonja/Taina
