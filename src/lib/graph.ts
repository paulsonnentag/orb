export type Node = { id: number; position: Vec2d; force: Vec2d };
export type Link = { from: Node; to: Node };
export type Triangle = Node[];
export type Graph = { nodes: Node[]; links: Link[] };

export const findTriangles = ({ nodes, links }: Graph): Triangle[] => {
  const nodesById: Record<number, Node> = {};
  nodes.forEach((node) => {
    nodesById[node.id] = node;
  });

  // Convert the list of links into an adjacency list
  const adjacencyList = new Map<number, Set<number>>();
  links.forEach((link) => {
    if (!adjacencyList.has(link.from.id)) {
      adjacencyList.set(link.from.id, new Set());
    }
    if (!adjacencyList.has(link.to.id)) {
      adjacencyList.set(link.to.id, new Set());
    }
    adjacencyList.get(link.from.id)!.add(link.from.id);
    adjacencyList.get(link.to.id)!.add(link.to.id);
  });

  // Find all triangles
  const triangles = new Set<string>();
  links.forEach((link) => {
    const { from, to } = link;
    // Check for mutual neighbors of source and target
    adjacencyList.get(from.id)!.forEach((neighbor) => {
      if (adjacencyList.get(to.id)!.has(neighbor)) {
        let nodeIds = [from.id, to.id, neighbor].sort();
        triangles.add(JSON.stringify(nodeIds)); // Use JSON stringify to handle unique checks
      }
    });
  });

  // Convert stringified arrays back to arrays of node IDs
  return Array.from(triangles).map((triangle) => {
    const nodeIds = JSON.parse(triangle) as number[];
    return nodeIds.map((id) => nodesById[id]);
  });
};

export function sign(p1: Vec2d, p2: Vec2d, p3: P) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

export function pointInTriangle(point: Vec2d, triangle: Triangle) {
  const d1 = sign(point, triangle[0].position, triangle[1].position);
  const d2 = sign(point, triangle[1].position, triangle[2].position);
  const d3 = sign(point, triangle[2].position, triangle[0].position);

  /*
  d1 = sign(point, v1, v2);
  d2 = sign(point, v2, v3);
  d3 = sign(point, v3, v1);
  */

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
