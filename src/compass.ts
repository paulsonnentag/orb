import rawGraph from "./graph.json";
import {
  Vec2d,
  Graph,
  Node,
  Link,
  findTriangles,
  Triangle,
  getClosestNode,
} from "./lib/graph";
import { applyForces } from "./lib/force-layout";
import {
  addDeviceOrientationListener,
  addGeoPositionWatcher,
} from "./lib/browser";
import {
  GeoPosition,
  getSurroundingSoundSources,
  GeoSoundSource,
} from "./lib/sound-source";
import { AudioAPI, main as initAudioApi } from "./sound/app";
import * as math from "./sound/math";

// GLOBAL STATE

let soundSources: GeoSoundSource[] = [];

let collectedSoundSources: Record<string, GeoSoundSource> = {};

let filledTriangles: Triangle[] = [];

// SETUP CANVAS

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
let width: number;
let height: number;

function resize() {
  const dpi = window.devicePixelRatio;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = dpi * width;
  canvas.height = dpi * height;
  ctx.resetTransform();
  ctx.scale(dpi, dpi);
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}
window.addEventListener("resize", resize);
resize();

// SETUP GRAPH

const nodes: Node[] = rawGraph.nodes.map(({ x, y, id }) => ({
  id,
  position: new Vec2d((x - 0.5) * 200, (y - 0.5) * 200),
  force: new Vec2d(0, 0),
}));

const nodesById: Record<number, Node> = {};
nodes.forEach((node) => {
  nodesById[node.id] = node;
});

const links: Link[] = rawGraph.links.map(({ from, to }) => ({
  from: nodesById[from],
  to: nodesById[to],
}));

const graph: Graph = {
  nodes,
  links,
};

const triangles = findTriangles(graph);

// RENDER

let RADIUS = 75;

const getDistortedDistance = (distance: number) => {
  return Math.max(Math.log2(distance / 4) * 35, 0);
};

const getRadius = (distance: number) => {
  return Math.max(5, (200 - distance / 2) / 10);
};

function tick(t) {
  let repulsionForce = 200;
  let attractorForce = 200;
  let gravity = 0.2;
  let isDistortionActive = false;
  let blorpAtMs = -100000;

  if (audioApi) {
    isDistortionActive = audioApi.state.distortion > 0.1;

    // change size of orb with amplitude
    repulsionForce =
      math.renormalized(audioApi.state.amplitude, 0, 1, 150, 200) +
      (isDistortionActive ? 150 : 0);

    // make gravity funky if distortion happens
    gravity = isDistortionActive
      ? math.renormalized(audioApi.state.distortion, 0, 1, 0.4, 0.5)
      : 0.2;
  }

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.translate(width / 2, height / 2);

  let attractor: Vec2d;

  let isFirst = true;

  //updatePreviewMap();

  soundSources.forEach((soundSource, index) => {
    let oscilatorAmplitude = 1;

    if (audioApi) {
      const { oscillators } = audioApi.state;
      oscilatorAmplitude = math.renormalized(
        oscillators[index % oscillators.length].amplitude,
        0,
        1,
        0.5,
        1
      );
    }

    const { angle, distance, geoPosition } = soundSource;
    // skip if we have already collected it
    const key = `${geoPosition.lat}:${geoPosition.lng}`;
    if (collectedSoundSources[key]) {
      return;
    }

    const distortedDistance = getDistortedDistance(distance);

    const x = Math.cos(angle) * (distortedDistance + RADIUS);
    const y = Math.sin(angle) * (distortedDistance + RADIUS);

    let isSourceOnScreen = Math.abs(x) < width / 2 && Math.abs(y) < height / 2;
    let isAbove = y < 0;
    if (isFirst && isSourceOnScreen && isAbove) {
      attractor = new Vec2d(x, y);
      isFirst = false;
    }

    ctx.beginPath();
    const radius = getRadius(distance);

    ctx.arc(x, y, radius * oscilatorAmplitude, 0, 2 * Math.PI, false);
    ctx.fillStyle = `rgba(255, 65, 54, ${radius / 10})`;
    ctx.fill();
    // don't allow to pick up nodes when distortion is active
    if (!isDistortionActive) {
      const closestNode = getClosestNode(new Vec2d(x, y), nodes, radius + 10);

      if (closestNode) {
        const distance = Math.sqrt(
          (closestNode.position.x - x) ** 2 + (closestNode.position.y - y) ** 2
        );
        console.log("collect", closestNode, distance);

        collectedSoundSources[key] = soundSource;

        blorpAtMs = t;

        const triangle = triangles.pop();
        if (triangle) {
          filledTriangles.push(triangle);
        }
      }
    }
  });

  if (audioApi) {
    audioApi.tick(t, {
      orientation: { x: 0, y: 0, z: 0 },
      oscillators: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      flickers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      effects: {
        blorpAtMs,
        detuneAtMs: -100000,
        distortAtMs: -100000,
        doBass: 0,
        doMelody: 0,
        doPulse: 0,
      },
    });
  }

  for (const triangle of filledTriangles) {
    ctx.beginPath();
    ctx.moveTo(triangle[0].position.x, triangle[0].position.y);
    ctx.lineTo(triangle[1].position.x, triangle[1].position.y);
    ctx.lineTo(triangle[2].position.x, triangle[2].position.y);
    ctx.closePath();
    ctx.fillStyle = "#FF4136";
    ctx.fill();
  }

  links.forEach(({ from, to }) => {
    ctx.beginPath();
    ctx.moveTo(from.position.x, from.position.y);
    ctx.lineTo(to.position.x, to.position.y);
    ctx.stroke();
  });

  ctx.restore();
  applyForces(graph, attractor ? [attractor] : [], {
    repulsionForce,
    attractorForce,
    gravity,
  });
  requestAnimationFrame(tick);
}

// EVENTS

let audioApi: AudioAPI;
let angle: number = 0;
let orientation = {
  x: 0,
  y: 0,
  z: 0,
};

let geoPosition: GeoPosition;

let intialLoad = true;

const MIN_INITIAL_DISTANCE = 40;

const updateSoundSources = () => {
  soundSources = getSurroundingSoundSources(geoPosition, angle);

  if (intialLoad && soundSources.length > 0) {
    intialLoad = false;

    // remove sounds that are very close to the current position so they would be immediately captured
    soundSources.forEach((soundSource) => {
      if (soundSource.distance < MIN_INITIAL_DISTANCE) {
        const key = `${soundSource.geoPosition.lat}:${soundSource.geoPosition.lng}`;
        collectedSoundSources[key] = soundSource;
      }
    });
  }

  console.log("soundsources", soundSources);
};

document.body.addEventListener(
  "pointerup",
  () => {
    document.getElementById("intro").remove();

    addDeviceOrientationListener((event) => {
      orientation.x = event.gamma; // gamma: left to right
      orientation.y = event.beta; // beta: front back motion
      orientation.z = event.alpha; // alpha: rotation around z-axis

      angle = -event.alpha;
      updateSoundSources();
    });

    addGeoPositionWatcher((newGeoPosition) => {
      geoPosition = {
        lat: newGeoPosition.coords.latitude,
        lng: newGeoPosition.coords.longitude,
      };
      updateSoundSources();
    });

    audioApi = initAudioApi();
    requestAnimationFrame(tick);
  },
  { once: true }
);

/*
geoPosition = {
  lat: 50.7753,
  lng: 6.0839,
};
*/

/*
setInterval(() => {
  // Assuming 1 degree of latitude is approximately 111,139 meters
  // 20 cm is 0.002 degrees
  geoPosition.lng -= 0.000002;
  updateSoundSources();
}, 100);
*/

/*
import L from "leaflet";

const container = document.createElement("div");

container.style.position = "absolute";
container.id = "preview";
container.style.bottom = "0px";
container.style.right = "0px";
container.style.width = "500px";
container.style.height = "500px";

document.body.append(container);

// Create a map in the bottom right corner
var previewMap = L.map("preview", {
  position: "absolute",
  bottom: "0",
  right: "0",
}).setView([geoPosition.lat, geoPosition.lng], 20);

// Add OpenStreetMap tile layer to the map
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(previewMap);

// Create an array to store the markers
var soundSourceMarkers = [];

// Function to update the preview map and markers
function updatePreviewMap() {
  // Clear existing markers
  for (var i = 0; i < soundSourceMarkers.length; i++) {
    previewMap.removeLayer(soundSourceMarkers[i]);
  }
  soundSourceMarkers = [];

  // Update the center of the map
  previewMap.setView([geoPosition.lat, geoPosition.lng], 20);

  // Add new markers for each sound source
  for (var i = 0; i < soundSources.length; i++) {
    var marker = L.marker([
      soundSources[i].geoPosition.lat,
      soundSources[i].geoPosition.lng,
    ]).addTo(previewMap);
    soundSourceMarkers.push(marker);
  }
}*/
