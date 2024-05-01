import { Graph } from "./graph";

const GRAVITY_CONSTANT = 0.01;
const FORCE_CONSTANT = 500;

const MAX_DISTANCE = window.innerWidth / 500;

// adapted from: https://editor.p5js.org/vgarciasc/sketches/0lAcb1WI8

export const applyForces = ({ nodes, links }: Graph) => {
  // apply force towards centre
  nodes.forEach((node) => {
    const gravity = node.position.copy().multScalar(-1 * GRAVITY_CONSTANT);
    node.force = gravity;
  });

  // apply repulsive force between nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const position = nodes[i].position;
      const direction = nodes[j].position.copy().sub(position);
      const force = direction.divScalar(direction.mag() * direction.mag());
      force.multScalar(FORCE_CONSTANT);
      nodes[i].force.add(force.copy().multScalar(-1));
      nodes[j].force.add(force);
    }
  }

  // apply forces applied by connections
  for (const link of links) {
    const node1 = link.from;
    const node2 = link.to;
    const distance = node1.position.copy().sub(node2.position);
    const distanceMagnitude = distance.mag();
    const diff = distanceMagnitude - MAX_DISTANCE;
    const unitDistance = distance.copy().divScalar(distanceMagnitude);
    const force = unitDistance.multScalar(diff * 0.1);

    node1.force.sub(force);
    node2.force.add(force);
  }

  // update position of nodes
  for (const node of nodes) {
    var vel = node.force.copy();
    node.position.add(vel);
  }
};

/*

class Node {
  constructor(pos, size) {
    this.pos = pos;
    this.force = createVector(0, 0);
    this.mass = (2 * PI * size) / 1.5;
  }

  update() {
    var force = this.force.copy();
    var vel = force.copy().div(this.mass);
    this.pos.add(vel);
  }

  draw() {
    ellipse(this.pos.x, this.pos.y, this.mass, this.mass);
  }
}

*/
