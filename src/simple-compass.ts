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
} from "./lib/brower";
import {
  GeoPosition,
  getSurroundingSoundSources,
  GeoSoundSource,
} from "./lib/sound-source";

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

function render() {
  let trianglesWithSound: Triangle[] = [];
  let soundSourcesInDome: GeoSoundSource[] = [];
  let forces: PullForce[] = [];

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.translate(width / 2, height / 2);

  soundSources.forEach((source) => {
    const triangle = triangles.find((triangle) =>
      pointInTriangle(source.screenPosition, triangle)
    );

    let closestNode = null;
    if (triangle) {
      trianglesWithSound.push(triangle);
      soundSourcesInDome.push(source);
    } else {
      let minDistance = 20;
      nodes.forEach((node) => {
        const distance = Math.sqrt(
          (source.screenPosition.x - node.position.x) ** 2 +
            (source.screenPosition.y - node.position.y) ** 2
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestNode = node;
        }
      });

      if (closestNode) {
        forces.push({
          node: closestNode,
          destination: source.screenPosition,
        });
      }
      ctx.beginPath();
      const radius = Math.max(0, 20 - Math.sqrt(source.distance));
      ctx.arc(
        source.screenPosition.x,
        source.screenPosition.y,
        radius,
        0,
        2 * Math.PI,
        false
      );
      ctx.fillStyle = closestNode ? "blue" : `rgba(255, 0, 0, ${radius / 20})`;
      ctx.fill();
    }
  });

  for (const triangle of trianglesWithSound) {
    ctx.beginPath();
    ctx.moveTo(triangle[0].position.x, triangle[0].position.y);
    ctx.lineTo(triangle[1].position.x, triangle[1].position.y);
    ctx.lineTo(triangle[2].position.x, triangle[2].position.y);
    ctx.closePath();
    ctx.fillStyle = "red";
    ctx.fill();
  }

  links.forEach(({ from, to }) => {
    ctx.beginPath();
    ctx.moveTo(from.position.x, from.position.y);
    ctx.lineTo(to.position.x, to.position.y);
    ctx.stroke();
  });

  ctx.restore();

  applyForces(graph, forces);
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
      angle = -event.alpha;
      updateSoundSources();
    });

    addGeoPositionWatcher((newGeoPosition) => {
      geoPosition = {
        lat: newGeoPosition.coords.latitude,
        lng: newGeoPosition.coords.longitude,
      };
    });
  },
  { once: true }
);
