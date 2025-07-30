import "https://cesium.com/downloads/cesiumjs/releases/1.130/Build/Cesium/Cesium.js";

const predefinedColors = [
  Cesium.Color.RED,
  Cesium.Color.BLUE,
  Cesium.Color.YELLOW,
  Cesium.Color.ORANGE,
  Cesium.Color.CYAN,
  Cesium.Color.MAGENTA,
  Cesium.Color.PURPLE,
  Cesium.Color.BROWN,
  Cesium.Color.GREEN,
  Cesium.Color.LIME
];

var fileEntities = {}; // fileName → array of entities

const fileParam = new URLSearchParams(window.location.search).get("file");

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
  loadCSVData(`data/${fileName}`);
}

async function loadAllFiles(fileList) {

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    // Use predefined color based on index (wrap around if too many files)
    const color = predefinedColors[i % predefinedColors.length];
    const response = await fetch(`data/${file}`);
    const text = await response.text();

    const points = file.includes("lora") ? parseLoraCSV(text) : parseCSV(text);
    const entities = plotPoints(points, color);
    fileEntities[file] = entities;
    console.log("Stored entities for", file, fileEntities[file]);
    updateLegend(file, color);
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

  let isVisible = true;

  // Enable toggling of visibility
  item.addEventListener("click", () => {
    const entities = fileEntities[fileName];
    if (!entities) {
      console.warn("No entities found for", fileName);
      return;
    }

    console.log(entities);

    isVisible = !isVisible;

    entities.forEach((e) => {if(e) (e.show = isVisible)});

    if (isVisible) {
      item.classList.remove("inactive");
    } else {
      item.classList.add("inactive");
    }
  });
}

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

  if (url.includes("lora")) {
    const points = parseLoraCSV(text);
    plotPoints(points, Cesium.Color.RED);
  } else {
    const points = parseCSV(text);
    plotPoints(points, Cesium.Color.BLUE);
  }
}

function parseCSV(text) {
  const lines = text.trim().split("\n");

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

function plotPoints(points, color) {

  let entities = [];

  // Remove zero positions
  points = points.filter(p => p.lon != 0);

  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    const rssiMin = 70;
    const rssiMax = 115;
    const scale = 1 - ((point.rssi - rssiMin) / (rssiMax - rssiMin));

    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, point.alt),
      point: {
        pixelSize: 8,
        color: new Cesium.Color(color.red * scale, color.green * scale, color.blue * scale, 1)
        // heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      }
    });

    entities.push(entity);
  }

  if (points.length) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(points[0].lon, points[0].lat, 500000),
    });
  }

  return entities;
}