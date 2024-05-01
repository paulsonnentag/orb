import { Graph, Vec2d, Node } from "./graph";
import { GeoSoundSource } from "./sound-source";

const GRAVITY_CONSTANT = 0.1;
const FORCE_CONSTANT = window.innerWidth * 0.5;

// adapted from: https://editor.p5js.org/vgarciasc/sketches/0lAcb1WI8

export type PullForce = {
  node: Node;
  destination: Vec2d;
};

export const applyForces = ({ nodes, links }: Graph, forces: PullForce[]) => {
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
    const diff = distanceMagnitude - 10;
    const unitDistance = distance.copy().divScalar(distanceMagnitude);
    const force = unitDistance.multScalar(diff * 0.1);

    node1.force.sub(force);
    node2.force.add(force);
  }

  // apply pull forces
  /* for (const { node, destination } of forces) {
    const direction = destination.copy().sub(node.position);
    const distanceMagnitude = direction.mag();
    const unitDirection = direction.copy().divScalar(distanceMagnitude);
    const pullForce = unitDirection.multScalar(FORCE_CONSTANT * 0.01);
    node.force.add(pullForce);
  }*/

  // update position of nodes
  for (const node of nodes) {
    var vel = node.force.copy();
    node.position.add(vel);
  }
};
