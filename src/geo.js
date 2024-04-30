export function createGeoPositions(center) {
  var lat = center.lat;
  var lng = center.lng;

  var gridWidth = 10; // Increased grid size for finer granularity
  var gridHeight = 10; // Increased grid size for finer granularity
  var latStep = 0.00018; // Approximate latitudinal distance for 20 meters
  var lngStep = 0.00025; // Approximate longitudinal distance for 20 meters at equator (varies with latitude)

  var geoPositions = [];

  for (var i = 0; i < gridHeight; i++) {
    for (var j = 0; j < gridWidth; j++) {
      var markerLat = lat - (gridHeight / 2) * latStep + i * latStep;
      var markerLng = lng - (gridWidth / 2) * lngStep + j * lngStep;
      geoPositions.push({ lat: markerLat, lng: markerLng });
    }
  }

  return geoPositions;
}
