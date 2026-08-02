# OHMEC Augmented GeoJSON

This document describes the extensions OHMEC uses on top of
[GeoJSON (RFC 7946)](https://datatracker.ietf.org/doc/html/rfc7946).
It is the **in-repo source of truth for behavior implemented by the
viewer** (`ohmec.js`).

A longer narrative copy also lives in the
[Google Doc](https://docs.google.com/document/d/15D9t61Y1WYYH02BuIp3C8InJD40L19uHIcPNDfNv0Bk/edit?usp=sharing).
If that document disagrees with this file (especially **About Dates**),
prefer this file and the code.

Study datasets are plain `ohmec_data_*.geojson` FeatureCollections,
loaded with `fetch` (see `studies.js`).

---

## Geometry

Allowed `geometry.type` values for features:

- `Point` — points of interest
- `LineString` — routes / voyages
- `Polygon` / `MultiPolygon` — areas

Instead of inline `coordinates`, geometry may use:

- `coordinate_copy`: feature `id` of an earlier feature with the same geometry type
- `coordinate_copies`: array of feature ids (target must be `MultiPolygon`)

---

## Feature properties

### Required (non–Native Lands features)

| Property | Notes |
|----------|--------|
| `entity1type` | e.g. `nation`, `tribe` |
| `entity1name` | display / label name when `entity2name` absent |
| `fidelity` | integer **1–5** (1 lowest confidence, 5 highest) |
| `startdatestr` | inclusive start; see [About Dates](#about-dates) |
| `enddatestr` | inclusive end; see [About Dates](#about-dates) |
| `source` **or** `sources` | URL string, or array of URL strings (optional `label:url` form) |

### Common optional properties

| Property | Notes |
|----------|--------|
| `entity2type` / `entity2name` | secondary label (preferred for map text when present) |
| `editdatestr` | editor metadata; same date-string rules |
| `animateTo` | feature `id` to morph toward over this feature’s span |
| `noLabel` | suppress map label |
| `waive_overlap` / related | used by `utilities/check_boundaries.py` |

Top-level FeatureCollection may also include `viewpoint`, `popups`,
`styles`, and `periods` (see Google Doc / existing study files for
examples). The viewer applies `styles` / `periods` by match rules in
`geo_lint`.

---

## About Dates

Date-valued strings appear in feature `startdatestr` / `enddatestr`
(and optionally `editdatestr`), in FeatureCollection `viewpoint`,
popups, period lists, and URL parameters (`startdatestr`, `enddatestr`,
`curdatestr`).

### Accepted forms

| Form | Example | Meaning |
|------|---------|---------|
| Full day | `1600:01:01` | year : month : day (`YYYY:MM:DD`) |
| Year + month | `1875:05` | resolved to a calendar day (below) |
| Year only | `1609` | resolved to a calendar day (below) |
| BC year | `1800BC` | year only, Before Christ |
| BC with month/day | `800BC:06:15` | `BC` may appear on the year token |
| Ongoing end | `present` | **`enddatestr` only** — valid through “today” |

Month and day are 1-based in the string (`01` = January, etc.).

### How partial dates resolve

Implemented by `str2date` in `ohmec.js`:

**Start dates** (`roundLate = false` — feature starts, viewpoint start/current, etc.):

- `YYYY` → January 1 of that year, 00:00:00  
- `YYYY:MM` → the 1st of that month, 00:00:00  
- `YYYY:MM:DD` → that calendar day, 00:00:00  

**End dates** (`roundLate = true` — feature ends, viewpoint end, etc.):

- `YYYY` → December 31 of that year, 23:59:59  
- `YYYY:MM` → last day of that month, 23:59:59  
- `YYYY:MM:DD` → that calendar day, 23:59:59  

BC uses the same rules after parsing the year as negative
(e.g. `1800BC` → start of year 1800 BC as used by the viewer).

A feature is shown when  
`startDate ≤ currentDate ≤ endDate` (inclusive of the resolved instants).

### URL parameters

`?startdatestr=…&curdatestr=…&enddatestr=…` accept the same strings
(not US `MM/DD/YYYY`). Examples:

```text
index.html?study=meso&curdatestr=1800BC
index.html?startdatestr=1492&enddatestr=1526&curdatestr=1519:04:21
```

### Examples from the databases

```json
"startdatestr": "1600:01:01",
"enddatestr": "1776:07:03"
```

```json
"startdatestr": "800BC",
"enddatestr": "present"
```

```json
"startdatestr": "22000BC",
"enddatestr": "10000BC"
```

---

## Feature animation (summary)

If `properties.animateTo` names another feature id:

- Geometry types must be compatible (`Polygon`→`Polygon`, etc.).
- For polygons, vertex counts must match; differing coordinates
  interpolate across this feature’s date span.
- For `LineString`, the destination may grow (add vertices at the end);
  shrinking is not supported.

Broken animation links are soft-failed at load (`geo_lint` / 
`prepare_animations`): the feature remains as a static shape.

---

## Validation

- Structural checks: `python3 utilities/validate_geojson.py`  
- Viewer property checks: `geo_lint` in `ohmec.js` (soft-fail with on-page warning)  
- Optional geometry QA: `utilities/check_boundaries.py`
