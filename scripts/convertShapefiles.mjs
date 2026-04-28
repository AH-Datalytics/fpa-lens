import shapefile from 'shapefile';
import proj4 from 'proj4';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Define projections
// Louisiana State Plane South (feet) - EPSG:3452
const LA_STATE_PLANE = '+proj=lcc +lat_1=29.3 +lat_2=30.7 +lat_0=28.5 +lon_0=-91.33333333333333 +x_0=999999.9999898402 +y_0=0 +datum=NAD83 +units=us-ft +no_defs';

// WGS84 - EPSG:4326 (standard lat/lon)
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

// NAD83 CSRS (already in degrees, similar to WGS84)
const NAD83_CSRS = '+proj=longlat +datum=NAD83 +no_defs';

async function convertShapefile(inputPath, outputPath, sourceProj, name) {
  console.log(`Converting ${name}...`);

  const features = [];
  const source = await shapefile.open(inputPath);

  while (true) {
    const result = await source.read();
    if (result.done) break;

    const feature = result.value;

    // Transform coordinates
    if (feature.geometry) {
      feature.geometry = transformGeometry(feature.geometry, sourceProj);
    }

    features.push(feature);
  }

  const geojson = {
    type: 'FeatureCollection',
    features: features
  };

  writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`  -> Wrote ${features.length} features to ${outputPath}`);

  // Log sample properties
  if (features.length > 0 && features[0].properties) {
    console.log(`  -> Properties: ${Object.keys(features[0].properties).join(', ')}`);
  }

  return geojson;
}

function transformGeometry(geometry, sourceProj) {
  const transform = (coord) => {
    const [x, y] = proj4(sourceProj, WGS84, coord);
    return [x, y];
  };

  const transformCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      return transform(coords);
    }
    return coords.map(transformCoords);
  };

  return {
    ...geometry,
    coordinates: transformCoords(geometry.coordinates)
  };
}

/**
 * Post-conversion fixups for the OLD Centerline reach-level shapefile.
 *
 * Source has the mowing zone in a `Zone` field, with one row
 * accidentally typed "Lakefront and Outfall Canals" while the rest say
 * "Lakefront & Outfall Canals". Same meaning, but our app keys off the
 * literal string for color lookups, so normalize here.
 *
 * Per Kory's Apr 28 email, the 6 reaches with empty `Zone` break down
 * into one mowing reach plus 5 structures (locks / surge barrier /
 * PCCP walls) that have no mowing area. Tag them so the map can dim
 * them or hide them; the new "GIWW North" reach (LPV-115) gets its
 * own zone since it wasn't on the original hand-drawn cutting plan.
 */
const STRUCTURE_LABELS = {
  // key: `${reachName}|${lpv}`  -> friendly structure name
  'New Orleans East/Citrus Back|IHNC-02': 'Surge Barrier',
  'Orleans Perimeter|null': 'Orleans Ave PCCP',
  'Orleans Perimeter|IHNC-01': 'Seabrook Complex',
  'Orleans Levee District|null': 'Industrial Canal Locks',
  '|null': 'London Ave PCCP Wall',
};
function normalizeOldCenterline(geojson) {
  for (const f of geojson.features) {
    const p = f.properties || {};
    const reachName = (p.reach_name ?? '').replace(/\u0000+/g, '').trim();
    // DBF strings are right-padded with NUL bytes; strip those before trim().
    let zone = (p.Zone ?? '').replace(/\u0000+/g, '').trim();
    const lpv = (p.LPV ?? '').replace(/\u0000+/g, '').trim() || null;
    if (zone === 'Lakefront and Outfall Canals') {
      zone = 'Lakefront & Outfall Canals';
    }
    // LPV-115 ("Paris Rd. to Jourdan") shows up in Kory's data with
    // an empty zone. It wasn't on the original hand-drawn cutting plan,
    // and no one has confirmed yet whether it's actually mowed. We keep
    // it visible on the map as "Unassigned" until the Director or
    // maintenance team classifies it.
    const structureKey = `${reachName}|${lpv ?? 'null'}`;
    const isStructure = !zone && structureKey in STRUCTURE_LABELS;
    f.properties = {
      reachName,
      zone,
      lpv,
      isStructure,
      structureName: isStructure ? STRUCTURE_LABELS[structureKey] : null,
    };
  }
  return geojson;
}

/**
 * Mowing-area polygon shapefile. Per Kory's Apr 28 email, this is the
 * authoritative source for per-zone acreage and per-polygon names. We
 * keep all 144 polygons including the empty-zone "Paris Rd. to Jourdan"
 * (LPV-115 / GIWW North), promoting it to the new GIWW North zone the
 * same way we do for the centerline.
 */
function normalizeMowingAreas(geojson) {
  for (const f of geojson.features) {
    const p = f.properties || {};
    const name = (p.Name ?? '').replace(/\u0000+/g, '').trim();
    // DBF strings are right-padded with NUL bytes; strip those before trim().
    let zone = (p.Zone ?? '').replace(/\u0000+/g, '').trim();
    if (zone === 'Lakefront and Outfall Canals') {
      zone = 'Lakefront & Outfall Canals';
    }
    // Leave the LPV-115 polygon's zone empty so the map renders it as
    // "Unassigned" until the Director / maintenance team confirms
    // whether it's actually mowed.
    const acres = typeof p.Area === 'number' ? p.Area : Number(p.Area ?? 0);
    f.properties = {
      name,
      zone,
      acres: Math.round(acres * 100) / 100,
    };
  }
  return geojson;
}

async function main() {
  const shapefileDir = join(__dirname, '..', 'data', 'sources', 'shapefiles');
  const outputDir = join(__dirname, '..', 'public', 'data');

  // Create output directory
  mkdirSync(outputDir, { recursive: true });

  // Convert each shapefile
  await convertShapefile(
    join(shapefileDir, 'FPA_Levee_Centerline.shp'),
    join(outputDir, 'levee-centerline.json'),
    LA_STATE_PLANE,
    'Levee Centerline'
  );

  await convertShapefile(
    join(shapefileDir, 'Complex_Structures.shp'),
    join(outputDir, 'complex-structures.json'),
    LA_STATE_PLANE,
    'Complex Structures'
  );

  await convertShapefile(
    join(shapefileDir, 'PCCPs.shp'),
    join(outputDir, 'pccps.json'),
    NAD83_CSRS,  // This one is already in geographic coordinates
    'PCCP Stations'
  );

  // Reach-level OLD centerline with mowing zone + LPV (Kory, Apr 2026).
  const oldCenterline = await convertShapefile(
    join(shapefileDir, 'OLD_Centerline.shp'),
    join(outputDir, 'old-centerline.json'),
    LA_STATE_PLANE,
    'OLD Centerline (with mowing zones)'
  );
  normalizeOldCenterline(oldCenterline);
  writeFileSync(
    join(outputDir, 'old-centerline.json'),
    JSON.stringify(oldCenterline, null, 2),
  );
  console.log('  -> Tagged structures and promoted LPV-115 to GIWW North');

  // Mowing-area polygons with per-polygon name + zone + acreage (Kory,
  // Apr 28 email). NB: this shapefile's .prj is already WGS84 lat/lon
  // (unlike the centerline shapefiles which are in LA State Plane), so
  // we pass WGS84 as the source -- proj4 then no-ops the transform.
  const mowingAreas = await convertShapefile(
    join(shapefileDir, 'OLD_Mowing_Area.shp'),
    join(outputDir, 'old-mowing-areas.json'),
    WGS84,
    'OLD Mowing Areas (polygons with acreage)'
  );
  normalizeMowingAreas(mowingAreas);
  writeFileSync(
    join(outputDir, 'old-mowing-areas.json'),
    JSON.stringify(mowingAreas, null, 2),
  );
  console.log('  -> Normalized properties to {name, zone, acres}; empty-zone polygons left as Unassigned');

  console.log('\nConversion complete!');
}

main().catch(console.error);
