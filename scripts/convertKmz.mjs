/**
 * Convert KMZ files (Floodgates, Valves) to GeoJSON.
 *
 * KMZ is a zipped KML. Each KML has Placemarks with:
 *   - <name> (gate/valve code)
 *   - <coordinates> lon,lat,alt
 *   - HTML description table with: FID, Latitude, Longitude, GateCode, OperatingA
 *
 * Usage: node scripts/convertKmz.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractPlacemarks(kmlText) {
  const features = [];
  // Split on <Placemark to get each placemark block
  const parts = kmlText.split('<Placemark');

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const endIdx = block.indexOf('</Placemark>');
    if (endIdx === -1) continue;
    const placemark = block.substring(0, endIdx);

    // Extract name (gate code)
    const nameMatch = placemark.match(/<name>([^<]+)<\/name>/);
    const gateCode = nameMatch ? nameMatch[1].trim() : null;
    if (!gateCode) continue;

    // Extract coordinates from <coordinates> tag
    const coordMatch = placemark.match(/<coordinates>\s*([^<]+)<\/coordinates>/);
    if (!coordMatch) continue;
    const coordParts = coordMatch[1].trim().split(',');
    const lon = parseFloat(coordParts[0]);
    const lat = parseFloat(coordParts[1]);
    if (isNaN(lon) || isNaN(lat)) continue;

    // Extract OperatingA from the HTML description table
    let operatingAuthority = '';
    const opMatch = placemark.match(/OperatingA<\/td>\s*\n?\s*<td>([^<]+)<\/td>/);
    if (opMatch) {
      operatingAuthority = opMatch[1].trim();
    }

    features.push({
      type: 'Feature',
      properties: {
        GateCode: gateCode,
        OperatingAuthority: operatingAuthority,
      },
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

function convertKmz(kmzPath, outputPath, name) {
  console.log(`Converting ${name}...`);

  // Unzip KMZ to temp dir
  const tmpDir = join(__dirname, '..', '.kmz-tmp');
  mkdirSync(tmpDir, { recursive: true });
  execSync(`unzip -o "${kmzPath}" -d "${tmpDir}"`, { stdio: 'pipe' });

  // Read the KML file (always named doc.kml inside KMZ)
  const kmlPath = join(tmpDir, 'doc.kml');
  const kmlText = readFileSync(kmlPath, 'utf-8');

  // Parse and convert
  const geojson = extractPlacemarks(kmlText);

  // Write output
  writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`  -> Wrote ${geojson.features.length} features to ${outputPath}`);

  // Clean up temp dir
  execSync(`rm -rf "${tmpDir}"`);

  return geojson;
}

function main() {
  const kmzDir = join(__dirname, '..', 'data-sources', 'kmz');
  const outputDir = join(__dirname, '..', 'public', 'data');
  mkdirSync(outputDir, { recursive: true });

  convertKmz(
    join(kmzDir, 'Floodgates.kmz'),
    join(outputDir, 'floodgates.json'),
    'Floodgates'
  );

  convertKmz(
    join(kmzDir, 'Valves.kmz'),
    join(outputDir, 'valves.json'),
    'Valves'
  );

  console.log('\nConversion complete!');
}

main();
