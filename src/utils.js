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

export const pointInTriangle = (x1, y1, x2, y2, x3, y3, px, py) => {
  // Calculate area of the triangle ABC
  function area(x1, y1, x2, y2, x3, y3) {
    return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2.0);
  }

  // Calculate area of the triangle PBC
  let A1 = area(px, py, x2, y2, x3, y3);

  // Calculate area of the triangle PAC
  let A2 = area(x1, y1, px, py, x3, y3);

  // Calculate area of the triangle PAB
  let A3 = area(x1, y1, x2, y2, px, py);

  // Calculate area of the triangle ABC
  let A = area(x1, y1, x2, y2, x3, y3);

  // Check if sum of A1, A2 and A3 is same as A
  return A === A1 + A2 + A3;
};
