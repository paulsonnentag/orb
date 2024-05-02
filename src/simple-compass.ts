import rawGraph from "./graph.json";
import {
  Vec2d,
  Graph,
  Node,
  Link,
  findTriangles,
  Triangle,
  pointInTriangle,
} from "./lib/graph";
import { applyForces, PullForce } from "./lib/force-layout";
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

// GLOBAL STATE

let soundSources: GeoSoundSource[] = [];

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
  position: new Vec2d((x - 0.5) * width, (y - 0.5) * width),
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

console.log(triangles);

// RENDER

let mouse = new Vec2d(0, 0);

const canvasElement = document.getElementById("canvas");
if (canvasElement) {
  canvasElement.addEventListener("mousemove", (event) => {
    mouse = new Vec2d(
      event.clientX - window.innerWidth / 2,
      event.clientY - window.innerHeight / 2
    );
  });
} else {
  console.error("Element with id 'canvas' not found");
}

let RADIUS = 150; // todo: scale this to the size of the orb

const getDistortedDistance = (distance: number) => {
  return Math.max(Math.log2(distance / 4) * 50, 0);
};

const getRadius = (distance: number) => {
  return Math.max(5, (200 - distance / 2) / 10);
};

function tick(t) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.translate(width / 2, height / 2);

  let attractor: Vec2d;

  soundSources.forEach(({ angle, distance }, index) => {
    const distortedDistance = getDistortedDistance(distance);

    const x = Math.cos(angle) * (distortedDistance + RADIUS);
    const y = Math.sin(angle) * (distortedDistance + RADIUS);

    if (index === 0) {
      attractor = new Vec2d(x, y);
    }

    ctx.beginPath();
    const radius = getRadius(distance);

    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = "red";
    ctx.fill();
  });

  if (audioApi) {
    audioApi.tick(
      t,
      orientation,
      []
      /* soundSourcesInDome.map((source) => ({
        lat: source.geoPosition.lat,
        lon: source.geoPosition.lng,
        collected: false,
        type: 1,
      })) */
    );
  }

  /* for (const triangle of trianglesWithSound) {
    ctx.beginPath();
    ctx.moveTo(triangle[0].position.x, triangle[0].position.y);
    ctx.lineTo(triangle[1].position.x, triangle[1].position.y);
    ctx.lineTo(triangle[2].position.x, triangle[2].position.y);
    ctx.closePath();
    ctx.fillStyle = "red";
    ctx.fill();
  } */

  links.forEach(({ from, to }) => {
    ctx.beginPath();
    ctx.moveTo(from.position.x, from.position.y);
    ctx.lineTo(to.position.x, to.position.y);
    ctx.stroke();
  });

  ctx.restore();

  applyForces(graph, [attractor]);
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

  console.log(soundSources);
};

updateSoundSources();

/*
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
);*/

// start without permissions
document.getElementById("intro").remove();
requestAnimationFrame(tick);

setInterval(() => {
  geoPosition.lng -= 0.00001;
  updateSoundSources();
}, 100);
