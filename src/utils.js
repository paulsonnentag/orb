export const findTriangles = ({ nodes, links }) => {
  // Convert the list of links into an adjacency list
  const adjacencyList = new Map();
  links.forEach((link) => {
    if (!adjacencyList.has(link.source)) {
      adjacencyList.set(link.source, new Set());
    }
    if (!adjacencyList.has(link.target)) {
      adjacencyList.set(link.target, new Set());
    }
    adjacencyList.get(link.source).add(link.target);
    adjacencyList.get(link.target).add(link.source);
  });

  // Find all triangles
  const triangles = new Set();
  links.forEach((link) => {
    const { source, target } = link;
    // Check for mutual neighbors of source and target
    adjacencyList.get(source).forEach((neighbor) => {
      if (adjacencyList.get(target).has(neighbor)) {
        let triangleIDs = [source, target, neighbor].sort();
        triangles.add(JSON.stringify(triangleIDs)); // Use JSON stringify to handle unique checks
      }
    });
  });

  // Convert stringified arrays back to arrays of node IDs
  return Array.from(triangles).map((triangle) => JSON.parse(triangle));
};

export function sign(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

export function pointInTriangle(pt, v1, v2, v3) {
  let d1, d2, d3;
  let hasNeg, hasPos;

  d1 = sign(pt, v1, v2);
  d2 = sign(pt, v2, v3);
  d3 = sign(pt, v3, v1);

  hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}
