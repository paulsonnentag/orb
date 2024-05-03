import { round, random } from "./math";

export type GeoPosition = { lat: number; lng: number };

export function createGeoLocations(
  center: GeoPosition,
  n: number = 20
): GeoPosition[] {
  var lat = center.lat;
  var lng = center.lng;

  var latStep = 0.00018; // Approximate latitudinal distance for 20 meters
  var lngStep = 0.00025; // Approximate longitudinal distance for 20 meters at equator (varies with latitude)

  var geoPositions = [];

  // Calculate the offset to align the grid to an absolute position
  var latOffset = lat % latStep;
  var lngOffset = lng % lngStep;

  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      var markerLat = lat - latOffset - (n / 2) * latStep + i * latStep;
      var markerLng = lng - lngOffset - (n / 2) * lngStep + j * lngStep;

      const seed = `${round(markerLat, 6)}:${round(markerLng, 6)}`;

      const value = random(seed);
      const latShift = 0; // (random(`${markerLat}:${markerLng}1`) - 0.5) / 10000;
      const lngShift = 0; //(random(`${markerLat}:${markerLng}2`) - 9, 5) / 10000;

      if (value > 0.7) {
        geoPositions.push({
          lat: markerLat + latShift,
          lng: markerLng + lngShift,
        });
      }
    }
  }

  return geoPositions;
}

export type GeoSoundSource = {
  geoPosition: GeoPosition;
  distance: number;
  angle: number;
};

export function getSurroundingSoundSources(
  center: GeoPosition,
  angle: number
): GeoSoundSource[] {
  const markers = createGeoLocations(center);

  return markers
    .map((marker) => {
      const latDiff = marker.lat - center.lat;
      const lngDiff = marker.lng - center.lng;
      // Convert lat and lng differences to meters
      const latDiffMeters = latDiff * 111139;
      const lngDiffMeters = lngDiff * 111139;
      const distanceMeters = Math.sqrt(
        latDiffMeters * latDiffMeters + lngDiffMeters * lngDiffMeters
      );
      // Calculate the angle in degrees
      const markerAngle = Math.atan2(lngDiffMeters, latDiffMeters);
      // Adjust the angle relative to the input angle
      const relativeAngle = markerAngle - (angle / 180) * Math.PI;

      return {
        geoPosition: { lat: marker.lat, lng: marker.lng },
        distance: distanceMeters,
        angle: relativeAngle,
      };
    })
    .sort((a, b) => a.distance - b.distance);
}
