# ohmec
The OHMEC project is a free, open-source geography project, with a goal of representing all historical indigenous lands and political boundaries in a unified database.
The uniqueness of OHMEC is its ability to represent these lands and boundaries on any date, as well as being able to show the dynamic changes in lands and boundaries from any point in history to the present.
It is in a nascent stage, using [leaflet](https://leafletjs.com) to visualize data stored in a JSON structure that is currently handcrafted.
Contributions are welcome.

See [this slidedeck](https://docs.google.com/presentation/d/1WiXMrLPC4fOwNaKD7UhH2Wb1JSVcva5z4sNdd0qS7vg/edit?usp=sharing) for more insight into the project.

A specification of the [extended GeoJSON](https://docs.google.com/document/d/15D9t61Y1WYYH02BuIp3C8InJD40L19uHIcPNDfNv0Bk/edit?usp=sharing) format that underpins the historical database is provided here.

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

## Basemaps

Most backgrounds need no API key:

| Layer id | Provider | Notes |
|----------|----------|--------|
| `relief` | Esri World Shaded Relief | Default |
| `world` | Esri World Imagery | Satellite |
| `physical` | Esri World Physical | Low-detail physical |
| `white` | Esri World Terrain | Light terrain |
| `stamen` | [OpenTopoMap](https://opentopomap.org/) | Terrain / contours (key `4`) |
| `positron` | [CARTO](https://carto.com/) Positron (no labels) | Light base, good label contrast (key `5`) |
| `paint` | [CARTO](https://carto.com/) Voyager (no labels) | Soft colorful base (key `7`) |

Optional Mapbox `streets` (key `6`) needs a public token — do not commit it:

```bash
cp mapbox-config.example.js mapbox-config.js
# set OHMEC_MAPBOX_TOKEN, or pass ?mapbox=pk....
```
