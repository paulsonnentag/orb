import * as d3 from "d3";

import graph from "./graph.json";
import {
  findTriangles,
  pointInTriangle,
  getClosestTriangle,
  getOuterNodes,
  getCentroid,
} from "./utils";

const { nodes, links } = graph;
const nodesById = {};
nodes.forEach((node) => {
  nodesById[node.id] = node;
});

const triangles = findTriangles(graph);

// Specify the dimensions of the chart.
const width = window.innerWidth;
const height = window.innerHeight;

// The force simulation mutates links and nodes, so create a copy
// so that re-evaluating this cell produces the same result.

// Create a simulation with several forces.
const simulation = d3
  .forceSimulation(nodes)
  .force(
    "link",
    d3
      .forceLink(links)
      .id((d) => d.id)
      .distance((d, index) => {
        return 30;
      })
      .strength(0.1)
  )
  .force("charge", d3.forceManyBody().strength(-100))
  .force("x", d3.forceX())
  .force("y", d3.forceY())
  .force("pushAway", (alpha) => {
    if (!focusPoint) {
      return;
    }

    const k = alpha * Math.sin(Date.now() / 500) * 3; // Strength of the force, adjust as needed
    for (let i = 0, n = nodes.length; i < n; ++i) {
      let node = nodes[i];

      // Check if the current node is in the specified set
      if (closeNodes.has(node.id)) {
        // Calculate the displacement from the node to the point
        const dx = node.x - focusPoint.x;
        const dy = node.y - focusPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize the displacement vector and apply the force
        if (distance > 0) {
          // To avoid division by zero
          const force = k / distance; // Calculate force magnitude
          node.vx += dx * force; // Apply force in the x direction
          node.vy += dy * force; // Apply force in the y direction
        }
      }
    }
  });

// Create the SVG container.
const svg = d3
  .create("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [-width / 2, -height / 2, width, height])
  .attr("style", "max-width: 100%; height: auto;");

const triangle = svg
  .append("g")
  .selectAll("polygon")
  .data(triangles)
  .join("polygon")
  .attr("points", (nodeIds) =>
    nodeIds
      .map((id) => {
        const node = nodesById[id];
        return `${node.x},${node.y}`;
      })
      .join(" ")
  )
  .attr("opacity", 0.5);

const link = svg
  .append("g")
  .attr("stroke", "#fff")
  .attr("stroke-width", 2)
  .attr("stroke-opacity", 0.6)
  .selectAll("line")
  .data(links)
  .join("line")
  .attr("stroke-width", (d) => Math.sqrt(d.value));

const node = svg
  .append("g")
  //  .attr("stroke", "#fff")
  //  .attr("stroke-width", 1.5)
  .selectAll("circle")
  .data(nodes)
  .join("circle")
  .attr("r", 5)
  .attr("fill", "transparent");

// Add a drag behavior.
node.call(
  d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended)
);

// Set the position attributes of links and nodes each time the simulation ticks.
simulation.on("tick", () => {
  link
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);

  node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

  triangle.attr("points", (nodeIds) =>
    nodeIds
      .map((id) => {
        const node = nodesById[id];
        return `${node.x},${node.y}`;
      })
      .join(" ")
  );
});

// Reheat the simulation when drag starts, and fix the subject position.
function dragstarted(event) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  event.subject.fx = event.subject.x;
  event.subject.fy = event.subject.y;
}

// Update the subject (dragged node) position during drag.
function dragged(event) {
  event.subject.fx = event.x;
  event.subject.fy = event.y;
}

// Restore the target alpha so the simulation cools after dragging ends.
// Unfix the subject position now that it’s no longer being dragged.
function dragended(event) {
  if (!event.active) simulation.alphaTarget(0);
  event.subject.fx = null;
  event.subject.fy = null;
}

document.body.append(svg.node());

let closeNodes = new Set();
let focusPoint;

document.addEventListener("mousemove", (event) => {
  const x = event.clientX - document.body.clientWidth / 2;
  const y = event.clientY - document.body.clientHeight / 2;

  setFocusPoint(x, y);
});

const setFocusPoint = (x, y) => {
  if (!simulation.active) {
    simulation.alphaTarget(0.3).restart();
  }

  closeNodes.clear();
  focusPoint = { x, y };

  let highlightedTriangle = triangles.find((nodeIds) => {
    const node1 = nodesById[nodeIds[0]];
    const node2 = nodesById[nodeIds[1]];
    const node3 = nodesById[nodeIds[2]];

    return pointInTriangle(focusPoint, node1, node2, node3);
  });

  if (!highlightedTriangle) {
    highlightedTriangle = getClosestTriangle(triangles, nodesById, focusPoint);
    focusPoint = getCentroid(highlightedTriangle, nodesById);
  }

  highlightedTriangle.forEach((nodeId) => {
    closeNodes.add(nodeId);
  });

  triangle.attr("class", (t) => (t === highlightedTriangle ? "active" : ""));
};

const onChangeDeviceOrientation = (event) => {
  const angle = (event.alpha / 180) * Math.PI;

  const x = Math.cos(angle) * 100;
  const y = Math.sin(angle) * 100;

  console.log(x, y);

  setFocusPoint(x, y);
};

function initDeviceOrientation() {
  console.log("Initialization started");

  // Check if DeviceOrientationEvent is available in the window object
  if (typeof DeviceOrientationEvent !== "undefined") {
    // Check if permission is needed for DeviceOrientationEvent (iOS 13+)
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      console.log("Requesting permission for DeviceOrientation");

      // Request permission
      DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            // Permission granted
            console.log("Permission granted for DeviceOrientation");

            // Add event listener if permission granted
            window.addEventListener(
              "deviceorientation",
              onChangeDeviceOrientation
            );
          } else {
            // Permission denied
            console.log("Permission denied for DeviceOrientation");
          }
        })
        .catch(console.error); // Handle potential errors in requesting permission
    } else {
      // Permissions API not needed, just add event listener
      window.addEventListener("deviceorientation", onChangeDeviceOrientation);
    }
  } else {
    console.log("DeviceOrientationEvent is not supported by this browser.");
  }
}

document.addEventListener("click", () => {
  initDeviceOrientation();
});
