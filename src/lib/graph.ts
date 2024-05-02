export type Node = { id: number; position: Vec2d; force: Vec2d };
export type Link = { from: Node; to: Node };
export type Triangle = Node[];
export type Graph = { nodes: Node[]; links: Link[] };

export const findTriangles = (graph: Graph): Triangle[] => {
  const triangles: Triangle[] = [];

  // Create a map to track neighbors of each node by node ID
  const neighbors = new Map<number, Set<number>>();

  // Initialize the neighbors map
  graph.nodes.forEach((node) => {
    neighbors.set(node.id, new Set());
  });

  // Populate the neighbors map based on the graph's links
  graph.links.forEach((link) => {
    neighbors.get(link.from.id)?.add(link.to.id);
    neighbors.get(link.to.id)?.add(link.from.id);
  });

  // Check for triangles
  graph.nodes.forEach((node) => {
    const nodeNeighbors = neighbors.get(node.id);
    if (nodeNeighbors) {
      nodeNeighbors.forEach((neighborId) => {
        nodeNeighbors.forEach((otherNeighborId) => {
          if (
            neighborId !== otherNeighborId &&
            neighbors.get(neighborId)?.has(otherNeighborId)
          ) {
            // Found a triangle
            const potentialTriangle = [
              graph.nodes.find((n) => n.id === node.id),
              graph.nodes.find((n) => n.id === neighborId),
              graph.nodes.find((n) => n.id === otherNeighborId),
            ].sort((a, b) => a!.id - b!.id); // Sort to avoid duplicate triangles

            // Add triangle if it's not already included
            const triangleIdString = potentialTriangle
              .map((n) => n!.id)
              .join(",");
            if (
              !triangles.find(
                (t) => t.map((n) => n.id).join(",") === triangleIdString
              )
            ) {
              triangles.push(potentialTriangle as Triangle);
            }
          }
        });
      });
    }
  });

  return triangles;
};

// Helper function to calculate the sign of the determinant of a triangle formed by three points
function sign(p1: Vec2d, p2: Vec2d, p3: Vec2d): number {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

// Function to check if a point is inside the triangle
export function pointInTriangle(point: Vec2d, triangle: Triangle): boolean {
  const d1 = sign(point, triangle[0].position, triangle[1].position);
  const d2 = sign(point, triangle[1].position, triangle[2].position);
  const d3 = sign(point, triangle[2].position, triangle[0].position);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}

export const getClosestTriangle = (point: Vec2d, triangles: Triangle[]) => {
  let closestTriangle = null;
  let minDistance = Infinity;

  for (const triangle of triangles) {
    const centroid = getCentroid(triangle);

    // Calculate the distance from the centroid to the point
    const distance = Math.sqrt(
      (centroid.x - point.x) ** 2 + (centroid.y - point.y) ** 2
    );

    // Update the closest triangle if the current distance is smaller
    if (distance < minDistance) {
      closestTriangle = triangle;
      minDistance = distance;
    }
  }

  return closestTriangle;
};

export const getClosestNode = (
  point: Vec2d,
  nodes: Node[],
  minDistance = Infinity
) => {
  let closestNode = null;

  for (const node of nodes) {
    // Calculate the distance from the node to the point
    const distance = Math.sqrt(
      (node.position.x - point.x) ** 2 + (node.position.y - point.y) ** 2
    );

    // Update the closest node if the current distance is smaller
    if (distance < minDistance) {
      closestNode = node;
      minDistance = distance;
    }
  }

  return closestNode;
};

export const getCentroid = (triangle: Triangle) => {
  // Calculate the centroid of the triangle
  return {
    x:
      (triangle[0].position.x +
        triangle[1].position.x +
        triangle[2].position.x) /
      3,
    y:
      (triangle[0].position.y +
        triangle[1].position.y +
        triangle[2].position.y) /
      3,
  };
};

export class Vec2d {
  constructor(public x: number, public y: number) {}

  lerp(vec: Vec2d, amount: number) {
    this.x += (vec.x - this.x) * amount || 0;
    this.y += (vec.y - this.y) * amount || 0;
    return this;
  }

  copy() {
    return new Vec2d(this.x, this.y);
  }

  multScalar(scalar: number) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  sub(vec: Vec2d) {
    this.x -= vec.x;
    this.y -= vec.y;
    return this;
  }

  add(vec: Vec2d) {
    this.x += vec.x;
    this.y += vec.y;
    return this;
  }

  div(vec: Vec2d) {
    this.x /= vec.x;
    this.y /= vec.y;
    return this;
  }

  divScalar(scalar: number) {
    this.x /= scalar;
    this.y /= scalar;
    return this;
  }

  mag() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }
}
