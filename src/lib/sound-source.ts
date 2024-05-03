import { round, random } from "./math";

export type GeoPosition = {
  lat: number;
  lng: number;
};

export function createGeoLocations(
  center: GeoPosition,
  n: number = 30
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
      const lngShift = 0; // (random(`${markerLat}:${markerLng}2`) - 9, 5) / 10000;

      if (value > 0.5) {
        geoPositions.push({
          lat: markerLat + latShift,
          lng: markerLng + lngShift,
        });
      }
    }
  }

  return geoPositions;
}

type SoundFragmentTypeDetune = {
  type: "detune";
};

type SoundFragmentTypeDistortion = {
  type: "distortion";
};

type SoundFragmentTypeOscilator = {
  type: "oscillator";
  index: number;
  isFlicker: boolean;
};

type SoundFragmentType =
  | SoundFragmentTypeDetune
  | SoundFragmentTypeDistortion
  | SoundFragmentTypeOscilator;

export type GeoSoundSource = {
  geoPosition: GeoPosition;
  distance: number;
  angle: number;
  fragmentType: SoundFragmentType;
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

      const seed = `${round(marker.lat, 6)}:${round(marker.lng, 6)}`;

      return {
        geoPosition: { lat: marker.lat, lng: marker.lng },
        distance: distanceMeters,
        angle: relativeAngle,
        fragmentType: getRandomSoundFragmentType(seed),
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

function getRandomSoundFragmentType(seed: string): SoundFragmentType {
  const value = random(seed + 1);

  if (value < 0.8) {
    return {
      type: "oscillator",
      index: Math.floor(random(seed + 2) * 12),
      isFlicker: random(seed + 3) > 0.5,
    };
  }

  if (value >= 0.8 && value <= 0.9) {
    return { type: "detune" };
  }

  if (value > 0.9) {
    return { type: "distortion" };
  }
}
