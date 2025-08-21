import "https://cesium.com/downloads/cesiumjs/releases/1.130/Build/Cesium/Cesium.js";

const predefinedColors = [
  Cesium.Color.RED,
  Cesium.Color.BLUE,
  Cesium.Color.YELLOW,
  Cesium.Color.MAGENTA,
  Cesium.Color.CYAN,
  Cesium.Color.ORANGE,
  Cesium.Color.PURPLE,
  Cesium.Color.BROWN,
  Cesium.Color.GREEN,
  Cesium.Color.LIME
];

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzMzdhMjIxMS02MDdmLTRhNTMtYmRmZC1jMGU4NmFiZjdiNGQiLCJpZCI6MjIwMzI5LCJpYXQiOjE3NDkzMDEyNjh9.v-fHsJR4ncvFK-ETUid10vofS9OnLAxm0uAC_yj4wmk';

// const terrain = Cesium.Terrain.fromWorldTerrain();

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.


const terrainProvider = await Cesium.createWorldTerrainAsync();
// viewer.terrainProvider = terrainProvider;

var viewer = new Cesium.Viewer('cesiumContainer', {
  // terrain: terrain,
  timeline: false,
  terrainProvider: terrainProvider
  // terrainProvider: await Cesium.CesiumTerrainProvider.fromUrl('https://assets.agi.com/stk-terrain/tilesets/world/tiles/1/0/0.terrain')
  //requestRenderMode: false
});

// Wait until terrain is ready
// terrain.readyPromise.then(() => {
//   console.log("Terrain is ready, safe to sample terrain now");
// });

var fileEntities = {}; // fileName → point primitive collection

const sdPointSize = 2;
const pointSize = 8;
const sdColor = Cesium.Color.LIGHTGREY;

const fileParam = new URLSearchParams(window.location.search).get("file");

// console.log(toDecimalDegrees(5));

if (!fileParam) {
  alert("No dataset selected.");
  throw new Error("Missing file parameter.");
}

if (fileParam === "ALL") {
  fetch("files.json")
    .then(res => res.json())
    .then(fileList => loadAllFiles(fileList));
} else {
  loadSingleFile(fileParam);
}

async function loadSingleFile(fileName) {

  fileName = fileName.replace('.csv', '');
  const sdFileName = `${fileName} SD`;

  const url = `data/${fileName}.csv`;
  const sdUrl = `data/${sdFileName}.csv`;

  const response = await fetch(url);
  const text = await response.text();

  // If the user just wants to see ground truth data then show only that
  if (url.includes("SD")) {
    const points = parseSdCSV(text);
    const entities = await plotPoints(points, Cesium.Color.YELLOW, pointSize);
    fileEntities[fileName] = entities;
    updateLegend(fileName, Cesium.Color.YELLOW);
    return;
  }

  if (url.includes("lora")) {
    const points = parseLoraCSV(text);
    const entities = await plotPoints(points, Cesium.Color.RED, pointSize);
    fileEntities[fileName] = entities;
    updateLegend(fileName, Cesium.Color.RED);
  } else {
    const points = parseCSV(text);
    const entities = await plotPoints(points, Cesium.Color.BLUE, pointSize);
    fileEntities[fileName] = entities;
    updateLegend(fileName, Cesium.Color.BLUE);
  }

  // If we have it, include the ground truth
  const sdResponse = await fetch(sdUrl);
  if (sdResponse.ok) {
    const sdText = await sdResponse.text();
    const sdPoints = parseSdCSV(sdText);
    const entities = await plotPoints(sdPoints, sdColor, sdPointSize);
    fileEntities[sdFileName] = entities;
    updateLegend(sdFileName, sdColor);
  }
}

async function loadAllFiles(fileList) {

  var colourIndex = 0;

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const trimFile = file.replace('.csv', '');
    // Use predefined color based on index (wrap around if too many files)
    const response = await fetch(`data/${file}`);
    const text = await response.text();

    // Special plot for ground truth
    if (file.includes("SD")) {
      const points = parseSdCSV(text);
      const entities = await plotPoints(points, sdColor, sdPointSize);
      fileEntities[trimFile] = entities;
      updateLegend(trimFile, sdColor);
    } else {
      const color = predefinedColors[colourIndex % predefinedColors.length];
      colourIndex++;
      const points = file.includes("lora") ? parseLoraCSV(text) : parseCSV(text);
      const entities = await plotPoints(points, color, pointSize);
      fileEntities[trimFile] = entities;
      updateLegend(trimFile, color);
    }
  }
}

function updateLegend(fileName, color) {
  const legend = document.getElementById("legend");

  const item = document.createElement("div");
  item.className = "item";

  const colorBox = document.createElement("div");
  colorBox.className = "color-box";
  colorBox.style.backgroundColor = Cesium.Color.fromAlpha(color, 1.0).toCssColorString();

  const label = document.createElement("span");
  label.textContent = fileName;

  item.appendChild(colorBox);
  item.appendChild(label);
  legend.appendChild(item);

  // Enable toggling of visibility
  item.addEventListener("click", () => {
    const pointCollection = fileEntities[fileName];
    if (!pointCollection) {
      console.warn("No point collection found for", fileName);
      return;
    }

    pointCollection.show = !pointCollection.show;

    if (pointCollection.show) {
      item.classList.remove("inactive");
    } else {
      item.classList.add("inactive");
    }
  });
}

// Try to prevent memory leaks
window.addEventListener('beforeunload', function () {
  if (viewer && viewer.destroy) {
    viewer.destroy(); // releases WebGL context and DOM elements
  }
});

// Make legend draggable
(function makeLegendDraggable() {
  const legend = document.getElementById("legend");
  let offsetX = 0, offsetY = 0, isDragging = false;

  legend.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - legend.offsetLeft;
    offsetY = e.clientY - legend.offsetTop;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    legend.style.left = `${e.clientX - offsetX}px`;
    legend.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
})();



// viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
//         url: Cesium.IonResource.fromAssetId(1679342),
//         requestVertexNormals: true
// });

function parseCSV(text) {
  const lines = text.trim().split("\n");

  // I'm being lazy now, this is to get the 4G data rather than having checks in the file names everywhere
  if (lines[0].split(",").length == 5) {
    const latIdx = 1;
    const lonIdx = 2;
    const altIdx = 3;

    return lines.map(line => {
      const cols = line.split(",");
      return {
        lat: parseFloat(cols[latIdx]),
        lon: parseFloat(cols[lonIdx]),
        alt: parseFloat(cols[altIdx]),
        rssi: 70
      };
    });
  } else {

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
}

function parseLoraCSV(text) {
  const lines = text.trim().split("\n");

  const latIdx = 1;
  const lonIdx = 2;
  const altIdx = 3;

  return lines.map(line => {
    const cols = line.split(",");
    return {
      lat: parseFloat(cols[latIdx]),
      lon: parseFloat(cols[lonIdx]),
      alt: parseFloat(cols[altIdx]),
      rssi: 70
    };
  });
}

function parseSdCSV(text) {
  const lines = text.trim().split("\n");

  const latIdx = 2;
  const lonIdx = 3;
  const altIdx = 4;

  return lines.map(line => {
    const cols = line.split(",");
    return {
      lat: toDecimalDegrees(parseFloat(cols[latIdx])),
      lon: toDecimalDegrees(parseFloat(cols[lonIdx])),
      alt: parseFloat(cols[altIdx]),
      rssi: 70
    };
  });
}

function toDecimalDegrees(value) {
  // Converting from DDMM.MMMM format to decimal degrees
  // First part gets the DD value by dividing by 100 and then truncating
  // Second part gets the remainder and divides by 60 for conversion
  return ((value / 100.0) | 0) + (value % 100.0 / 60.0);
}

async function plotPoints(points, color, size) {

  // let entities = [];

  // Remove zero positions
  points = points.filter(p => (p.lon != 0));
  points = points.filter(p => (p.lon != toDecimalDegrees(-1.0)));

  if (points.length) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(points[0].lon, points[0].lat, 500000),
    });
  }

  var pointCollection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());


  // Convert to Cartographic (ignoring original height for sampling terrain)
  const cartographics = points.map(p => Cesium.Cartographic.fromDegrees(p.lon, p.lat));

  const batchSize = 500;


  for (let start = 0; start < cartographics.length; start += batchSize) {
    const batch = cartographics.slice(start, start + batchSize);
    const pointsBatch = points.slice(start, start + batchSize); // corresponding points

    if (batch.length === 0) continue; // skip empty batches

    const adjusted = await Cesium.sampleTerrainMostDetailed(terrainProvider, batch);


    // Sanity check
    if (!adjusted || adjusted.length !== batch.length) {
      console.error("Adjusted batch invalid:", adjusted);
      continue;
    }

    adjusted.forEach((sample, index) => {
      const p = pointsBatch[index]; // correct point for this batch
      if (!p || !sample) return; // skip invalid entries

      const rssiMin = 70;
      const rssiMax = 115;
      const scale = 1 - ((p.rssi - rssiMin) / (rssiMax - rssiMin));


      pointCollection.add({
        position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, Math.max(p.alt, sample.height + 1.0)),
        // position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, sample.height + 1.0),
        pixelSize: size,
        color: new Cesium.Color(color.red * scale, color.green * scale, color.blue * scale, 1)
      });
    });
  }

  return pointCollection;
}
