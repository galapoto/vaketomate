# Power BI Reference Implementation Status

Date: 2026-09-04

This note records behavior confirmed in the manual Tutkimusrahoituksen vuosikalenteri reference implementation. It supplements `power-bi-automation.md` and `power-bi-automation-deneb-calendar.md`.

## Confirmed working

- Deneb/Vega-Lite continuous annual calendar renders funding-call durations from the configured start/end date fields.
- Exact moving `Tänään` vertical rule works on the continuous date scale.
- Category coloring and tooltips work.
- Duration-aware `Bridge_HakuKuukaudet` exists.
- `DimKuukausi` month/quarter slicers work in the semantic model.
- `Bridge_Hakijat` and `Bridge_Alat` slicers work after explicit Deneb visibility handling.
- `Kategoria`, `Rahoitushaku`, `Jatkuva_haku`, month, quarter, applicant type and area filtering have been manually tested successfully.

## Important Deneb filtering finding

In the reference report, related-table slicer filters correctly reached `Fact_Rahoitushaut` (validated with `Hakujen määrä`) but Deneb continued to receive the original full row set. The production workaround is an explicit visual visibility measure passed into Deneb and applied as a visual-level filter.

Reference measure pattern:

```DAX
Nayta_Haku_Deneb =
VAR HakuID =
    SELECTEDVALUE(Fact_Rahoitushaut[Haku_ID])
VAR HakuAlku =
    SELECTEDVALUE(Fact_Rahoitushaut[Kvartaali_alkaa])
VAR HakuLoppu =
    SELECTEDVALUE(Fact_Rahoitushaut[Kvartaali_päättyy])

VAR AikaSuodatettu =
    ISFILTERED(DimKuukausi[Kuukausi])
        || ISFILTERED(DimKuukausi[Kvartaali])
VAR AikaOsumia =
    COUNTROWS(
        FILTER(
            ALLSELECTED(DimKuukausi),
            HakuAlku <= EOMONTH(DimKuukausi[Kuukausi_alku], 0)
                && HakuLoppu >= DimKuukausi[Kuukausi_alku]
        )
    )
VAR AikaOK =
    IF(NOT AikaSuodatettu, TRUE(), AikaOsumia > 0)

VAR HakijaSuodatettu =
    ISFILTERED(Bridge_Hakijat[Hakijatyyppi])
VAR ValitutHakijat =
    VALUES(Bridge_Hakijat[Hakijatyyppi])
VAR HakijaOsumia =
    CALCULATE(
        COUNTROWS(Bridge_Hakijat),
        REMOVEFILTERS(Bridge_Hakijat),
        TREATAS({ HakuID }, Bridge_Hakijat[Haku_ID]),
        TREATAS(ValitutHakijat, Bridge_Hakijat[Hakijatyyppi])
    )
VAR HakijaOK =
    IF(NOT HakijaSuodatettu, TRUE(), HakijaOsumia > 0)

VAR AlaSuodatettu =
    ISFILTERED(Bridge_Alat[Ala])
VAR ValitutAlat =
    VALUES(Bridge_Alat[Ala])
VAR AlaOsumia =
    CALCULATE(
        COUNTROWS(Bridge_Alat),
        REMOVEFILTERS(Bridge_Alat),
        TREATAS({ HakuID }, Bridge_Alat[Haku_ID]),
        TREATAS(ValitutAlat, Bridge_Alat[Ala])
    )
VAR AlaOK =
    IF(NOT AlaSuodatettu, TRUE(), AlaOsumia > 0)

RETURN
    IF(
        NOT ISBLANK(HakuID)
            && AikaOK
            && HakijaOK
            && AlaOK,
        1,
        0
    )
```

The measure is added to Deneb Values and filtered at visual level to `Nayta_Haku_Deneb = 1`.

## Automation implication

VakeTomate should generate and validate an equivalent visual-eligibility measure when a report template uses Deneb with related-table slicers. Generation should be configuration-driven so the relevant bridge dimensions can be included without hard-coding only applicants/areas/months.

## Remaining completion work

- enable/test Deneb bar cross-filter selection into the selected-call detail panel
- finish dynamic source-link/open behavior
- add reset-filters button/bookmark
- remove diagnostic `Hakujen määrä` card after validation
- finalize compact no-scroll 16:9 layout and typography
- map confirmed T/K/K/I semantics to the official color scheme when the source field/business rule is available
- technically enforce exclusion of valtionavustushaut when an explicit source flag/business rule is available
