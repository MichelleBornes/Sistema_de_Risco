/* Módulo cartográfico: Leaflet e seleção de coordenadas.
   No modo de demonstração, a cor do ponto representa apenas o cenário simulado. */
(() => {
  'use strict';
  // Inicializa o mapa de Curitiba e os controles de navegação do Leaflet.
  const INITIAL = [-25.42840, -49.27330]; // Centro de Curitiba, PR.
  const map = L.map('map', { zoomControl: false }).setView(INITIAL, 12);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  // Prepara o marcador inicial, os campos de coordenadas e a camada de previsão.
  const markerIcon = L.divIcon({ className: '', html: '<span class="selection-pin"></span>', iconSize: [18,18], iconAnchor: [9,9] });
  const marker = L.marker(INITIAL, {icon: markerIcon}).addTo(map);
  const latInput = document.getElementById('latitude');
  const lngInput = document.getElementById('longitude');
  const label = document.getElementById('map-coordinates');
  let forecastLayer = null;

  // Atualiza o marcador, os campos e o texto quando um ponto é selecionado.
  function selectPoint(lat, lng, recenter = true) {
    lat = Number(lat); lng = Number(lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
    marker.setLatLng([lat, lng]);
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
    label.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (recenter) map.panTo([lat, lng]);
    return true;
  }

  // Sincroniza o mapa com cliques, alterações nos campos e o botão de recentralizar.
  map.on('click', event => selectPoint(event.latlng.lat, event.latlng.lng, false));
  function syncInputs() { selectPoint(latInput.value, lngInput.value); }
  latInput.addEventListener('change', syncInputs);
  lngInput.addEventListener('change', syncInputs);
  document.getElementById('reset-map').addEventListener('click', () => map.setView(INITIAL, 12));

  // Marca o ponto consultado com o nível retornado pela previsão ou pela simulação.
  function showPrediction(lat, lng, level) {
    if (forecastLayer) map.removeLayer(forecastLayer);
    const palette = { baixo: '#10b981', medio: '#f59e0b', alto: '#ef4444' };
    const color = palette[level];
    if (!color) return;
    forecastLayer = L.circle([lat, lng], { radius: 220, color, weight: 2, fillColor: color, fillOpacity: .15, interactive: false }).addTo(map);
    map.panTo([lat, lng]);
  }

  // Expõe as operações usadas pelo formulário de previsão.
  window.RiskMap = Object.freeze({ selectPoint, showPrediction, map });

  // Leaflet pode medir o contêiner antes da conclusão do layout.
  window.addEventListener('load', () => map.invalidateSize());
  
  // Recalcula os tiles quando o quadrado muda de tamanho no layout responsivo.
  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resizeObserver.observe(map.getContainer());
  }
})();
