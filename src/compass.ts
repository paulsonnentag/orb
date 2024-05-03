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
import { input } from "./sound/audio";

// GLOBAL STATE

let soundSources: GeoSoundSource[] = [];

let collectedSoundSources: Record<string, GeoSoundSource> = {};

let inputs;

export type CapturedOscilator = {
  triangle: Triangle;
  soundSource: GeoSoundSource;
};

const capturedOscilators: CapturedOscilator[] = (window.$captured = []);

// SETUP CANVAS

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
let width: number;
let height: number;

type DeletedSound = {
  x: number;
  y: number;
  timestamp: number;
  radius: number;
};

const deletedSounds: DeletedSound[] = [];

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
for (let i = triangles.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * i);
  const temp = triangles[i];
  triangles[i] = triangles[j];
  triangles[j] = temp;
}

// pre capture some triangles
for (let i = 0; i < 3; i++) {
  capturedOscilators.push({
    triangle: triangles.pop(),
    soundSource: {
      fragmentType: {
        type: "oscillator",
        index: i,
        isFlicker: false,
      },
      geoPosition: {
        lat: 0,
        lng: 0,
      },
      distance: 0,
      angle: 0,
    },
  });
}

// RENDER

let RADIUS = 75;

const getDistortedDistance = (distance: number) => {
  return Math.max(Math.log2(distance / 4) * 35, 0);
};

const getRadius = (distance: number) => {
  return Math.max(5, (200 - distance / 2) / 10);
};

let blorpAtMs = -100000;
let distortAtMs = -100000;
let detuneAtMs = -100000;

function tick(t) {
  let repulsionForce = 200;
  let attractorForce = 200;
  let gravity = 4.5;
  let isDistortionActive = false;

  if (audioApi) {
    isDistortionActive = audioApi.state.distortion > 0.1;

    // change size of orb with amplitude
    repulsionForce =
      math.renormalized(audioApi.state.amplitude, 0, 1, 150, 200) +
      (isDistortionActive ? 900 : 0);

    // make gravity funky if distortion happens
    gravity = isDistortionActive
      ? math.renormalized(audioApi.state.distortion, 0, 1, 4, 5)
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

  soundSources.forEach((soundSource) => {
    const { angle, distance, geoPosition } = soundSource;

    // skip if we have already collected it
    const key = `${geoPosition.lat}:${geoPosition.lng}`;
    if (collectedSoundSources[key]) {
      return;
    }

    const distortedDistance = getDistortedDistance(distance);
    const x = Math.cos(angle) * (distortedDistance + RADIUS);
    const y = Math.sin(angle) * (distortedDistance + RADIUS);

    // sound sources are sorted by distance, so we gravitate towards
    // the first sound source that is visible on screen
    let isSourceOnScreen = Math.abs(x) < width / 2 && Math.abs(y) < height / 2;
    let isAbove = y < 0;
    if (
      isFirst &&
      isSourceOnScreen &&
      isAbove &&
      ((soundSource.fragmentType.type === "oscillator" &&
        triangles.length > 0) ||
        soundSource.fragmentType.type === "distortion" ||
        soundSource.fragmentType.type === "detune")
    ) {
      attractor = new Vec2d(x, y);
      isFirst = false;
    }

    let amplitude = 1;
    let radius;

    switch (soundSource.fragmentType.type) {
      case "distortion": {
        ctx.beginPath();

        const tWithOffset = t - soundSource.distance * 10;
        const sideLength = getRadius(distance);
        const rotation = (tWithOffset - soundSource.distance * 10) * 0.001; // rotation based on time

        ctx.moveTo(
          x + sideLength * Math.cos(rotation),
          y + sideLength * Math.sin(rotation)
        );
        ctx.lineTo(
          x + sideLength * Math.cos(rotation + (Math.PI * 2) / 3),
          y + sideLength * Math.sin(rotation + (Math.PI * 2) / 3)
        );
        ctx.lineTo(
          x + sideLength * Math.cos(rotation + (Math.PI * 4) / 3),
          y + sideLength * Math.sin(rotation + (Math.PI * 4) / 3)
        );
        ctx.closePath();

        ctx.fillStyle = `rgba(100, 100, 100, ${sideLength / 10})`;
        ctx.fill();
        break;
      }

      case "detune": {
        ctx.beginPath();

        const tWithOffset = t - soundSource.distance * 10;
        const sideLength = getRadius(distance);
        const rotation = (tWithOffset - soundSource.distance * 10) * 0.001; // rotation based on time

        ctx.moveTo(
          x + sideLength * Math.cos(rotation),
          y + sideLength * Math.sin(rotation)
        );
        ctx.lineTo(
          x + sideLength * Math.cos(rotation + Math.PI / 2),
          y + sideLength * Math.sin(rotation + Math.PI / 2)
        );
        ctx.lineTo(
          x + sideLength * Math.cos(rotation + Math.PI),
          y + sideLength * Math.sin(rotation + Math.PI)
        );
        ctx.lineTo(
          x + sideLength * Math.cos(rotation + (Math.PI * 3) / 2),
          y + sideLength * Math.sin(rotation + (Math.PI * 3) / 2)
        );
        ctx.closePath();

        ctx.fillStyle = `rgba(100, 100, 100, ${sideLength / 10})`;
        ctx.fill();
        break;
      }

      case "oscillator":
        if (audioApi) {
          const { oscillators } = audioApi.state;
          const oscillator = oscillators[soundSource.fragmentType.index];

          amplitude = math.renormalized(
            soundSource.fragmentType.isFlicker
              ? oscillator.flicker
              : oscillator.amplitude,
            0,
            1,
            0.5,
            1
          );
        }

        ctx.beginPath();
        radius = getRadius(distance) * amplitude;

        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = `rgba(100, 100, 100, ${radius / 10})`;
        ctx.fill();
    }

    // pick up logic
    // don't allow item to be be picked up if distortion is active
    if (!isDistortionActive) {
      const closestNode = getClosestNode(new Vec2d(x, y), nodes, 10);

      if (closestNode) {
        collectedSoundSources[key] = soundSource;

        switch (soundSource.fragmentType.type) {
          case "oscillator": {
            console.log("blurp");
            blorpAtMs = t;

            const triangle = triangles.pop();
            if (triangle) {
              deletedSounds.push({ x, y, radius, timestamp: t });
              capturedOscilators.push({
                triangle,
                soundSource,
              });
            }
            break;
          }

          case "distortion": {
            console.log("distort");
            distortAtMs = t;
            break;
          }

          case "detune": {
            console.log("detune");
            detuneAtMs = t;
            break;
          }
        }
      }
    }
  });

  if (audioApi) {
    inputs = {
      orientation: { x: 0, y: 0, z: 0 },
      oscillators: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((_, index) =>
        capturedOscilators.some(
          ({ soundSource }) =>
            soundSource.fragmentType.type === "oscillator" &&
            soundSource.fragmentType.index === index &&
            !soundSource.fragmentType.isFlicker
        )
          ? 1
          : 0
      ),
      flickers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((_, index) =>
        capturedOscilators.some(
          ({ soundSource }) =>
            soundSource.fragmentType.type === "oscillator" &&
            soundSource.fragmentType.index === index &&
            soundSource.fragmentType.isFlicker
        )
          ? 1
          : 0
      ),
      effects: {
        blorpAtMs,
        detuneAtMs,
        distortAtMs,
        doBass: 0,
        doMelody: 0,
        doPulse: 0,
      },
    };

    audioApi.tick(t, inputs);
  }

  // draw deleted sounds

  for (const deletedSound of deletedSounds) {
    deletedSound;

    ctx.beginPath();
    const radius = deletedSound.radius - (t - deletedSound.timestamp) / 10;

    if (radius > 0) {
      ctx.arc(deletedSound.x, deletedSound.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = `hsla(0, 0%, 39%, ${radius / 10})`;
      ctx.fill();
    }
  }

  for (const capturedOscilator of capturedOscilators) {
    const triangle = capturedOscilator.triangle;

    if (capturedOscilator.soundSource.fragmentType.type !== "oscillator") {
      continue;
    }

    let amplitude = 1;
    if (audioApi) {
      const { oscillators } = audioApi.state;
      const oscillator =
        oscillators[capturedOscilator.soundSource.fragmentType.index];

      amplitude = math.renormalized(
        capturedOscilator.soundSource.fragmentType.isFlicker
          ? oscillator.flicker
          : oscillator.amplitude,
        0,
        1,
        0.5,
        1
      );
    }

    let hue = 0;
    if (audioApi) {
      hue = audioApi.state.detune * 100;
    }

    ctx.beginPath();
    ctx.moveTo(triangle[0].position.x, triangle[0].position.y);
    ctx.lineTo(triangle[1].position.x, triangle[1].position.y);
    ctx.lineTo(triangle[2].position.x, triangle[2].position.y);
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue}, 100%, 62%, ${amplitude})`;
    ctx.fill();
  }

  links.forEach(({ from, to }) => {
    ctx.beginPath();
    ctx.moveTo(from.position.x, from.position.y);
    ctx.lineTo(to.position.x, to.position.y);
    ctx.stroke();
  });

  ctx.restore();

  // drawCircles(audioApi.state, t);

  applyForces(
    graph,
    attractor ? [attractor] : [],
    {
      repulsionForce,
      attractorForce,
      gravity,
    },
    capturedOscilators,
    audioApi.state
  );
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

geoPosition = {
  lat: 50.7753,
  lng: 6.0839,
};

setInterval(() => {
  // Assuming 1 degree of latitude is approximately 111,139 meters
  // 20 cm is 0.002 degrees
  geoPosition.lng -= 0.00002;
  updateSoundSources();
}, 100);

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

/*
function drawCircles(state: AudioState, ms: number) {
  state.oscillators.forEach((osc, i) => {
    const o = inputs.oscillators[i];
    const f = inputs.flickers[i];
    addCircle(
      `osc ${i} amp`,
      1,
      i,
      osc.amplitude,
      o,
      () => (inputs.oscillators[i] = o == 1 ? 0 : 1)
    );
    addCircle(
      `osc ${i} flicker`,
      2,
      i,
      osc.flicker,
      f,
      () => (inputs.flickers[i] = f == 1 ? 0 : 1)
    );
  });

  const fx = inputs.effects;
  addCircle("active", 0, 0, state.active, -1);
  addCircle("amplitude", 0, 1, state.amplitude, -1);
  addCircle("chord", 0, 2, state.chord, -1);
  addCircle("flicker", 0, 3, state.flicker, -1);
  addCircle("transposition", 0, 4, state.transposition, -1);

  addCircle(
    "chorus",
    0,
    6,
    state.chorus,
    state.chorus,
    () => (fx.blorpAtMs = ms)
  );
  addCircle(
    "detune",
    0,
    7,
    state.detune,
    state.detune,
    () => (fx.detuneAtMs = ms)
  );
  addCircle(
    "distortion",
    0,
    8,
    state.distortion,
    state.distortion,
    () => (fx.distortAtMs = ms)
  );
  addCircle(
    "bass",
    0,
    9,
    state.bass.amplitude,
    fx.doBass,
    () => (fx.doBass = fx.doBass == 0 ? 1 : 0)
  );
  addCircle(
    "melody",
    0,
    10,
    state.melody.amplitude,
    fx.doMelody,
    () => (fx.doMelody = fx.doMelody == 0 ? 1 : 0)
  );
  addCircle(
    "pulse",
    0,
    11,
    state.pulse,
    fx.doPulse,
    () => (fx.doPulse = fx.doPulse == 0 ? 1 : 0)
  );
}

function addCircle(
  name: string,
  x: number,
  y: number,
  size: number,
  color: number,
  cb?: Function
) {
  ctx.beginPath();
  ctx.fillStyle = "#0001";
  const cx = 25 + x * 150;
  const cy = 25 + y * 45;
  const r = 20;
  ctx.arc(cx, cy, r, 0, math.TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle =
    color < 0 ? "#fff" : color > 0.01 ? "lch(65% 132 178)" : "#333";
  ctx.arc(cx, cy, Math.max(0, r * size), 0, math.TAU);
  ctx.fill();
  ctx.fillText(name, 50 + x * 150, cy);
}
*/
