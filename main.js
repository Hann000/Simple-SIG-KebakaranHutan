import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { Vector as VectorSource } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import { Fill, Stroke, Style, Icon } from 'ol/style';
import Overlay from 'ol/Overlay.js';

// Daftar kabupaten yang valid
const kabupatenList = [
  "Indragiri Hulu", "Indragiri Hilir", "Pekanbaru", "Siak",, 
  "Kampar", "Bengkalis", "Dumai", "Kuantan Singingi", "Rokan Hulu", 
  "Rokan Hilir", "Kepulauan Meranti", "Pelalawan", "Kuansing"
];

// Map warna untuk kabupaten
const kabupatenColors = {
  "Indragiri Hul": '#FF5733',
  "Indragiri Hil": '#33FF57',
  "Pekanbaru": '#3357FF',
  "Siak": '#FF33A8',
  "Pekan Baru": '#A833FF',
  "Kampar": '#FF5733',
  "Bengkalis": '#5733FF',
  "Dumai": '#57FF33',
  "Kuantan Singingi": '#FF9F33',
  "Rokan Hulu": '#9F33FF',
  "Rokan Hilir": '#33FFF0',
  "Kepulauan Meranti": '#F0FF33',
  "Pelalawan": '#33FF99',
  "Kuansing": '#9933FF'
};

// Layer Riau (polygon berdasarkan kabupaten)
const riau = new VectorLayer({
  source: new VectorSource({
    format: new GeoJSON(),
    url: 'data/polygon_riau.json',
  }),
  style: function (feature) {
    const kabupaten = feature.get('KABUPATEN');
    const color = kabupatenColors[kabupaten] || '#888888';
    return new Style({
      fill: new Fill({
        color: color, 
      }),
      stroke: new Stroke({
        color: '#000000',
        width: 1,
      }),
    });
  },
});

// Layer kebakaran hutan
const kebakaranSource = new VectorSource({
  format: new GeoJSON(),
  loader: function (extent, resolution, projection) {
    fetch('data/KebakaranHutan.json')
      .then((response) => response.json())
      .then((data) => {
        const geojsonFormat = new GeoJSON();
        const features = geojsonFormat.readFeatures(data, {
          featureProjection: projection,
        });
        kebakaranSource.addFeatures(features);

        // Menampilkan checkbox untuk kabupaten
        const kabupatenContainer = document.getElementById('kabupaten-checkboxes');
        kabupatenList.forEach((kabupaten) => {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = kabupaten;
          checkbox.value = kabupaten;
          checkbox.className = 'kabupaten-checkbox';
          const label = document.createElement('label');
          label.setAttribute('for', kabupaten);
          label.textContent = kabupaten;
          kabupatenContainer.appendChild(checkbox);
          kabupatenContainer.appendChild(label);
          kabupatenContainer.appendChild(document.createElement('br'));
        });
      })
      .catch((error) => console.error('Error loading KebakaranHutan data:', error));
  },
});

// Layer kebakaran Hutan dengan ikon
const kebakaran = new VectorLayer({
  source: kebakaranSource,
  style: function (feature) {
    return new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: './icon/fire.png', 
        scale: 0.1,
      }),
    });
  },
});

// Map dan Popup
const container = document.getElementById('popup');
const content_element = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

const overlay = new Overlay({
  element: container,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});

const map = new Map({
  target: 'map',
  overlays: [overlay],
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    riau,
    kebakaran,
  ],
  view: new View({
    center: fromLonLat([101.438309, 0.510440]),
    zoom: 7,
  }),
});

// Interaksi klik pada peta untuk popup
map.on('singleclick', function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    return feature;
  });

  if (!feature) {
    return;
  }

  const coordinate = evt.coordinate;
  const namaPemetaan = feature.get('Nama Pemetaan');
  const alamat = feature.get('Alamat');
  const fotoLokasi = feature.get('Foto Lokasi');

  const content = `
    <h3>Nama Pemetaan: ${namaPemetaan}</h3>
    <p><strong>Alamat:</strong> ${alamat}</p>
    <img src="${fotoLokasi}" alt="Foto Lokasi" style="width: 100%; height: auto;">
  `;

  content_element.innerHTML = content;
  overlay.setPosition(coordinate);
});

closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

// Filter berdasarkan checkbox kabupaten
document.getElementById('kabupaten-checkboxes').addEventListener('change', (e) => {
  const selectedKabupatens = Array.from(document.querySelectorAll('.kabupaten-checkbox'))
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);

  kebakaranSource.clear();

  fetch('data/KebakaranHutan.json')
    .then((response) => response.json())
    .then((data) => {
      const geojsonFormat = new GeoJSON();
      const features = geojsonFormat.readFeatures(data, {
        featureProjection: map.getView().getProjection(),
      });

      // Filter berdasarkan kabupaten yang dipilih
      const filteredFeatures = features.filter((feature) => {
        const kabupaten = feature.get('Kabupaten');
        return selectedKabupatens.includes(kabupaten);
      });

      kebakaranSource.addFeatures(filteredFeatures);
    })
    .catch((error) => console.error('Error filtering KebakaranHutan data:', error));
});

// Mencari berdasarkan input
document.getElementById('search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  kebakaranSource.clear();

  fetch('data/KebakaranHutan.json')
    .then((response) => response.json())
    .then((data) => {
      const geojsonFormat = new GeoJSON();
      const features = geojsonFormat.readFeatures(data, {
        featureProjection: map.getView().getProjection(),
      });

      const filteredFeatures = features.filter((feature) => {
        const alamat = feature.get('Alamat')?.toLowerCase();
        const namaPemetaan = feature.get('Nama Pemetaan')?.toLowerCase();
        const kecamatan = feature.get('Kecamatan')?.toLowerCase();
        return alamat?.includes(query) || namaPemetaan?.includes(query) || kecamatan?.includes(query);
      });

      kebakaranSource.addFeatures(filteredFeatures);
    })
    .catch((error) => console.error('Error searching KebakaranHutan data:', error));
});
