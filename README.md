# ohmec
The OHMEC project is a free, open-source geography project, with a goal of representing all historical indigenous lands and political boundaries in a unified database.
The uniqueness of OHMEC is its ability to represent these lands and boundaries on any date, as well as being able to show the dynamic changes in lands and boundaries from any point in history to the present.
It is in a nascent stage, using [Leaflet](https://leafletjs.com) 1.9.4 to visualize data stored in a JSON structure that is currently handcrafted.
Contributions are welcome.

See [this slidedeck](https://docs.google.com/presentation/d/1WiXMrLPC4fOwNaKD7UhH2Wb1JSVcva5z4sNdd0qS7vg/edit?usp=sharing) for more insight into the project.

The [augmented GeoJSON](docs/AUGMENTED_GEOJSON.md) format used by the historical databases is documented in-repo (dates, required properties, animation notes). A longer [Google Doc](https://docs.google.com/document/d/15D9t61Y1WYYH02BuIp3C8InJD40L19uHIcPNDfNv0Bk/edit?usp=sharing) still exists; if it disagrees with the repo doc or code, prefer the repo.

An up to date rendering can be found in our [Github Mirror Page](http://ohmec.net).

## Studies

All map studies share one page: `index.html`, selected with `?study=`:

| `study` | Description |
|---------|-------------|
| *(omit / `na`)* | North America (default / Home) |
| `meso` | Mesoamerica |
| `nl` | Native Lands |
| `aa` | Ancient Americas |
| `cherokee` | Cherokee migration |
| `viking` | Pre-Viking northern Europe |
| `ma` | Middle America bridge study |
| `aciv` | Ancient civilizations |

Example: `index.html?study=meso`. Older `index_*.html` URLs redirect to the equivalent `?study=` link. Study metadata lives in `studies.js`.

Study geometry lives in `ohmec_data_*.geojson` and is loaded with `fetch` (not as sync `<script>` globals). Serve over HTTP (for example `python3 -m http.server`) so those requests succeed.

## CI / local checks

GitHub Actions runs on PRs and `main`:

- parse/structure-check all `ohmec_data_*.geojson`
- ESLint on viewer JS
- `check_boundaries.py` on changed mid-size datasets (skips the multi‑MB `na` / `nl` files)

Locally:

```bash
npm ci
npm run lint
npm run validate:data
# optional, from utilities/:
# python3 check_boundaries.py ../ohmec_data_meso.geojson
```

## Basemaps

Most backgrounds need no API key:

| Layer id | Provider | Notes |
|----------|----------|--------|
| `relief` | Esri World Shaded Relief | Default |
| `world` | Esri World Imagery | Satellite |
| `physical` | Esri World Physical | Low-detail physical |
| `white` | Esri World Terrain | Light terrain |
| `topo` | [OpenTopoMap](https://opentopomap.org/) | Terrain / contours (key `4`); alias `stamen` |
| `positron` | [CARTO](https://carto.com/) Positron (no labels) | Light base, good label contrast (key `5`) |
| `voyager` | [CARTO](https://carto.com/) Voyager (no labels) | Soft colorful base (key `7`); alias `paint` |

Optional Mapbox `streets` (key `6`) needs a public token — do not commit it:

```bash
cp mapbox-config.example.js mapbox-config.js
# set OHMEC_MAPBOX_TOKEN, or pass ?mapbox=pk....
```
