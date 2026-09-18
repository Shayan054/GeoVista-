# GeoVista

GeoVista is a browser-based GIS dashboard for exploring maps and working with geographic data. It provides drawing, measurement, layer management, attribute inspection, and basic spatial analysis in a responsive interface.

## Features

- Switch between OpenStreetMap, satellite, dark, and topographic basemaps.
- Search for places or enter latitude and longitude coordinates; locate your current position with browser permission.
- Import GeoJSON, CSV with latitude/longitude columns, KML, or a zipped shapefile.
- Show and hide layers, adjust their appearance, inspect attributes, and export layer data as GeoJSON or CSV.
- Add markers, draw shapes, and measure distances and areas.
- Explore layer information and perform spatial analysis using Turf.js.
- Change the theme, units, and coordinate display in Settings. These preferences are saved in your browser.
- Use the menu button to access tools on narrow screens. Tool panels scroll within the screen on mobile.

## Run locally

No build step or package installation is required. The app uses JavaScript modules, so serve the project directory over HTTP rather than opening `index.html` directly as a file.

1. Extract the ZIP and open a terminal in the `GeoVista` folder.
2. Start a local server:

   ```bash
   python -m http.server 8000
   ```

   On Windows, use `py -m http.server 8000` if `python` is unavailable.
3. Open [http://localhost:8000](http://localhost:8000) in your browser.

An internet connection is needed for the external script/style libraries, map tiles, and place search. Location requires browser permission and a secure context such as `localhost` or HTTPS.

## Quick start

1. Choose a basemap with the control on the map.
2. Use the search field to find a place or enter coordinates, such as `33.6844, 73.0479`.
3. Open **Import Data** to load a supported file, or use **Markers** and **Draw** to create features.
4. Open **Layers** to control visibility and export data; use **Attributes** to inspect feature properties.
5. Use **Measure** for distance or area, and **Spatial Data** for analysis.

For CSV imports, include a header row with recognizable latitude and longitude columns. Shapefiles should be supplied as a ZIP containing the associated shapefile components.

## Project layout

```text
GeoVista/
├── index.html          # App shell and external library links
├── css/style.css       # Dashboard, dialogs, and mobile layout
└── js/
    ├── app.js          # App initialization and UI bindings
    ├── core/           # Layer registry, settings, tool coordination
    ├── map/            # Map and basemap configuration
    ├── tools/          # GIS interactions and file processing
    ├── ui/             # Panels and interface behavior
    └── utils/          # Shared helpers
```

## Built with

Vanilla JavaScript, [Leaflet](https://leafletjs.com/), [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw), [Turf.js](https://turfjs.org/), and [Tailwind CSS](https://tailwindcss.com/). File import uses Papa Parse, toGeoJSON, and shpjs.

## Data and limitations

Imported layers and map edits live in the current browser session; export anything you want to keep before closing or refreshing the page. Settings are saved separately in browser local storage. This is a client-side application and does not include accounts, a database, or server-side file storage.
