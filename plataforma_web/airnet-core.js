/**
 * OTech AirNet - Núcleo Metrológico, Algoritmo Kappa-Köhler y Catálogo Canónico IoT.
 * Compatible con navegador (window.OTechCore) y Node.js (module.exports) para pruebas.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.OTechCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Aplica compensación higroscópica Kappa-Köhler sobre lecturas ópticas de PM
   * cuando la humedad relativa supera el 75% (RF-02 / RF-09).
   */
  function aplicarKappaKohler(pmCrudo, hr, kappa = 0.25) {
    if (pmCrudo == null || Number.isNaN(Number(pmCrudo))) return null;
    const raw = Number(pmCrudo);
    if (hr == null || Number.isNaN(Number(hr)) || Number(hr) <= 75) {
      return +raw.toFixed(1);
    }
    const aw = Math.min(0.95, Math.max(0.751, Number(hr) / 100));
    const factorHigroscopico = 1 + kappa * ((aw - 0.75) / (1 - aw));
    return +Math.max(0.5, raw / factorHigroscopico).toFixed(1);
  }

  /**
   * Calcula el Índice de Calidad del Aire (AQI/ICA) lineal por tramos según EPA / Res. 2254.
   */
  function calcularAQI_PM25(pm25) {
    if (pm25 == null || Number.isNaN(Number(pm25)) || pm25 < 0) return null;
    const c = Math.floor(Number(pm25) * 10) / 10;
    const tramos = [
      [0.0, 12.0, 0, 50],
      [12.1, 35.4, 51, 100],
      [35.5, 55.4, 101, 150],
      [55.5, 150.4, 151, 200],
      [150.5, 250.4, 201, 300],
      [250.5, 500.4, 301, 500]
    ];
    for (const [cLow, cHigh, iLow, iHigh] of tramos) {
      if (c <= cHigh) {
        return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow);
      }
    }
    return 500;
  }

  /**
   * Clasificación cromática y normativa (ICA Bogotá / Res. 2254/2017 & EPA).
   */
  function getAQIInfo(variable, valor) {
    if (valor == null || Number.isNaN(Number(valor))) {
      return { color: '#64748b', bg: 'rgba(100,116,139,0.2)', texto: '#94a3b8', etiqueta: 'Sin Datos', clase: 'aqi-nodata', nivel: 'N/A', advisory: 'Sin medición disponible en este momento.' };
    }
    const v = Number(valor);
    if (variable === 'pm25') {
      if (v <= 12.0) return { color: '#10b981', bg: 'rgba(16,185,129,0.25)', texto: '#34d399', etiqueta: 'Buena', clase: 'aqi-good', nivel: 'Bajo Riesgo', advisory: 'Calidad del aire óptima para toda la población.' };
      if (v <= 35.4) return { color: '#eab308', bg: 'rgba(234,179,8,0.25)', texto: '#fde047', etiqueta: 'Aceptable / Moderada', clase: 'aqi-moderate', nivel: 'Riesgo Moderado', advisory: 'Calidad del aire aceptable. Personas sensibles deben limitar esfuerzo exterior prolongado.' };
      if (v <= 55.4) return { color: '#f97316', bg: 'rgba(249,115,22,0.25)', texto: '#fdba74', etiqueta: 'Dañina (Grupos Sensibles)', clase: 'aqi-sensitive', nivel: 'Alerta Preventiva', advisory: 'Niños, adultos mayores y personas con asma deben reducir actividades al aire libre.' };
      if (v <= 150.4) return { color: '#ef4444', bg: 'rgba(239,68,68,0.25)', texto: '#fca5a5', etiqueta: 'Dañina a la Salud', clase: 'aqi-unhealthy', nivel: 'Alerta Naranja', advisory: 'Efectos en la salud de toda la población. Suspender actividades físicas en exteriores.' };
      return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.25)', texto: '#d8b4fe', etiqueta: 'Peligrosa / Emergencia', clase: 'aqi-hazardous', nivel: 'Alerta Roja', advisory: 'Condición de emergencia ambiental. Permanecer en recintos con ventilación filtrada.' };
    }
    if (variable === 'pm10') {
      if (v <= 54) return { color: '#10b981', bg: 'rgba(16,185,129,0.25)', texto: '#34d399', etiqueta: 'Buena', clase: 'aqi-good', nivel: 'Bajo', advisory: 'Material particulado grueso dentro del rango seguro.' };
      if (v <= 154) return { color: '#eab308', bg: 'rgba(234,179,8,0.25)', texto: '#fde047', etiqueta: 'Aceptable', clase: 'aqi-moderate', nivel: 'Moderado', advisory: 'Concentración regular en áreas urbanas e industriales.' };
      if (v <= 254) return { color: '#f97316', bg: 'rgba(249,115,22,0.25)', texto: '#fdba74', etiqueta: 'Alerta Amarilla', clase: 'aqi-sensitive', nivel: 'Sensible', advisory: 'Concentración elevada de polvo y emisiones vehiculares.' };
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.25)', texto: '#fca5a5', etiqueta: 'Alerta Naranja', clase: 'aqi-unhealthy', nivel: 'Alto', advisory: 'Superación de límites permisibles de calidad del aire.' };
    }
    if (variable === 'hr') {
      if (v < 40) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.25)', texto: '#fbbf24', etiqueta: 'Ambiente Seco', clase: 'aqi-moderate', nivel: 'Baja Humedad', advisory: 'Condición seca en la sabana, favorable a la dispersión de polvo.' };
      if (v <= 75) return { color: '#06b6d4', bg: 'rgba(6,182,212,0.25)', texto: '#67e8f9', etiqueta: 'Humedad Confort', clase: 'aqi-good', nivel: 'Óptimo', advisory: 'Humedad relativa en rango normal de confort ambiental.' };
      return { color: '#3b82f6', bg: 'rgba(59,130,246,0.25)', texto: '#93c5fd', etiqueta: 'Compensación κ-Köhler', clase: 'aqi-sensitive', nivel: 'Alta Humedad (>75%)', advisory: 'Compensación higroscópica activa: corrección matemática del crecimiento por vapor de agua.' };
    }
    if (variable === 'temp') {
      if (v < 14) return { color: '#38bdf8', bg: 'rgba(56,189,248,0.25)', texto: '#7dd3fc', etiqueta: 'Frío Sabana', clase: 'aqi-moderate', nivel: 'Baja Temp.', advisory: 'Temperatura fresca característica de la sabana de Bogotá.' };
      if (v <= 22) return { color: '#10b981', bg: 'rgba(16,185,129,0.25)', texto: '#34d399', etiqueta: 'Templado Confort', clase: 'aqi-good', nivel: 'Óptimo', advisory: 'Temperatura en rango ideal de operación metrológica.' };
      return { color: '#f59e0b', bg: 'rgba(245,158,11,0.25)', texto: '#fbbf24', etiqueta: 'Cálido Urbano', clase: 'aqi-sensitive', nivel: 'Cálido', advisory: 'Isla de calor urbano o radiación solar intensa.' };
    }
    return { color: '#14b8a6', bg: 'rgba(20,184,166,0.25)', texto: '#5eead4', etiqueta: 'Medición Normal', clase: 'aqi-good', nivel: 'Estable', advisory: 'Lectura dentro de los parámetros de calibración.' };
  }

  function construirHardwareBase(serial, devEuiSuffix, lote) {
    return {
      chip_id: `ATECC608A-${serial}`,
      modelo: 'OTech-AirNet-Outdoor-IP65-v2.4',
      firmware: 'OTech-OS v2.4.3-ESP32S3',
      soporte: 'Mástil Galvanizado + Escudo Stevenson 6 Anillos',
      voltaje: 3.32,
      comunicacion: {
        tecnologia: 'LoRaWAN US915 + Backup 4G LTE-M',
        deveui: `70B3D57ED006${devEuiSuffix}`,
        muestreo_seg: 60
      },
      sensores: [
        { modelo: 'Sensirion SPS30 Laser', variable: 'PM2_5 / PM10', estado: 'OPERATIVO', cero: 0.0, span: 1.0, r2: 0.9942 },
        { modelo: 'Bosch BME680 Digital', variable: 'HUM / TEMP', estado: 'OPERATIVO', cero: 0.0, span: 1.0, r2: 0.9985 },
        { modelo: 'Sensirion SCD41 NDIR', variable: 'CO2', estado: 'OPERATIVO', cero: 0.0, span: 1.0, r2: 0.9918 }
      ],
      manufactura: {
        lote,
        ip65: true,
        camara_gas: true,
        burn_in_48h: true,
        operador: 'Celda Lean OTech #04'
      }
    };
  }

  const ESTACIONES_BASE_OTECH = [
    { serial: 'OT-CORF-01', sede: 'Corferias - Pabellón Innovación', lat: 4.630, lon: -74.091, estado: 'OPERATIVO_ONLINE', bateria: 98, base: { pm25: 12.3, pm10: 24.1, hum: 68.2, temp: 18.4 }, ...construirHardwareBase('OT-CORF-01', 'A101', 'LOTE-2026-08A') },
    { serial: 'OT-INDU-02', sede: 'Zona Franca - Parque Industrial', lat: 4.677, lon: -74.161, estado: 'ADVERTENCIA_MODERADA', bateria: 92, base: { pm25: 36.8, pm10: 55.6, hum: 79.5, temp: 17.1 }, ...construirHardwareBase('OT-INDU-02', 'B202', 'LOTE-2026-08A') },
    { serial: 'OT-AERO-03', sede: 'Terminal Carga - El Dorado', lat: 4.701, lon: -74.146, estado: 'OPERATIVO_ONLINE', bateria: 100, base: { pm25: 10.9, pm10: 21.4, hum: 65.0, temp: 19.0 }, ...construirHardwareBase('OT-AERO-03', 'C303', 'LOTE-2026-08B') },
    { serial: 'OT-MOVI-04', sede: 'Portal Sur - TransMilenio Autopista', lat: 4.596, lon: -74.170, estado: 'ALERTA_CRITICA', bateria: 85, base: { pm25: 58.2, pm10: 83.5, hum: 62.1, temp: 21.0 }, ...construirHardwareBase('OT-MOVI-04', 'D404', 'LOTE-2026-09A') },
    { serial: 'OT-ALPI-05', sede: 'Sopó - Cuenca Sabana Norte', lat: 4.909, lon: -73.943, estado: 'OPERATIVO_ONLINE', bateria: 95, base: { pm25: 8.4, pm10: 16.2, hum: 65.0, temp: 19.0 }, ...construirHardwareBase('OT-ALPI-05', 'E505', 'LOTE-2026-09A') },
    { serial: 'OT-SUBA-06', sede: 'Suba - Reserva Humedal La Conejera', lat: 4.756, lon: -74.098, estado: 'OPERATIVO_ONLINE', bateria: 94, base: { pm25: 9.8, pm10: 18.5, hum: 78.4, temp: 16.5 }, ...construirHardwareBase('OT-SUBA-06', 'F606', 'LOTE-2026-09B') },
    { serial: 'OT-CHIA-07', sede: 'Chía - Corredor Central del Norte', lat: 4.862, lon: -74.053, estado: 'OPERATIVO_ONLINE', bateria: 91, base: { pm25: 14.1, pm10: 27.6, hum: 64.3, temp: 18.2 }, ...construirHardwareBase('OT-CHIA-07', 'G707', 'LOTE-2026-10A') },
    { serial: 'OT-USAQ-08', sede: 'Usaquén - Centro Empresarial Santa Bárbara', lat: 4.693, lon: -74.032, estado: 'OPERATIVO_ONLINE', bateria: 97, base: { pm25: 15.6, pm10: 31.0, hum: 66.8, temp: 17.8 }, ...construirHardwareBase('OT-USAQ-08', 'H808', 'LOTE-2026-10B') }
  ];

  function evaluarRegla(valor, operador, umbral) {
    const val = Number(valor);
    const lim = Number(umbral);
    if (Number.isNaN(val) || Number.isNaN(lim)) return false;
    switch (operador) {
      case '>': return val > lim;
      case '>=': return val >= lim;
      case '<': return val < lim;
      case '<=': return val <= lim;
      default: return val > lim;
    }
  }

  async function computarHashSHA256(texto) {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    if (typeof require === 'function') {
      return require('crypto').createHash('sha256').update(texto, 'utf8').digest('hex');
    }
    throw new Error('Crypto SHA-256 no disponible en este entorno.');
  }

  function proyectarTendencia24h(valores, pasos) {
    const nums = (Array.isArray(valores) ? valores : [])
      .map(v => Number(v))
      .filter(v => !Number.isNaN(v));
    if (!nums.length) return [];
    const ventana = nums.slice(-6);
    const ultimo = ventana[ventana.length - 1];
    let sumaPesos = 0;
    let pendiente = 0;
    for (let i = 1; i < ventana.length; i++) {
      const peso = i;
      pendiente += (ventana[i] - ventana[i - 1]) * peso;
      sumaPesos += peso;
    }
    const delta = sumaPesos > 0 ? (pendiente / sumaPesos) * 0.45 : 0;
    const totalPasos = Math.max(1, Number(pasos) || 6);
    const salida = [];
    for (let k = 1; k <= totalPasos; k++) {
      const amortiguado = Math.max(2, ultimo + delta * k * Math.pow(0.9, k - 1));
      salida.push(Number(amortiguado.toFixed(1)));
    }
    return salida;
  }

  function detectarAnomaliasRed(estaciones) {
    if (!Array.isArray(estaciones) || !estaciones.length) return [];
    const pm25Vals = estaciones
      .map(e => Number(e?.lecturas?.PM2_5 ?? e?.base?.pm25))
      .filter(v => !Number.isNaN(v))
      .sort((a, b) => a - b);
    const mid = Math.floor(pm25Vals.length / 2);
    const mediana = pm25Vals.length
      ? (pm25Vals.length % 2 !== 0 ? pm25Vals[mid] : (pm25Vals[mid - 1] + pm25Vals[mid]) / 2)
      : 15;

    const hallazgos = [];
    for (const est of estaciones) {
      const pm = Number(est?.lecturas?.PM2_5 ?? est?.base?.pm25);
      const bat = Number(est?.bateria ?? 100);
      if (bat < 88) {
        hallazgos.push({
          serial: est.serial,
          sede: est.sede,
          tipo: 'BATERIA_BAJA',
          severidad: 'PREVENTIVO',
          mensaje: `Batería en ${bat}% (< 88%). Revisar controlador MPPT / LiFePO4.`
        });
      }
      if (!Number.isNaN(pm) && mediana > 0 && pm > mediana * 2.4 && est.estado !== 'ALERTA_CRITICA') {
        hallazgos.push({
          serial: est.serial,
          sede: est.sede,
          tipo: 'POSIBLE_DERIVA_OPTICA',
          severidad: 'PREVENTIVO',
          mensaje: `PM2.5 (${pm.toFixed(1)} µg/m³) supera 2.4x la mediana de red (${mediana.toFixed(1)}). Sugerida limpieza de cámara óptica.`
        });
      }
    }
    return hallazgos;
  }

  return {
    aplicarKappaKohler,
    calcularAQI_PM25,
    getAQIInfo,
    ESTACIONES_BASE_OTECH,
    evaluarRegla,
    computarHashSHA256,
    proyectarTendencia24h,
    detectarAnomaliasRed
  };
});

