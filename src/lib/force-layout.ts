import { AudioState } from "../sound/app";
import { CapturedOscilator } from "../compass";
import { Graph, Vec2d, Node, getCentroid } from "./graph";

// adapted from: https://editor.p5js.org/vgarciasc/sketches/0lAcb1WI8

export type PullForce = {
  node: Node;
  destination: Vec2d;
};

type ForceParams = {
  attractorForce: number;
  repulsionForce: number;
  gravity: number;
};

export const applyForces = (
  { nodes, links }: Graph,
  attractors: Vec2d[],
  params: ForceParams,
  capturedOscilators: CapturedOscilator[],
  audioState: AudioState
) => {
  // apply force towards centre
  nodes.forEach((node) => {
    const gravity = node.position.copy().multScalar(-1 * params.gravity);
    node.force = gravity;
  });

  attractors.forEach((attractor) => {
    nodes.forEach((node) => {
      const direction = attractor.copy().sub(node.position);
      const distanceMagnitude = direction.mag();
      const unitDirection = direction.copy().divScalar(distanceMagnitude);
      const pullForce = unitDirection.multScalar(params.attractorForce * 0.05);
      node.force.add(pullForce);
    });
  });

  // apply repulsive force between nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const position = nodes[i].position;
      const direction = nodes[j].position.copy().sub(position);
      const force = direction.divScalar(direction.mag() * direction.mag());
      force.multScalar(params.repulsionForce);
      nodes[i].force.add(force.copy().multScalar(-1));
      nodes[j].force.add(force);
    }
  }

  if (audioState) {
    // apply oscilator force
    for (const oscilator of capturedOscilators) {
      const centroid = getCentroid(oscilator.triangle);
      const oscillator = audioState.oscillators[oscilator.soundSource.index];
      const amplitude = oscilator.soundSource.isFlicker
        ? oscillator.flicker
        : oscillator.amplitude;

      for (const node of oscilator.triangle) {
        const position = node.position;
        const direction = centroid.copy().sub(position);
        const force = direction.divScalar(direction.mag() * direction.mag());
        force.multScalar(params.repulsionForce);
        node.force.add(force.copy().multScalar(-1 * amplitude));
      }
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

  // update position of nodes
  for (const node of nodes) {
    var vel = node.force.copy();
    node.position.add(vel);
  }
};
