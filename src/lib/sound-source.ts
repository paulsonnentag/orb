import { Vec2d } from "./graph";
import { random } from "./random";

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

      const value = random(`${markerLat}:${markerLng}`);
      if (value > 0.5) {
        geoPositions.push({ lat: markerLat, lng: markerLng });
      }
    }
  }

  return geoPositions;
}

export type GeoSoundSource = {
  geoPosition: GeoPosition;
  screenPosition: Vec2d;
  distance: number;
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
      const x =
        Math.cos(relativeAngle) * Math.sqrt(distanceMeters / 20) * 20 * 7;
      const y =
        Math.sin(relativeAngle) * Math.sqrt(distanceMeters / 20) * 20 * 7;

      return {
        geoPosition: { lat: marker.lat, lng: marker.lng },
        screenPosition: new Vec2d(x, y),
        distance: distanceMeters,
      };
    })
    .sort((a, b) => a.distance - b.distance);
}
