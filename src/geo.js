export function createGeoPositions(center) {
  var lat = center.lat;
  var lng = center.lng;

  var gridWidth = 5; // Increased grid size for finer granularity
  var gridHeight = 5; // Increased grid size for finer granularity
  var latStep = 0.00018; // Approximate latitudinal distance for 20 meters
  var lngStep = 0.00025; // Approximate longitudinal distance for 20 meters at equator (varies with latitude)

  var geoPositions = [];

  // Calculate the offset to align the grid to an absolute position
  var latOffset = lat % latStep;
  var lngOffset = lng % lngStep;

  for (var i = 0; i < gridHeight; i++) {
    for (var j = 0; j < gridWidth; j++) {
      var markerLat =
        lat - latOffset - (gridHeight / 2) * latStep + i * latStep;
      var markerLng = lng - lngOffset - (gridWidth / 2) * lngStep + j * lngStep;
      geoPositions.push({ lat: markerLat, lng: markerLng });
    }
  }

  return geoPositions;
}

export function getClosestPoints(center, angle) {
  const markers = createGeoPositions(center);

  return markers
    .map((marker) => {
      var latDiff = marker.lat - center.lat;
      var lngDiff = marker.lng - center.lng;
      // Convert lat and lng differences to meters
      var latDiffMeters = latDiff * 111139;
      var lngDiffMeters = lngDiff * 111139;
      var distanceMeters = Math.sqrt(
        latDiffMeters * latDiffMeters + lngDiffMeters * lngDiffMeters
      );
      // Calculate the angle in degrees
      var markerAngle =
        Math.atan2(lngDiffMeters, latDiffMeters) * (180 / Math.PI);
      // Adjust the angle relative to the input angle
      var relativeAngle = (markerAngle - angle + 360) % 360;
      return {
        lat: marker.lat,
        lng: marker.lng,
        distance: distanceMeters,
        angle: relativeAngle,
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);
}
