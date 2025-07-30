import "https://cesium.com/downloads/cesiumjs/releases/1.130/Build/Cesium/Cesium.js";

const urlParams = new URLSearchParams(window.location.search);
const file = urlParams.get("file");

if (!file) {
  alert("No dataset selected.");
  throw new Error("Missing file parameter.");
}

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzMzdhMjIxMS02MDdmLTRhNTMtYmRmZC1jMGU4NmFiZjdiNGQiLCJpZCI6MjIwMzI5LCJpYXQiOjE3NDkzMDEyNjh9.v-fHsJR4ncvFK-ETUid10vofS9OnLAxm0uAC_yj4wmk';

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
        const viewer = new Cesium.Viewer('cesiumContainer', {
            terrain: Cesium.Terrain.fromWorldTerrain(),
            timeline: false
            //requestRenderMode: false
        });

async function loadCSVData(url) {
  const response = await fetch(url);
  const text = await response.text();

  if(url.includes("lora")){
  const points = parseLoraCSV(text);
  plotPoints(points);
  } else {
const points = parseCSV(text);
  plotPoints(points);
  }
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
//   const headers = lines[0].split(",");
//   const latIdx = headers.indexOf("latitude");
//   const lonIdx = headers.indexOf("longitude");
//   const altIdx = headers.indexOf("altitude");

const rssiIdx = 0;
    const latIdx = 9;
  const lonIdx = 10;
  const altIdx = 11;

  return lines.map(line => {
    const cols = line.split(",");
    return {
      lat: parseFloat(cols[latIdx]),
      lon: parseFloat(cols[lonIdx]),
      alt: parseFloat(cols[altIdx]),
      rssi: -1.0 * parseFloat(cols[rssiIdx])
    };
  });
}

function parseLoraCSV(text) {
  const lines = text.trim().split("\n");
//   const headers = lines[0].split(",");
//   const latIdx = headers.indexOf("latitude");
//   const lonIdx = headers.indexOf("longitude");
//   const altIdx = headers.indexOf("altitude");

    const latIdx = 1;
  const lonIdx = 2;
  const altIdx = 3;

  return lines.map(line => {
    const cols = line.split(",");
    return {
      lat: parseFloat(cols[latIdx]),
      lon: parseFloat(cols[lonIdx]),
      alt: parseFloat(cols[altIdx]),
      rssi: 70 // We don't really have this data right now? It could be in the lora json data somewhere to be fair..
    };
  });
}

async function plotPoints(points) {

// Remove zero positions
points = points.filter(p => p.lon != 0);

// const positions = points.map(p => ({
//     longitude: p.lon,
//     latitude: p.lat
//   }));

//   // Wait for the terrain provider to be ready
//   await terrainProvider.readyPromise;

//   // Sample terrain height at all positions
//   // const updatedHeights = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);

//   const updatedHeights = await Cesium.sampleTerrain(terrainProvider, 12, positions);

  for (let i = 0; i < points.length; i++) {
    // const terrainHeight = updatedHeights[i].height || 0;
    const point = points[i];

    if(point.lon === 0){
      continue;
    }

    // Use CSV altitude if it's above terrain, else snap to terrain
    // const altitude = point.alt >= terrainHeight ? point.alt : terrainHeight;

  const rssiMin = 70;
  const rssiMax = 115;

    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, point.alt),
      point: {
        pixelSize: 8,
        color: new Cesium.Color(1 - ((point.rssi - rssiMin) / (rssiMax - rssiMin)), 0, 0, 1),
        // heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      }
    });
  }

  if (points.length) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(points[0].lon, points[0].lat, 500000),
    });
  }
}

loadCSVData(`data/${file}`);
