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

export const getClosestTriangle = (triangles, nodesById, point) => {
  let closestTriangle = null;
  let minDistance = Infinity;

  for (const triangle of triangles) {
    const centroid = getCentroid(triangle, nodesById);

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

export const getCentroid = (triangle, nodesById) => {
  const vertices = triangle.map((nodeId) => nodesById[nodeId]);

  // Calculate the centroid of the triangle
  return {
    x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
    y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3,
  };
};

export const getOuterNodes = (graph) => {
  // Initialize a map to count the occurrences of each node in the links
  const linkCount = new Map();

  // Count each occurrence of a node either as a source or a target in the links
  graph.links.forEach((link) => {
    linkCount.set(link.source, (linkCount.get(link.source) || 0) + 1);
    linkCount.set(link.target, (linkCount.get(link.target) || 0) + 1);
  });

  // Find nodes with exactly four links
  const nodesWithFourLinks = [];
  linkCount.forEach((count, nodeId) => {
    if (count === 4) {
      // Find the node details from the nodes array using the id
      const nodeDetails = graph.nodes.find((node) => node.id === nodeId);
      if (nodeDetails) {
        nodesWithFourLinks.push(nodeDetails);
      }
    }
  });

  return nodesWithFourLinks;
};
