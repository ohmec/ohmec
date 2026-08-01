# ohmec
The OHMEC project is a free, open-source geography project, with a goal of representing all historical indigenous lands and political boundaries in a unified database.
The uniqueness of OHMEC is its ability to represent these lands and boundaries on any date, as well as being able to show the dynamic changes in lands and boundaries from any point in history to the present.
It is in a nascent stage, using [leaflet](https://leafletjs.com) to visualize data stored in a JSON structure that is currently handcrafted.
Contributions are welcome.

See [this slidedeck](https://docs.google.com/presentation/d/1WiXMrLPC4fOwNaKD7UhH2Wb1JSVcva5z4sNdd0qS7vg/edit?usp=sharing) for more insight into the project.

A specification of the [extended GeoJSON](https://docs.google.com/document/d/15D9t61Y1WYYH02BuIp3C8InJD40L19uHIcPNDfNv0Bk/edit?usp=sharing) format that underpins the historical database is provided here.

An up to date rendering can be found in our [Github Mirror Page](http://ohmec.net).

## Mapbox streets basemap (optional)

The labeled `streets background uses Mapbox and needs a public access token.
Do not commit tokens, Github will reject the push

Alternatively pass `?mapbox=pk.your_token` in the page URL

## Stamen / Stadia basemaps

The `stamen` (terrain backgroun) and `paint` (watercolor) layers use
[Stadia Maps](https://docs.stadiamaps.com/guides/migrating-from-stamen-map-tiles/)
hosting.
