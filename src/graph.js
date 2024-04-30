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
