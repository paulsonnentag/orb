import * as d3 from "d3";

import graph from "./graph.json";
import { findTriangles } from "./graph";

const { nodes, links } = graph;
const nodesById = {};
nodes.forEach((node) => {
  nodesById[node.id] = node;
});

const triangles = findTriangles(graph);

console.log(triangles);

// Specify the dimensions of the chart.
const width = window.innerWidth;
const height = window.innerHeight;

// Specify the color scale.
const color = d3.scaleOrdinal(d3.schemeCategory10);

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
  .force("charge", d3.forceManyBody())
  .force("x", d3.forceX())
  .force("y", d3.forceY());

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
  .attr("fill", "white")
  .attr("opacity", 0.5);

const link = svg
  .append("g")
  .attr("stroke", "#fff")
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
  .attr("r", 10)
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
