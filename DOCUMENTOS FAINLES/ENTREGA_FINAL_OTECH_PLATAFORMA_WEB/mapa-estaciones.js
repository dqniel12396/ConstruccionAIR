// =========================================================================
// OTech AirNet - Sistema Cartográfico Geo-Espacial Interactivo (Bogotá & Sabana)
// 100% Libre de API Keys / Sin Marcas de Agua (Powered by Esri ArcGIS & Leaflet)
// Compatible con Supabase Auth (panel_empresa) y Modo Demostración Autónomo
// =========================================================================

// Catálogo de estaciones de referencia de la Red de Monitoreo OTech
const estacionesDemo = [
  { nombre: 'Corferias - Pabellón Innovación', id: 'OT-CORF-01', posicion: [4.630, -74.091], pm25: 12.3, pm10: 24.1, hr: 68.2, temp: 18.4, estado: 'OPERATIVO_ONLINE', bateria: 98 },
  { nombre: 'Zona Franca - Parque Industrial', id: 'OT-INDU-02', posicion: [4.677, -74.161], pm25: 36.8, pm10: 55.6, hr: 79.5, temp: 17.1, estado: 'OPERATIVO_ONLINE', bateria: 92 },
  { nombre: 'Terminal Carga - El Dorado', id: 'OT-AERO-03', posicion: [4.701, -74.146], pm25: 10.9, pm10: 21.4, hr: 65.0, temp: 19.0, estado: 'OPERATIVO_ONLINE', bateria: 100 },
  { nombre: 'Portal Sur - TransMilenio Autopista', id: 'OT-MOVI-04', posicion: [4.596, -74.170], pm25: 58.2, pm10: 83.5, hr: 62.1, temp: 21.0, estado: 'OPERATIVO_ONLINE', bateria: 85 },
  { nombre: 'Sopó - Cuenca Sabana Norte', id: 'OT-ALPI-05', posicion: [4.909, -73.943], pm25: 8.4, pm10: 16.2, hr: 65.0, temp: 19.0, estado: 'OPERATIVO_ONLINE', bateria: 95 }
];

// Cálculo de Índice de Calidad del Aire (ICA Bogotá / Norma Resolución 2254 de 2017 & EPA)
function getAQIInfo(variable, valor) {
  if (valor == null || isNaN(valor)) {
    return { color: '#64748b', bg: 'rgba(100,116,139,0.2)', texto: '#94a3b8', etiqueta: 'Sin Datos', clase: 'aqi-nodata', nivel: 'N/A', advisory: 'Sin medición disponible en este momento.' };
  }
  if (variable === 'pm25') {
    if (valor <= 12.0) return { color: '#10b981', bg: 'rgba(16,185,129,0.25)', texto: '#34d399', etiqueta: 'Buena', clase: 'aqi-good', nivel: 'Bajo Riesgo', advisory: 'Calidad del aire óptima para toda la población.' };
    if (valor <= 35.4) return { color: '#eab308', bg: 'rgba(234,179,8,0.25)', texto: '#fde047', etiqueta: 'Aceptable / Moderada', clase: 'aqi-moderate', nivel: 'Riesgo Moderado', advisory: 'Calidad del aire aceptable. Personas sensibles deben limitar esfuerzo exterior prolongado.' };
    if (valor <= 55.4) return { color: '#f97316', bg: 'rgba(249,115,22,0.25)', texto: '#fdba74', etiqueta: 'Dañina (Grupos Sensibles)', clase: 'aqi-sensitive', nivel: 'Alerta Preventiva', advisory: 'Niños, adultos mayores y personas con asma deben reducir actividades al aire libre.' };
    if (valor <= 150.4) return { color: '#ef4444', bg: 'rgba(239,68,68,0.25)', texto: '#fca5a5', etiqueta: 'Dañina a la Salud', clase: 'aqi-unhealthy', nivel: 'Alerta Naranja', advisory: 'Efectos en la salud de toda la población. Suspender actividades físicas en exteriores.' };
    return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.25)', texto: '#d8b4fe', etiqueta: 'Peligrosa / Emergencia', clase: 'aqi-hazardous', nivel: 'Alerta Roja', advisory: 'Condición de emergencia ambiental. Permanecer en recintos con ventilación filtrada.' };
  }
  if (variable === 'pm10') {
    if (valor <= 54) return { color: '#10b981', bg: 'rgba(16,185,129,0.25)', texto: '#34d399', etiqueta: 'Buena', clase: 'aqi-good', nivel: 'Bajo', advisory: 'Material particulado grueso dentro del rango seguro.' };
    if (valor <= 154) return { color: '#eab308', bg: 'rgba(234,179,8,0.25)', texto: '#fde047', etiqueta: 'Aceptable', clase: 'aqi-moderate', nivel: 'Moderado', advisory: 'Concentración regular en áreas urbanas e industriales.' };
    if (valor <= 254) return { color: '#f97316', bg: 'rgba(249,115,22,0.25)', texto: '#fdba74', etiqueta: 'Alerta Amarilla', clase: 'aqi-sensitive', nivel: 'Sensible', advisory: 'Concentración elevada de polvo y emisiones vehiculares.' };
    return { color: '#ef4444', bg: 'rgba(239,68,68,0.25)', texto: '#fca5a5', etiqueta: 'Alerta Naranja', clase: 'aqi-unhealthy', nivel: 'Alto', advisory: 'Superación de límites permisibles de calidad del aire.' };
  }
  if (variable === 'hr') {
    if (valor < 40) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.25)', texto: '#fbbf24', etiqueta: 'Ambiente Seco', clase: 'aqi-moderate', nivel: 'Baja Humedad', advisory: 'Condición seca en la sabana, favorable a la dispersión de polvo.' };
    if (valor <= 75) return { color: '#06b6d4', bg: 'rgba(6,182,212,0.25)', texto: '#67e8f9', etiqueta: 'Humedad Confort', clase: 'aqi-good', nivel: 'Óptimo', advisory: 'Humedad relativa en rango normal de confort ambiental.' };
    return { color: '#3b82f6', bg: 'rgba(59,130,246,0.25)', texto: '#93c5fd', etiqueta: 'Compensación κ-Köhler', clase: 'aqi-sensitive', nivel: 'Alta Humedad (>75%)', advisory: 'Compensación higroscópica activa: corrección matemática del crecimiento por vapor de agua.' };
  }
  if (variable === 'temp') {
    if (valor < 14) return { color: '#38bdf8', bg: 'rgba(56,189,248,0.25)', texto: '#7dd3fc', etiqueta: 'Frío Sabana', clase: 'aqi-moderate', nivel: 'Baja Temp.', advisory: 'Temperatura fresca característica de la sabana de Bogotá.' };
    if (valor <= 22) return { color: '#10b981', bg: 'rgba(16,185,129,0.25)', texto: '#34d399', etiqueta: 'Templado Confort', clase: 'aqi-good', nivel: 'Óptimo', advisory: 'Temperatura en rango ideal de operación metrológica.' };
    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.25)', texto: '#fbbf24', etiqueta: 'Cálido Urbano', clase: 'aqi-sensitive', nivel: 'Cálido', advisory: 'Isla de calor urbano o radiación solar intensa.' };
  }
  return { color: '#14b8a6', bg: 'rgba(20,184,166,0.25)', texto: '#5eead4', etiqueta: 'Medición Normal', clase: 'aqi-good', nivel: 'Estable', advisory: 'Lectura dentro de los parámetros de calibración.' };
}

// Unidades por variable
const unidades = { pm25: 'µg/m³', pm10: 'µg/m³', hr: '%', temp: '°C' };

// Función Principal de Inicialización del Mapa
function iniciarMapa(estacionesInput) {
  const estaciones = (estacionesInput && estacionesInput.length > 0) ? estacionesInput : estacionesDemo;
  const contenedor = document.getElementById('map');
  if (!contenedor) return () => {};

  // Limpiar contenedor previo si existía una instancia activa
  if (contenedor._leaflet_id && window.mapaActual) {
    try { window.mapaActual.remove(); } catch (e) {}
  }

  // Cobertura geográfica de Bogotá D.C. y la Sabana de Cundinamarca
  const coberturaSabana = [[4.38, -74.45], [5.05, -73.80]];

  // 1. Instancia del Mapa Leaflet
  const mapa = L.map('map', {
    minZoom: 8,
    maxZoom: 18,
    maxBounds: [[4.20, -74.65], [5.25, -73.60]],
    maxBoundsViscosity: 0.85,
    zoomControl: false
  }).setView([4.67, -74.10], 11);

  window.mapaActual = mapa;

  // Control de Zoom superior derecho
  L.control.zoom({ position: 'topright' }).addTo(mapa);

  // 2. Capas Cartográficas Reales Oficiales (Esri ArcGIS Online - 100% Libres de API Key y sin marcas de agua)
  
  // A) Capa Oscura OTech (Esri World Dark Gray Base + Labels Reference)
  const esriDarkBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    attribution: 'Esri, HERE, Garmin, &copy; OpenStreetMap · OTech AirNet'
  });
  const esriDarkRef = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    pane: 'overlayPane',
    opacity: 0.95
  });
  const capaOscuraOTech = L.layerGroup([esriDarkBase, esriDarkRef]);

  // B) Capa Satélite Real HD (Esri World Imagery)
  const capaSateliteHD = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics · OTech GIS'
  });

  // C) Capa Calles & Malla Vial Diurna (Esri World Street Map)
  const capaCallesVial = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Esri, DeLorme, NAVTEQ, USGS, Intermap &copy; OpenStreetMap'
  });

  // Activar la capa oscura por defecto (Cero marcas de agua, Cero API key)
  capaOscuraOTech.addTo(mapa);

  // 3. Capas Superpuestas (Overlays)
  // A) Localidades IDECA / CAR (El SVG vectorial original de Bogotá integrado como capa cartográfica transparente)
  const capaLocalidadesSVG = L.imageOverlay('bogota-base.svg', [[4.42, -74.43], [5.0, -73.83]], {
    opacity: 0.40,
    alt: 'Límites de Localidades Bogotá (IDECA / CAR)',
    interactive: false
  });

  // B) Capa de Plumas de Dispersión / Buffer de Calidad del Aire (AQI Heat Buffer)
  const capaPlumas = L.layerGroup();

  // C) Capa de Marcadores de Estaciones
  const capaMarcadores = L.layerGroup();

  // Añadir capas superpuestas iniciales
  capaLocalidadesSVG.addTo(mapa);
  capaPlumas.addTo(mapa);
  capaMarcadores.addTo(mapa);

  // 4. Selector de Capas (Layer Switcher Control)
  const capasBase = {
    "🌙 Oscuro OTech (Sin marcas)": capaOscuraOTech,
    "🛰️ Satélite Real HD": capaSateliteHD,
    "🗺️ Calles & Malla Vial": capaCallesVial
  };

  const capasSuperpuestas = {
    "🏛️ Localidades IDECA / CAR": capaLocalidadesSVG,
    "🔥 Pluma de Dispersión AQI": capaPlumas,
    "📍 Estaciones IoT": capaMarcadores
  };

  L.control.layers(capasBase, capasSuperpuestas, { position: 'topright', collapsed: true }).addTo(mapa);

  // 5. Barra de Herramientas Flotante en el Mapa (Buscador, Centrar, Leyenda)
  const toolbarControl = L.control({ position: 'topleft' });
  toolbarControl.onAdd = function() {
    const div = L.DomUtil.create('div', 'leaflet-bar otech-map-toolbar');
    div.innerHTML = `
      <div class="map-quick-tools">
        <button id="btn-map-recenter" class="tool-btn" title="Centrar Bogotá y Sabana"><i class="tool-icon">🎯</i> Centrar</button>
        <button id="btn-map-fitall" class="tool-btn" title="Ajustar a todas las estaciones"><i class="tool-icon">🔍</i> Estaciones</button>
        <select id="map-station-jump" class="tool-select" title="Saltar directamente a una estación">
          <option value="">📍 Seleccionar estación...</option>
          ${estaciones.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}
        </select>
      </div>
    `;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  toolbarControl.addTo(mapa);

  // 6. Leyenda Flotante de Índices de Calidad del Aire (ICA)
  const legendControl = L.control({ position: 'bottomright' });
  legendControl.onAdd = function() {
    const div = L.DomUtil.create('div', 'otech-map-legend');
    div.innerHTML = `
      <div class="legend-header">
        <span class="legend-title">Índice Calidad del Aire (ICA)</span>
        <span class="legend-subtitle">Res. 2254/2017 &bull; PM2.5</span>
      </div>
      <div class="legend-scale">
        <div class="legend-step"><span class="step-dot" style="background:#10b981"></span> 0 - 12 <small>Buena</small></div>
        <div class="legend-step"><span class="step-dot" style="background:#eab308"></span> 12.1 - 35.4 <small>Aceptable</small></div>
        <div class="legend-step"><span class="step-dot" style="background:#f97316"></span> 35.5 - 55.4 <small>Sensible</small></div>
        <div class="legend-step"><span class="step-dot" style="background:#ef4444"></span> 55.5 - 150 <small>Dañina</small></div>
        <div class="legend-step"><span class="step-dot" style="background:#8b5cf6"></span> &gt; 150 <small>Peligrosa</small></div>
      </div>
    `;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  legendControl.addTo(mapa);

  // 7. Generación Dinámica de Marcadores y Plumas de Dispersión
  const selector = document.getElementById('indicador');
  const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
  const markersRef = [];

  function actualizarMapa() {
    capaMarcadores.clearLayers();
    capaPlumas.clearLayers();
    markersRef.length = 0;

    const varSeleccionada = selector ? selector.value : 'pm25';
    const unidad = unidades[varSeleccionada] || '';
    const etiquetaVar = selector ? selector.selectedOptions[0].text : 'PM2.5';

    estaciones.forEach(estacion => {
      const valor = estacion[varSeleccionada];
      const aqi = getAQIInfo(varSeleccionada, valor);
      const valStr = (valor == null || isNaN(valor)) ? '—' : formato.format(valor);

      // Pluma de Dispersión / Buffer Geoespacial
      if (valor != null && !isNaN(valor)) {
        const radius = varSeleccionada === 'pm25' ? Math.min(3500, Math.max(1200, valor * 45)) : 1800;
        const circle = L.circle(estacion.posicion, {
          radius: radius,
          color: aqi.color,
          weight: 1.5,
          opacity: 0.7,
          fillColor: aqi.color,
          fillOpacity: 0.18
        });
        capaPlumas.addLayer(circle);
      }

      // Marcador Personalizado con Glow, Pulso y Badge Numérico
      const pinHtml = `
        <div class="otech-pin-wrapper" data-id="${estacion.id}">
          <div class="pin-radar" style="background:${aqi.color}; box-shadow: 0 0 16px ${aqi.color}"></div>
          <div class="pin-card" style="border-color:${aqi.color}">
            <div class="pin-header">
              <span class="pin-dot" style="background:${aqi.color}"></span>
              <span class="pin-name">${estacion.nombre.split(' - ')[0]}</span>
            </div>
            <div class="pin-value-row">
              <span class="pin-number" style="color:${aqi.texto}">${valStr}</span>
              <span class="pin-unit">${unidad}</span>
            </div>
          </div>
          <div class="pin-pointer" style="border-top-color:${aqi.color}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'otech-custom-div-icon',
        html: pinHtml,
        iconSize: [120, 56],
        iconAnchor: [60, 56],
        popupAnchor: [0, -60]
      });

      // Contenido del Popup Enriquecido (Card Flyout)
      const popupContent = `
        <div class="otech-popup-card">
          <div class="popup-head">
            <div class="popup-title-group">
              <span class="popup-badge" style="background:${aqi.bg}; color:${aqi.texto}; border: 1px solid ${aqi.color}">
                ● ${aqi.etiqueta.toUpperCase()}
              </span>
              <h4 class="popup-title">${estacion.nombre}</h4>
              <span class="popup-serial">${estacion.id} &bull; Sede OTech</span>
            </div>
          </div>

          <div class="popup-metrics-grid">
            <div class="metric-box ${varSeleccionada === 'pm25' ? 'active-metric' : ''}">
              <span class="m-label">PM2.5</span>
              <span class="m-val" style="color:${getAQIInfo('pm25', estacion.pm25).texto}">
                ${estacion.pm25 != null ? formato.format(estacion.pm25) : '—'} <small>µg/m³</small>
              </span>
            </div>
            <div class="metric-box ${varSeleccionada === 'pm10' ? 'active-metric' : ''}">
              <span class="m-label">PM10</span>
              <span class="m-val" style="color:${getAQIInfo('pm10', estacion.pm10).texto}">
                ${estacion.pm10 != null ? formato.format(estacion.pm10) : '—'} <small>µg/m³</small>
              </span>
            </div>
            <div class="metric-box ${varSeleccionada === 'hr' ? 'active-metric' : ''}">
              <span class="m-label">Humedad</span>
              <span class="m-val" style="color:#67e8f9">
                ${estacion.hr != null ? formato.format(estacion.hr) : '—'} <small>%</small>
              </span>
            </div>
            <div class="metric-box ${varSeleccionada === 'temp' ? 'active-metric' : ''}">
              <span class="m-label">Temp.</span>
              <span class="m-val" style="color:#34d399">
                ${estacion.temp != null ? formato.format(estacion.temp) : '—'} <small>°C</small>
              </span>
            </div>
          </div>

          <div class="popup-advisory">
            <i class="advisory-icon">💡</i>
            <span>${aqi.advisory}</span>
          </div>

          <div class="popup-footer">
            <span class="popup-geo">Coord: ${estacion.posicion[0].toFixed(3)}°N, ${Math.abs(estacion.posicion[1]).toFixed(3)}°W</span>
            ${typeof window.switchTab === 'function' ? `
              <button class="popup-btn-action" onclick="window.verEstacionEnSerie('${estacion.id}')">
                Ver Serie &rarr;
              </button>
            ` : ''}
          </div>
        </div>
      `;

      const marcador = L.marker(estacion.posicion, {
        icon: customIcon,
        title: `${estacion.nombre} (${valStr} ${unidad})`
      }).bindPopup(popupContent, { maxWidth: 320, minWidth: 260, className: 'otech-leaflet-popup' });

      capaMarcadores.addLayer(marcador);
      markersRef.push({ id: estacion.id, marker: marcador, pos: estacion.posicion });
    });
  }

  // 8. Eventos de Control de la Barra de Herramientas
  setTimeout(() => {
    const btnRecenter = document.getElementById('btn-map-recenter');
    if (btnRecenter) {
      btnRecenter.onclick = () => {
        mapa.flyTo([4.67, -74.10], 11, { duration: 1.2 });
      };
    }

    const btnFitAll = document.getElementById('btn-map-fitall');
    if (btnFitAll) {
      btnFitAll.onclick = () => {
        if (estaciones.length > 0) {
          const bounds = L.latLngBounds(estaciones.map(e => e.posicion));
          mapa.flyToBounds(bounds, { padding: [50, 50], maxZoom: 13, duration: 1.2 });
        }
      };
    }

    const selectJump = document.getElementById('map-station-jump');
    if (selectJump) {
      selectJump.onchange = (e) => {
        const targetId = e.target.value;
        if (!targetId) return;
        const found = markersRef.find(m => m.id === targetId);
        if (found) {
          mapa.flyTo(found.pos, 14, { duration: 1.2 });
          found.marker.openPopup();
        }
      };
    }
  }, 100);

  // Helper global para saltar a serie histórica desde el popup
  window.verEstacionEnSerie = function(serial) {
    if (typeof window.switchTab === 'function') {
      window.switchTab('tab-estadisticas');
      const sel = document.getElementById('equipo-serie');
      if (sel) {
        sel.value = serial;
        sel.dispatchEvent(new Event('change'));
      }
    }
  };

  // 9. Manejador de Cambio de Indicador
  if (selector) {
    selector.addEventListener('change', actualizarMapa);
  }

  // 10. Ajuste Automático de Tamaño (Responsive Resize Observer)
  let encuadrado = false;
  function ajustarMapa() {
    const c = mapa.getContainer();
    if (!c || !c.clientHeight || !c.clientWidth) return;
    mapa.invalidateSize();
    if (!encuadrado) {
      const limites = L.latLngBounds(estaciones.map(e => e.posicion));
      if (limites.isValid()) {
        mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 12 });
      } else {
        mapa.setView([4.67, -74.10], 11);
      }
      encuadrado = true;
    }
  }

  ajustarMapa();
  const observer = new ResizeObserver(ajustarMapa);
  observer.observe(contenedor);

  // Primera ejecución de renderizado
  actualizarMapa();

  // Función de Cierre / Limpieza
  return () => {
    observer.disconnect();
    if (selector) selector.removeEventListener('change', actualizarMapa);
    try { mapa.remove(); } catch (e) {}
  };
}

// Inicialización Automática en la página independiente (mapa-estaciones.html)
if (!document.getElementById('portal')) {
  if (window.L) {
    window.addEventListener('DOMContentLoaded', () => iniciarMapa(estacionesDemo));
  } else {
    const elMap = document.getElementById('map');
    if (elMap) elMap.textContent = 'Cargando motor geoespacial Leaflet...';
  }
}
