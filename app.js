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
  const points = parseCSV(text);
  plotPoints(points);
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
//   const headers = lines[0].split(",");
//   const latIdx = headers.indexOf("latitude");
//   const lonIdx = headers.indexOf("longitude");
//   const altIdx = headers.indexOf("altitude");

    const latIdx = 9;
  const lonIdx = 10;
  const altIdx = 11;

  return lines.map(line => {
    const cols = line.split(",");
    return {
      lat: parseFloat(cols[latIdx]),
      lon: parseFloat(cols[lonIdx]),
      alt: parseFloat(cols[altIdx])
    };
  });
}

function plotPoints(points) {
  for (const point of points) {
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, point.alt),
      point: {
        pixelSize: 8,
        color: Cesium.Color.RED,
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
