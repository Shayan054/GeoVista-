import { registerLayer } from "../core/layerRegistry.js";

function toFeatureCollection(entry) {
    const gj = entry.leafletLayer.toGeoJSON();
    const fc = gj.type === "FeatureCollection" ? gj : { type: "FeatureCollection", features: [gj] };
    if (fc.features.length === 0) throw new Error(`"${entry.name}" has no features yet.`);
    return fc;
}

function firstPolygon(fc, layerName) {
    const poly = fc.features.find((f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"));
    if (!poly) throw new Error(`"${layerName}" has no polygon features.`);
    return poly;
}

function registerResultLayer(map, name, geojson, geometryType) {
    const leafletLayer = L.geoJSON(geojson, {
        style: () => ({ color: "#059669", weight: 3, fillColor: "#10b981", fillOpacity: 0.3 }),
        pointToLayer: (feature, latlng) =>
            L.circleMarker(latlng, { radius: 6, color: "#059669", weight: 2, fillColor: "#10b981", fillOpacity: 0.8 })
    }).addTo(map);

    const entry = registerLayer({
        name,
        type: "analysis",
        leafletLayer,
        map,
        geometryType,
        sourceFormat: "Analysis"
    });

    const bounds = leafletLayer.getBounds();
    if (bounds && bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }

    return entry;
}

export function runBuffer(entry, map, meters) {
    const fc = toFeatureCollection(entry);
    const buffered = turf.buffer(fc, meters, { units: "meters" });
    return registerResultLayer(map, `${entry.name} Buffer (${meters}m)`, buffered, "Polygon");
}

export function runCentroid(entry, map) {
    const fc = toFeatureCollection(entry);
    const centroid = turf.centroid(fc);
    return registerResultLayer(map, `${entry.name} Centroid`, centroid, "Point");
}

export function runBoundingBox(entry, map) {
    const fc = toFeatureCollection(entry);
    const bboxPoly = turf.bboxPolygon(turf.bbox(fc));
    return registerResultLayer(map, `${entry.name} Bounding Box`, bboxPoly, "Polygon");
}

export function runPointInPolygon(pointEntry, polygonEntry, map) {
    const points = toFeatureCollection(pointEntry);
    const poly = firstPolygon(toFeatureCollection(polygonEntry), polygonEntry.name);

    const inside = {
        type: "FeatureCollection",
        features: points.features.filter((pt) => pt.geometry?.type === "Point" && turf.booleanPointInPolygon(pt, poly))
    };
    if (inside.features.length === 0) throw new Error("No points from that layer fall inside the polygon.");

    return registerResultLayer(map, `${pointEntry.name} in ${polygonEntry.name}`, inside, "Point");
}

export function runNearestFeature(fromEntry, targetEntry, map) {
    const fromFc = toFeatureCollection(fromEntry);
    const targetFc = toFeatureCollection(targetEntry);

    const fromPoint = turf.centroid(fromFc);
    const targetPoints = turf.featureCollection(targetFc.features.map((f) => turf.centroid(f)));

    const nearest = turf.nearestPoint(fromPoint, targetPoints);
    return registerResultLayer(map, `Nearest in ${targetEntry.name}`, nearest, "Point");
}

export function runIntersect(entryA, entryB, map) {
    const polyA = firstPolygon(toFeatureCollection(entryA), entryA.name);
    const polyB = firstPolygon(toFeatureCollection(entryB), entryB.name);

    const result = turf.intersect(polyA, polyB);
    if (!result) throw new Error(`The first polygon of "${entryA.name}" and "${entryB.name}" don't intersect.`);

    return registerResultLayer(map, `${entryA.name} ∩ ${entryB.name}`, result, "Polygon");
}

export function runUnion(entryA, entryB, map) {
    const polyA = firstPolygon(toFeatureCollection(entryA), entryA.name);
    const polyB = firstPolygon(toFeatureCollection(entryB), entryB.name);

    const result = turf.union(polyA, polyB);
    return registerResultLayer(map, `${entryA.name} ∪ ${entryB.name}`, result, "Polygon");
}

export function runSpatialSelection(targetEntry, drawEntry, map) {
    if (!drawEntry) throw new Error(`Couldn't find the "Drawn Features" layer.`);

    const drawFc = toFeatureCollection(drawEntry);
    const polygons = drawFc.features.filter((f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon");
    if (polygons.length === 0) throw new Error("Draw a polygon or rectangle first (in the Draw tool).");

    const selector = polygons[polygons.length - 1]; // most recently drawn
    const targetFc = toFeatureCollection(targetEntry);

    const selected = {
        type: "FeatureCollection",
        features: targetFc.features.filter((f) => {
            try {
                return f.geometry?.type === "Point"
                    ? turf.booleanPointInPolygon(f, selector)
                    : turf.booleanIntersects(f, selector);
            } catch (e) {
                return false;
            }
        })
    };
    if (selected.features.length === 0) throw new Error("No features from that layer fall inside the drawn polygon.");

    return registerResultLayer(map, `${targetEntry.name} (selected)`, selected, "Mixed");
}
