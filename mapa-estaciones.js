const estaciones = [
  { nombre: 'Corferias', id: 'OT-CORF-01', posicion: [4.630, -74.091], pm25: 12.3, pm10: 24.1, hr: 68.2, temp: 18.4 },
  { nombre: 'Zona Franca', id: 'OT-INDU-02', posicion: [4.677, -74.161], pm25: 36.8, pm10: 55.6, hr: 79.5, temp: 17.1 },
  { nombre: 'El Dorado', id: 'OT-AERO-03', posicion: [4.701, -74.146], pm25: 10.9, pm10: 21.4, hr: 65, temp: 19 },
  { nombre: 'Portal Sur', id: 'OT-MOVI-04', posicion: [4.596, -74.170], pm25: 58.2, pm10: 83.5, hr: 62.1, temp: 21 },
  { nombre: 'Sopó', id: 'OT-ALPI-05', posicion: [4.909, -73.943], pm25: 8.4, pm10: 16.2, hr: 65, temp: 19 }
];

function iniciarMapa(estaciones) {
  const cobertura = [[4.42, -74.43], [5.0, -73.83]];
  const mapa = L.map('map', {minZoom: 9, maxZoom: 14, maxBounds: cobertura, maxBoundsViscosity: 1}).setView([4.67,-74.1],11);
  L.imageOverlay('bogota-base.svg', cobertura, {
    alt: 'Localidades y vías arteriales de Bogotá',
    attribution: '<a href="https://sig.car.gov.co/arcgis/rest/services/visor/Division_Territorial/MapServer/5">Localidades IDECA / CAR</a> · <a href="https://mapas.gobiernobogota.gov.co/waserver/rest/services/Mapa_Base/MapServer/6">Vías SDG</a>'
  }).addTo(mapa);
  const limites = L.latLngBounds(estaciones.map(estacion => estacion.posicion));
  let encuadrado = false;
  function ajustarMapa() {
    const contenedor = mapa.getContainer();
    if (!contenedor.clientHeight || !contenedor.clientWidth) return;
    mapa.invalidateSize();
    if (!encuadrado) {
      if (limites.isValid()) mapa.fitBounds(limites, {padding: [30, 30], maxZoom: 12});
      else mapa.setView([4.67,-74.1],11);
      encuadrado = true;
    }
  }
  ajustarMapa();
  const observer = new ResizeObserver(ajustarMapa);
  observer.observe(mapa.getContainer());
  const selector = document.getElementById('indicador');
  const formato = new Intl.NumberFormat('es-CO', {maximumFractionDigits: 1});
  const marcadores = estaciones.map(estacion =>
    L.marker(estacion.posicion, {title: estacion.nombre, icon: L.divIcon({className: 'valor'})}).bindPopup('').addTo(mapa)
  );
  function actualizar() {
    estaciones.forEach((estacion, i) => {
      const medida = estacion[selector.value];
      const valor = medida == null ? '—' : formato.format(medida);
      const indicador = selector.selectedOptions[0].text;
      const marcador = marcadores[i];
      marcador.setIcon(L.divIcon({className: 'valor', html: valor, iconSize: [46, 28], iconAnchor: [23, 14]}));
      marcador.getElement().setAttribute('aria-label', estacion.nombre + ', ' + indicador + ', ' + valor);
      const detalle = document.createElement('div');
      detalle.textContent = estacion.nombre + ' · ' + estacion.id + ' · ' + indicador + ' · ' + valor;
      marcador.setPopupContent(detalle);
    });
  }
  selector.addEventListener('change', actualizar);
  actualizar();
  return () => { observer.disconnect(); selector.removeEventListener('change', actualizar); mapa.remove(); };
}
if (!document.getElementById('portal')) {
  if (window.L) iniciarMapa(estaciones);
  else document.getElementById('map').textContent = 'No se pudo cargar el mapa.';
}
