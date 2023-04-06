const locations = JSON.parse(document.getElementById('map').dataset.locations);

mapboxgl.accessToken =
  'pk.eyJ1IjoiaG9iYnM5NDU4IiwiYSI6ImNsMnhtdjA0ZjB0eG8zam81aGV4MTF3ajkifQ.mCJyz6bWAZw4AzlnViHaYQ';

const map = new mapboxgl.Map({
  container: 'map', // container ID
  style: 'mapbox://styles/mapbox/streets-v12', // style URL
  center: [-74.5, 40], // starting position [lng, lat]
  zoom: 9, // starting zoom
});
