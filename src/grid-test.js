import {
  createGeoLocations,
  getSurroundingSoundSources,
} from "./lib/sound-source";

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

function updateGrid(center, angle) {
  for (var i = 0; i < gridMarkers.length; i++) {
    map.removeLayer(gridMarkers[i]);
  }
  gridMarkers = [];
  var geoPositions = createGeoLocations(center);
  gridMarkers = createMarkersFromPositions(geoPositions);

  var closestPoints = getSurroundingSoundSources(center, angle);
  console.log(closestPoints);
}

// Create a slider element
var slider = document.createElement("input");
slider.type = "range";
slider.min = "0";
slider.max = "360";
slider.value = "0";
slider.id = "angleSlider";
slider.style.position = "absolute";
slider.style.top = "0";
slider.style.right = "0";
slider.style.zIndex = "1000";
document.body.appendChild(slider);

// Initialize a variable to hold the current marker
var currentMarker = null;

// Register a change handler for the slider
document.getElementById("angleSlider").addEventListener("input", function () {
  var angle = this.value;
  var center = map.getCenter();
  updateGrid(center, angle);

  var triangleDiv = L.divIcon({
    className: "triangle-marker",
    iconSize: [30, 30],
    html:
      '<div style="width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-bottom: 30px solid red; transform: rotate(' +
      angle +
      'deg);"></div>',
  });

  // Remove the previous marker if it exists
  if (currentMarker) {
    map.removeLayer(currentMarker);
  }

  // Add the new marker and store it in currentMarker
  currentMarker = L.marker(center, { icon: triangleDiv }).addTo(map);
});

map.on("moveend", function () {
  var center = map.getCenter();

  var angle = document.getElementById("angleSlider").value;
  updateGrid(center, angle);
  var triangleDiv = L.divIcon({
    className: "triangle-marker",
    iconSize: [30, 30],
    html:
      '<div style="width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-bottom: 30px solid red; transform: rotate(' +
      angle +
      'deg);"></div>',
  });

  // Remove the previous marker if it exists
  if (currentMarker) {
    map.removeLayer(currentMarker);
  }

  // Add the new marker and store it in currentMarker
  currentMarker = L.marker(center, { icon: triangleDiv }).addTo(map);
});
