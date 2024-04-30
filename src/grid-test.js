import { createGeoPositions } from "./geo";

import L from "leaflet";

var map = L.map("root").setView([51.505, -0.09], 20);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

var gridMarkers = [];

function createMarkersFromPositions(geoPositions) {
  var markers = [];

  for (var i = 0; i < geoPositions.length; i++) {
    var marker = L.marker([geoPositions[i].lat, geoPositions[i].lng]).addTo(
      map
    );
    markers.push(marker);
  }

  return markers;
}

function updateGrid(center) {
  for (var i = 0; i < gridMarkers.length; i++) {
    map.removeLayer(gridMarkers[i]);
  }
  gridMarkers = [];
  var geoPositions = createGeoPositions(center);
  gridMarkers = createMarkersFromPositions(geoPositions);

  console.log(gridMarkers);
}

map.on("moveend", function () {
  var center = map.getCenter();
  updateGrid(center);
  L.marker(center, {
    icon: L.icon({
      iconUrl: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
    }),
  }).addTo(map);
});
