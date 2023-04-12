export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiaG9iYnM5NDU4IiwiYSI6ImNsMnhtdjA0ZjB0eG8zam81aGV4MTF3ajkifQ.mCJyz6bWAZw4AzlnViHaYQ';

  const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/hobbs9458/clgaygfm4001l01mw6vrjv50p', // style URL
    center: [-118.113491, 34.111745], // starting position [lng, lat]
    zoom: 9,
    scrollZoom: false, // starting zoom
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
