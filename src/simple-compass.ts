import rawGraph from "./graph.json";
import { Vec2d, Graph, Node, Link } from "./lib/graph";
import { applyForces } from "./lib/force-layout";
import { addDeviceOrientationListener } from "./lib/brower";
import {
  GeoPosition,
  getSurroundingSoundSources,
  GeoSoundSource,
} from "./lib/sound-source";

// Globals

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

// RENDER

function render() {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#fff";
  ctx.translate(width / 2, height / 2);

  soundSources.forEach((source) => {
    ctx.beginPath();
    ctx.arc(
      source.screenPosition.x * 7,
      source.screenPosition.y * 7,
      10,
      0,
      2 * Math.PI,
      false
    );
    ctx.fillStyle = "red";
    ctx.fill();
  });

  links.forEach(({ from, to }) => {
    ctx.beginPath();
    ctx.moveTo(from.position.x, from.position.y);
    ctx.lineTo(to.position.x, to.position.y);
    ctx.stroke();
  });

  ctx.restore();

  applyForces(graph);
  requestAnimationFrame(render);
}

render();

// EVENTS

let angle: number = 0;
let geoPosition: GeoPosition = {
  lat: 50.7753,
  lng: 6.0839,
};

const updateSoundSources = () => {
  console.log("angle", angle);
  soundSources = getSurroundingSoundSources(geoPosition, angle);
};

updateSoundSources();

document.body.addEventListener(
  "click",
  () => {
    addDeviceOrientationListener((event) => {
      angle = event.alpha;
      updateSoundSources();
    });
  },
  { once: true }
);
