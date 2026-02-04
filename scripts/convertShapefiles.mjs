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

async function main() {
  const shapefileDir = join(__dirname, '..', 'Centerline and Structures Shapefiles');
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

  console.log('\nConversion complete!');
}

main().catch(console.error);
