import { registerLayer } from "../core/layerRegistry.js";
import {
    annotateFeatureIds,
    detectGeometryType,
    detectLatLonColumns,
    csvRowsToGeoJSON,
    collectAttributeFields,
    buildLeafletLayer
} from "../utils/geojson.js";

function registerGeoJSON(data, name, sourceFormat, map) {
    if (!data || !data.features || data.features.length === 0) {
        throw new Error("No features found in this file.");
    }

    annotateFeatureIds(data);

    const layerIdRef = { current: null };
    const leafletLayer = buildLeafletLayer(data, layerIdRef).addTo(map);

    const entry = registerLayer({
        name,
        type: "import",
        leafletLayer,
        map,
        geometryType: detectGeometryType(data),
        sourceFormat,
        attributes: collectAttributeFields(data)
    });
    layerIdRef.current = entry.id;

    const bounds = leafletLayer.getBounds();
    if (bounds && bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }

    return { entry, count: data.features.length };
}

export async function importGeoJSONFile(file, map) {
    const text = await file.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error("That file isn't valid JSON.");
    }
    return registerGeoJSON(data, file.name, "GeoJSON", map);
}

export function importCSVFile(file, map) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const headers = results.meta.fields || [];
                    const { lat, lon } = detectLatLonColumns(headers);
                    if (!lat || !lon) {
                        reject(new Error("Couldn't detect latitude/longitude columns in this CSV."));
                        return;
                    }

                    const geojson = csvRowsToGeoJSON(results.data, lat, lon);
                    resolve(registerGeoJSON(geojson, file.name, "CSV", map));
                } catch (err) {
                    reject(err);
                }
            },
            error: (err) => reject(err)
        });
    });
}

export async function importKMLFile(file, map) {
    const text = await file.text();
    const xml = new DOMParser().parseFromString(text, "text/xml");
    const data = toGeoJSON.kml(xml);
    return registerGeoJSON(data, file.name, "KML", map);
}

export async function importShapefileFile(file, map) {
    const buffer = await file.arrayBuffer();
    const data = await shp(buffer);

    // shpjs returns a single FeatureCollection, or an array of them when the
    // zip bundles multiple shapefiles.
    const collections = Array.isArray(data) ? data : [data];

    return collections.map((fc, idx) => {
        const name = collections.length > 1 ? `${file.name} (${idx + 1})` : file.name;
        return registerGeoJSON(fc, name, "Shapefile", map);
    });
}
