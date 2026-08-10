function sanitizeName(name) {
    return name.replace(/[^a-z0-9\-_]+/gi, "_").toLowerCase() || "export";
}

function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function cleanFeatures(geojson) {
    const features = geojson.type === "FeatureCollection" ? geojson.features : [geojson];
    return features.map((f) => {
        const { __gvId, ...rest } = f.properties || {};
        return { ...f, properties: rest };
    });
}

export function exportLayerAsGeoJSON(entry) {
    const geojson = entry.leafletLayer.toGeoJSON();
    const features = cleanFeatures(geojson);
    if (features.length === 0) throw new Error(`"${entry.name}" has no features to export.`);

    const clean = { type: "FeatureCollection", features };
    downloadFile(`${sanitizeName(entry.name)}.geojson`, JSON.stringify(clean, null, 2), "application/geo+json");
}

export function exportLayerAsCSV(entry) {
    const geojson = entry.leafletLayer.toGeoJSON();
    const features = cleanFeatures(geojson);
    if (features.length === 0) throw new Error(`"${entry.name}" has no features to export.`);

    const rows = features.map((f) => {
        let lon, lat;
        if (f.geometry?.type === "Point") {
            [lon, lat] = f.geometry.coordinates;
        } else {
            [lon, lat] = turf.centroid(f).geometry.coordinates;
        }
        return { lat, lon, ...f.properties };
    });

    const fields = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const csv = Papa.unparse({ fields, data: rows.map((r) => fields.map((f) => r[f] ?? "")) });
    downloadFile(`${sanitizeName(entry.name)}.csv`, csv, "text/csv");
}
