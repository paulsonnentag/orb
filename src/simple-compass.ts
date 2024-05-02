import rawGraph from "./graph.json";
import {
  Vec2d,
  Graph,
  Node,
  Link,
  findTriangles,
  Triangle,
  pointInTriangle,
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

let RADIUS = 120;

const getDistortedDistance = (distance: number) => {
  return Math.max(Math.log2(distance / 4) * 40, 0);
};

const getRadius = (distance: number) => {
  return Math.max(5, (150 - distance / 2) / 10);
};

function tick(t) {
  let repulsionForce = 200;
  let attractorForce = 200;
  let gravity = 0.2;
  let isDistortionActive = false;

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
    if (isFirst && isSourceOnScreen) {
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
      const closestNode = getClosestNode(new Vec2d(x, y), nodes, radius);

      if (closestNode) {
        collectedSoundSources[key] = soundSource;

        const triangle = triangles.pop();
        if (triangle) {
          filledTriangles.push(triangle);
        }
      }
    }
  });

  if (audioApi) {
    audioApi.tick(
      t,
      orientation,
      soundSources.slice(0, 5).map((source) => {
        const key = `${source.geoPosition.lat}:${source.geoPosition.lng}`;
        return {
          lat: source.geoPosition.lat,
          lon: source.geoPosition.lng,
          collected: !!collectedSoundSources[key],
          type: 1,
        };
      })
    );
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

let geoPosition: GeoPosition = {
  lat: 50.7753,
  lng: 6.0839,
};

const updateSoundSources = () => {
  soundSources = getSurroundingSoundSources(geoPosition, angle);
};

updateSoundSources();

document.body.addEventListener(
  "click",
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
    });

    audioApi = initAudioApi();
    requestAnimationFrame(tick);
  },
  { once: true }
);

/*setInterval(() => {
  // Assuming 1 degree of latitude is approximately 111,139 meters
  // 20 cm is 0.002 degrees
  geoPosition.lng -= 0.00002;
  updateSoundSources();
}, 100);*/
