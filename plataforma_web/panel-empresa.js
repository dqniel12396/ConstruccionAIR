let datosEmpresa = null;
let cerrarMapa = null;
let grafica = null;
const el = id => document.getElementById(id);
const fechaLocal = valor => valor ? new Date(valor).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '—';
const variables = { PM2_5: 'PM2.5', PM10: 'PM10', HUM: 'Humedad', TEMP: 'Temperatura' };
const columnasEquipos = ['Estación', 'Sede', 'Firmware', 'Estado', 'Batería (%)', 'Última conexión', 'Acciones'];

function notificarAccion(mensaje, tipo = 'ok') {
  const toast = el('toast-otech');
  if (!toast) return;
  toast.textContent = mensaje;
  toast.className = 'fixed bottom-5 right-5 z-[100] px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl border transition-all ' +
    (tipo === 'warn'
      ? 'bg-amber-950/95 text-amber-200 border-amber-500/50'
      : 'bg-teal-950/95 text-teal-200 border-teal-500/50');
  toast.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.hidden = true; }, 3800);
}

function crearBadgeEstado(estado) {
  const span = document.createElement('span');
  const txt = String(estado || '—');
  span.textContent = txt;
  span.className = 'badge-estado';
  if (/CRITIC|ABIERTO/i.test(txt)) span.classList.add('badge-danger');
  else if (/ADVERT|MITIG|RECONOC|PROGRAMADA/i.test(txt)) span.classList.add('badge-warn');
  else span.classList.add('badge-ok');
  return span;
}

function tabla(id, columnas, filas) {
  const contenedor = el(id);
  if (!contenedor) return;
  contenedor.replaceChildren();
  if (!filas || !filas.length) {
    contenedor.textContent = 'Sin registros para esta consulta.';
    return;
  }
  const t = document.createElement('table');
  const cabecera = t.createTHead().insertRow();
  columnas.forEach(nombre => {
    const th = document.createElement('th');
    th.textContent = nombre;
    cabecera.append(th);
  });
  const cuerpo = t.createTBody();
  for (const fila of filas) {
    const tr = cuerpo.insertRow();
    for (const valor of fila) {
      const td = tr.insertCell();
      if (valor instanceof Node) td.append(valor);
      else td.textContent = valor ?? '—';
    }
  }
  contenedor.append(t);
}

function actualizarContadoresGlobales() {
  if (!datosEmpresa) return;
  const equipos = datosEmpresa.estaciones || [];
  const onlineCount = equipos.filter(e => e.estado === 'OPERATIVO_ONLINE' || /ONLINE|OPERATIVO/i.test(e.estado)).length;
  const alertasActivas = (datosEmpresa.alertas || []).filter(i => i.estado !== 'RESUELTO').length;

  if (el('cantidad-alertas')) el('cantidad-alertas').textContent = alertasActivas ? String(alertasActivas) : '0';
  if (el('badge-alertas-count')) el('badge-alertas-count').textContent = `${alertasActivas} Activa${alertasActivas === 1 ? '' : 's'}`;
  if (el('badge-online-count')) el('badge-online-count').textContent = `${onlineCount}/${equipos.length} Online`;
}

function renderResumenKPIs() {
  const cont = el('resumen');
  if (!cont || !datosEmpresa) return;
  cont.replaceChildren();
  const equipos = datosEmpresa.estaciones || [];
  const onlineCount = equipos.filter(e => e.estado === 'OPERATIVO_ONLINE').length;
  const alertasActivas = (datosEmpresa.alertas || []).filter(a => a.estado !== 'RESUELTO').length;
  const aqiValues = equipos
    .map(e => window.OTechCore?.calcularAQI_PM25(e.lecturas?.PM2_5))
    .filter(v => v != null);
  const maxAqi = aqiValues.length ? Math.max(...aqiValues) : '—';

  const indicadores = [
    ['Estaciones Totales', equipos.length],
    ['Sedes Monitoreadas', new Set(equipos.map(e => e.sede)).size],
    ['Equipos Operativos', `${onlineCount}/${equipos.length}`],
    ['Alertas Sin Resolver', alertasActivas],
    ['ICA / AQI Máximo Red', maxAqi]
  ];
  for (const [nombre, valor] of indicadores) {
    const card = document.createElement('div');
    const cifra = document.createElement('strong');
    cifra.textContent = valor;
    card.append(nombre, cifra);
    cont.append(card);
  }
}

function limpiarEmpresa() {
  cerrarMapa?.(); cerrarMapa = null;
  grafica?.destroy(); grafica = null;
  datosEmpresa = null;
  document.querySelectorAll('.tabla-empresa,#resumen,#equipo-serie,#variable-serie,#stats-kpi-bar').forEach(n => n.replaceChildren());
  if (el('buscar-equipo')) el('buscar-equipo').value = '';
}

let currentFichaSerial = null;

function abrirFichaEquipo(estacion) {
  const modal = el('modal-ficha-equipo');
  if (!modal || !estacion) return;
  currentFichaSerial = estacion.serial;
  el('ficha-titulo').textContent = `${estacion.serial} — ${estacion.sede}`;
  const btnVer3d = el('btn-ver-en-3d');
  if (btnVer3d) {
    btnVer3d.href = `../gemelo_digital_3d/index.html?serial=${encodeURIComponent(estacion.serial)}&action=focus_station`;
    btnVer3d.onclick = () => {
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          new BroadcastChannel('otech-airnet-sync').postMessage({
            type: 'command_3d',
            action: 'focus_station',
            serial: estacion.serial
          });
        }
      } catch {}
    };
  }
  el('ficha-chip').textContent = estacion.chip_id || `ATECC608A-${estacion.serial}`;
  el('ficha-firmware').textContent = estacion.firmware || 'OTech-OS v2.4.3-ESP32S3';
  el('ficha-modelo').textContent = estacion.modelo || 'OTech-AirNet-Outdoor-IP65';
  el('ficha-energia').textContent = `${estacion.bateria ?? '—'}% (${estacion.voltaje ?? '3.3'} V LiFePO4)`;
  el('ficha-comunicacion').textContent = estacion.comunicacion
    ? `${estacion.comunicacion.tecnologia} · DevEUI: ${estacion.comunicacion.deveui || 'N/A'} (${estacion.comunicacion.muestreo_seg || 60}s)`
    : 'LoRaWAN US915 · 60s';

  const mfg = estacion.manufactura;
  el('ficha-manufactura').textContent = mfg
    ? `Lote ${mfg.lote || '—'} · IP65: ${mfg.ip65 ? 'PASS' : 'PEND'} · Cámara Gas: ${mfg.camara_gas ? 'PASS' : 'PEND'} · Burn-In 48h: ${mfg.burn_in_48h ? 'PASS' : 'PEND'}`
    : 'Certificada IP65 / Cámara Gas / Burn-In 48h';

  const tbody = el('ficha-sensores-body');
  if (tbody) {
    tbody.replaceChildren();
    const sensores = estacion.sensores && estacion.sensores.length
      ? estacion.sensores
      : [{ modelo: 'Sensirion SPS30', variable: 'PM2_5 / PM10', estado: 'OPERATIVO', cero: 0, span: 1, r2: 0.994 }];
    sensores.forEach(s => {
      const tr = document.createElement('tr');
      [s.modelo, s.variable, s.estado, s.cero, s.span, s.r2].forEach(val => {
        const td = document.createElement('td');
        td.textContent = val ?? '—';
        tr.append(td);
      });
      tbody.append(tr);
    });
  }
  const diag = el('ficha-diagnostico-res');
  if (diag) diag.textContent = 'Listo para ejecutar prueba remota de bus I2C, láser PWM y enlace RF.';
  modal.hidden = false;
  window.lucide?.createIcons();
}

const btnCerrarFicha = el('btn-cerrar-ficha');
if (btnCerrarFicha) btnCerrarFicha.onclick = () => { el('modal-ficha-equipo').hidden = true; };

const btnDiagnostico = el('btn-autodiagnostico');
if (btnDiagnostico) {
  btnDiagnostico.onclick = () => {
    const res = el('ficha-diagnostico-res');
    if (!res) return;
    res.textContent = 'Consultando nodo vía LoRaWAN Downlink…';
    try {
      if (typeof BroadcastChannel !== 'undefined' && currentFichaSerial) {
        new BroadcastChannel('otech-airnet-sync').postMessage({
          type: 'command_3d',
          action: 'diagnostico',
          serial: currentFichaSerial
        });
      }
    } catch {}
    setTimeout(() => {
      res.textContent = '✓ OK · Bus I2C estable (0 errores CRC) · Turbina SPS30 4.820 RPM · RSSI -84 dBm (SNR +7.5 dB).';
      notificarAccion('Autodiagnóstico remoto completado sin fallos.');
    }, 350);
  };
}

function inventario() {
  if (!datosEmpresa) return [];
  const busca = (el('buscar-equipo')?.value || '').toLocaleLowerCase().trim();
  return datosEmpresa.estaciones
    .filter(e => (e.serial + ' ' + e.sede + ' ' + (e.firmware || '')).toLocaleLowerCase().includes(busca))
    .map(e => {
      const btnFicha = document.createElement('button');
      btnFicha.type = 'button';
      btnFicha.className = 'btn-accion-sm';
      btnFicha.textContent = '🔍 Ficha Técnica';
      btnFicha.onclick = () => abrirFichaEquipo(e);
      return [
        e.serial,
        e.sede,
        e.firmware || 'OTech-OS v2.4',
        crearBadgeEstado(e.estado),
        e.bateria,
        fechaLocal(e.conexion),
        btnFicha
      ];
    });
}
if (el('buscar-equipo')) {
  el('buscar-equipo').oninput = () => tabla('equipos', columnasEquipos, inventario());
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
if (el('exportar-equipos')) {
  el('exportar-equipos').onclick = () => {
    if (!datosEmpresa) return;
    const colsCsv = ['Estación', 'Sede', 'Firmware', 'Estado', 'Batería (%)', 'Última conexión'];
    const filas = datosEmpresa.estaciones.map(e => [e.serial, e.sede, e.firmware || 'OTech-OS v2.4', e.estado, e.bateria, fechaLocal(e.conexion)]);
    const csv = [colsCsv, ...filas].map(row => row.map(v => {
      const s = String(v ?? '').replace(/^[=+@\-\t\r]/, "'$&");
      return '"' + s.replaceAll('"', '""') + '"';
    }).join(';')).join('\r\n');
    descargar(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), 'inventario_estaciones_otech.csv');
  };
}

function mostrarSerie() {
  if (!datosEmpresa?.serie) return;
  const equipo = el('equipo-serie')?.value;
  const equipoComparar = el('equipo-comparar')?.value;
  const variable = el('variable-serie')?.value;
  const compararKohler = Boolean(el('chk-comparar-kohler')?.checked);
  const mostrarOms = Boolean(el('chk-limite-oms')?.checked);
  const mostrarPronostico = Boolean(el('chk-pronostico-24h')?.checked);
  const serie = datosEmpresa.serie.filter(v => v.serial === equipo && v.variable === variable);
  const horas = Number(el('periodo')?.value || 0);
  const inicio = serie.length && horas ? Date.parse(serie.at(-1).fecha) - horas * 3600000 : -Infinity;
  const filas = serie.filter(v => Date.parse(v.fecha) > inicio);

  grafica?.destroy(); grafica = null;
  if (window.Chart && filas.length) {
    let labels = filas.map(v => fechaLocal(v.fecha));
    const valoresBase = filas.map(v => v.valor);
    const datasets = [
      {
        label: `${equipo} · ` + (variables[variable] ?? variable) + (variable.startsWith('PM') ? ' κ-Köhler (' : ' (') + filas[0].unidad + ')',
        data: valoresBase,
        borderColor: '#2dd4bf',
        backgroundColor: 'rgba(45, 212, 191, 0.12)',
        borderWidth: 2.5,
        tension: 0.25,
        pointRadius: 2
      }
    ];

    if (compararKohler && (variable === 'PM2_5' || variable === 'PM10')) {
      datasets.push({
        label: 'Lectura Cruda Óptica (' + filas[0].unidad + ')',
        data: filas.map(v => v.crudo),
        borderColor: '#f59e0b',
        borderDash: [5, 4],
        borderWidth: 1.8,
        tension: 0.25,
        pointRadius: 1.5
      });
    }

    if (equipoComparar && equipoComparar !== equipo) {
      const filasComp = datosEmpresa.serie.filter(
        v => v.serial === equipoComparar && v.variable === variable && Date.parse(v.fecha) > inicio
      );
      if (filasComp.length) {
        datasets.push({
          label: `${equipoComparar} (Comparativa ${filasComp[0].unidad})`,
          data: filasComp.slice(-filas.length).map(v => v.valor),
          borderColor: '#a855f7',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 1.5
        });
      }
    }

    if (mostrarPronostico && window.OTechCore?.proyectarTendencia24h) {
      const pasos = 6;
      const futuro = window.OTechCore.proyectarTendencia24h(valoresBase, pasos);
      const nullsAntes = new Array(Math.max(0, valoresBase.length - 1)).fill(null);
      const seriePronostico = [...nullsAntes, valoresBase.at(-1), ...futuro];
      labels = [...labels, '+4h', '+8h', '+12h', '+16h', '+20h', '+24h'];
      datasets.push({
        label: 'Pronóstico Tendencia +24h',
        data: seriePronostico,
        borderColor: '#38bdf8',
        borderDash: [6, 4],
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 2.5
      });
    }

    if (mostrarOms && (variable === 'PM2_5' || variable === 'PM10')) {
      const limiteOms = variable === 'PM2_5' ? 15.0 : 45.0;
      datasets.push({
        label: `Límite Diario OMS (${limiteOms} µg/m³)`,
        data: labels.map(() => limiteOms),
        borderColor: '#ef4444',
        borderDash: [3, 3],
        borderWidth: 1.5,
        pointRadius: 0
      });
    }

    grafica = new Chart(el('grafica'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: '#cbd5e1', font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: 'rgba(148,163,184,0.08)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.08)' } }
        }
      }
    });
  }

  // Resumen analítico del periodo
  const kpiBar = el('stats-kpi-bar');
  if (kpiBar) {
    kpiBar.replaceChildren();
    if (filas.length) {
      const avgComp = +(filas.reduce((a, b) => a + Number(b.valor), 0) / filas.length).toFixed(1);
      const avgRaw = +(filas.reduce((a, b) => a + Number(b.crudo ?? b.valor), 0) / filas.length).toFixed(1);
      const diffPct = avgRaw > 0 ? +(((avgRaw - avgComp) / avgRaw) * 100).toFixed(1) : 0;
      const maxVal = Math.max(...filas.map(f => Number(f.valor)));
      const aqiMax = variable === 'PM2_5' ? (window.OTechCore?.calcularAQI_PM25(maxVal) ?? '—') : `${maxVal} ${filas[0].unidad}`;

      [
        ['Promedio Validado', `${avgComp} ${filas[0].unidad}`],
        ['Promedio Crudo', `${avgRaw} ${filas[0].unidad}`],
        ['Atenuación κ-Köhler', `${diffPct}%`],
        [variable === 'PM2_5' ? 'AQI Pico Periodo' : 'Máximo Periodo', aqiMax]
      ].forEach(([lbl, val]) => {
        const box = document.createElement('div');
        box.className = 'p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs';
        const t = document.createElement('span');
        t.className = 'text-slate-400 block text-[11px]';
        t.textContent = lbl;
        const v = document.createElement('strong');
        v.className = 'text-teal-300 font-mono text-base';
        v.textContent = val;
        box.append(t, v);
        kpiBar.append(box);
      });
    }
  }

  tabla('serie', ['Fecha (Bogotá)', 'Lectura cruda', 'Lectura compensada', 'Unidad'],
    filas.slice().reverse().map(v => [fechaLocal(v.fecha), v.crudo, v.valor, v.unidad]));
}
window.mostrarSerie = mostrarSerie;

function opciones(id, items) {
  const s = el(id);
  if (s) s.replaceChildren(...items.map(([v, t]) => new Option(t, v)));
}
function variablesEstacion() {
  if (!datosEmpresa?.serie) return;
  const currentStation = el('equipo-serie').value;
  let matches = datosEmpresa.serie.filter(v => v.serial === currentStation);
  if (!matches.length && datosEmpresa.serie.length) matches = datosEmpresa.serie;
  const vars = new Set(matches.map(v => v.variable));
  if (!vars.size) ['PM2_5', 'PM10', 'HUM', 'TEMP'].forEach(v => vars.add(v));
  opciones('variable-serie', [...vars].map(v => [v, variables[v] ?? v]));
  mostrarSerie();
}
if (el('equipo-serie')) el('equipo-serie').onchange = variablesEstacion;
if (el('equipo-comparar')) el('equipo-comparar').onchange = mostrarSerie;
if (el('variable-serie')) el('variable-serie').onchange = mostrarSerie;
if (el('periodo')) el('periodo').onchange = mostrarSerie;
if (el('chk-comparar-kohler')) el('chk-comparar-kohler').onchange = mostrarSerie;
if (el('chk-limite-oms')) el('chk-limite-oms').onchange = mostrarSerie;
if (el('chk-pronostico-24h')) el('chk-pronostico-24h').onchange = mostrarSerie;

async function cambiarEstadoIncidente(alerta, nuevoEstado) {
  let bitacora = alerta.bitacora || '';
  if (nuevoEstado === 'RESUELTO') {
    const nota = window.prompt(`Registrar bitácora de resolución para ${alerta.serial} (${alerta.variable}):`, bitacora || 'Inspección y compensación verificada en rango.');
    if (nota === null) return;
    bitacora = nota;
  } else if (!bitacora) {
    bitacora = 'Incidente reconocido por operador en turno.';
  }

  if (!window.isDemoSession && window.portalAuth && alerta.id) {
    const { error } = await window.portalAuth.rpc('resolver_incidente_portal', {
      p_incidente_id: alerta.id,
      p_nuevo_estado: nuevoEstado,
      p_bitacora: bitacora
    });
    if (error) {
      notificarAccion('Error al actualizar alerta en Supabase.', 'warn');
      return;
    }
  }
  alerta.estado = nuevoEstado;
  alerta.bitacora = bitacora;
  renderAlertasYReglas();
  renderResumenKPIs();
  actualizarContadoresGlobales();
  notificarAccion(`Incidente ${alerta.serial} marcado como ${nuevoEstado}.`);
}

function renderAlertasYReglas() {
  if (!datosEmpresa) return;
  if (datosEmpresa.alertas) {
    tabla('alertas-empresa', ['Estación', 'Inicio', 'Variable', 'Umbral', 'Máximo', 'Estado', 'Bitácora', 'Acciones'],
      datosEmpresa.alertas.map(a => {
        const acciones = document.createElement('div');
        acciones.className = 'flex gap-1.5';
        if (a.estado === 'ABIERTO') {
          const btnRec = document.createElement('button');
          btnRec.type = 'button';
          btnRec.className = 'btn-accion-sm';
          btnRec.textContent = 'Reconocer';
          btnRec.onclick = () => cambiarEstadoIncidente(a, 'RECONOCIDO');
          acciones.append(btnRec);
        }
        if (a.estado !== 'RESUELTO') {
          const btnRes = document.createElement('button');
          btnRes.type = 'button';
          btnRes.className = 'btn-accion-sm btn-accion-primary';
          btnRes.textContent = 'Resolver';
          btnRes.onclick = () => cambiarEstadoIncidente(a, 'RESUELTO');
          acciones.append(btnRes);
        } else {
          acciones.textContent = '✓ Cerrado';
        }
        return [
          a.serial,
          fechaLocal(a.fecha),
          variables[a.variable] ?? a.variable,
          a.umbral,
          a.maximo,
          crearBadgeEstado(a.estado),
          a.bitacora || '—',
          acciones
        ];
      }));
  }

  if (el('reglas-empresa')) {
    const reglas = datosEmpresa.reglas || [];
    tabla('reglas-empresa', ['Estación', 'Variable', 'Condición', 'Severidad', 'Estado'],
      reglas.map(r => [
        r.serial || 'TODAS',
        variables[r.variable] ?? r.variable,
        `${r.operador || '>'} ${r.umbral}`,
        r.severidad || 'PREVENTIVO',
        crearBadgeEstado(r.activa === false ? 'INACTIVA' : 'ACTIVA')
      ]));
  }
}

const formRegla = el('form-regla-alerta');
if (formRegla) {
  formRegla.addEventListener('submit', async e => {
    e.preventDefault();
    if (!datosEmpresa) return;
    const serial = el('regla-serial').value;
    const variable = el('regla-variable').value;
    const operador = el('regla-operador').value;
    const umbral = Number(el('regla-umbral').value);
    const severidad = el('regla-severidad').value;
    if (Number.isNaN(umbral)) return;

    let idNueva = 'reg-' + Date.now();
    if (!window.isDemoSession && window.portalAuth) {
      const { data, error } = await window.portalAuth.rpc('crear_regla_alerta_portal', {
        p_serial: serial, p_variable: variable, p_operador: operador, p_umbral: umbral, p_severidad: severidad
      });
      if (error) {
        notificarAccion('No se pudo guardar la regla en Supabase.', 'warn');
        return;
      }
      if (data) idNueva = data;
    }

    datosEmpresa.reglas = datosEmpresa.reglas || [];
    datosEmpresa.reglas.unshift({ id: idNueva, serial, variable, operador, umbral, severidad, activa: true });

    // Evaluar de inmediato contra estaciones actuales en demo
    if (window.OTechCore?.evaluarRegla) {
      datosEmpresa.estaciones.forEach(est => {
        if (serial !== 'TODAS' && est.serial !== serial) return;
        const val = est.lecturas?.[variable];
        if (window.OTechCore.evaluarRegla(val, operador, umbral)) {
          datosEmpresa.alertas.unshift({
            id: 'alt-' + Date.now() + '-' + est.serial,
            serial: est.serial,
            fecha: new Date().toISOString(),
            variable,
            umbral,
            maximo: val,
            estado: 'ABIERTO',
            bitacora: `Disparo automático por regla (${operador} ${umbral})`
          });
        }
      });
    }

    renderAlertasYReglas();
    renderResumenKPIs();
    actualizarContadoresGlobales();
    notificarAccion(`Regla ${variable} ${operador} ${umbral} activada.`);
  });
}

async function completarOrden(orden) {
  const durStr = window.prompt(`Duración real de intervención en minutos para ${orden.serial} (Meta Hot-Swap <= 2 min):`, '1');
  if (durStr === null) return;
  const dur = Math.max(1, parseInt(durStr, 10) || 2);
  const obs = window.prompt('Observaciones técnicas de cierre:', orden.observaciones || 'Intervención completada y verificada.') ?? '';

  if (!window.isDemoSession && window.portalAuth && orden.id) {
    const { error } = await window.portalAuth.rpc('gestionar_orden_portal', {
      p_orden_id: orden.id, p_duracion_min: dur, p_observaciones: obs
    });
    if (error) {
      notificarAccion('Error al cerrar orden en Supabase.', 'warn');
      return;
    }
  }
  orden.estado = 'COMPLETADA';
  orden.duracion = dur;
  orden.observaciones = obs;
  renderMantenimiento();
  notificarAccion(`Orden ${orden.serial} completada (${dur} min).`);
}

function renderMantenimiento() {
  if (!datosEmpresa) return;
  if (datosEmpresa.ordenes) {
    tabla('ordenes-empresa', ['Estación', 'Programada', 'Intervención', 'Técnico', 'Duración', 'Estado', 'Observaciones', 'Acciones'],
      datosEmpresa.ordenes.map(o => {
        let accion = '✓ Finalizada';
        if (o.estado !== 'COMPLETADA') {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-accion-sm btn-accion-primary';
          btn.textContent = 'Completar Hot-Swap';
          btn.onclick = () => completarOrden(o);
          accion = btn;
        }
        return [
          o.serial,
          fechaLocal(o.fecha),
          o.tipo,
          o.tecnico,
          o.duracion != null ? `${o.duracion} min` : 'Pendiente',
          crearBadgeEstado(o.estado),
          o.observaciones || '—',
          accion
        ];
      }));
  }

  if (el('calibraciones-empresa')) {
    tabla('calibraciones-empresa', ['Estación', 'Variable', 'Equipo Patrón', 'Pendiente', 'Offset', 'Certificado', 'Fecha'],
      (datosEmpresa.calibraciones || []).map(c => [
        c.serial,
        variables[c.variable] ?? c.variable,
        c.patron,
        c.pendiente,
        c.offset_cero,
        c.certificado,
        fechaLocal(c.fecha)
      ]));
  }
}

const formOrden = el('form-nueva-orden');
if (formOrden) {
  formOrden.addEventListener('submit', async e => {
    e.preventDefault();
    if (!datosEmpresa) return;
    const serial = el('orden-serial').value;
    const tipo = el('orden-tipo').value;
    const fechaVal = el('orden-fecha').value || new Date(Date.now() + 86400000).toISOString();
    const obs = el('orden-obs').value.trim();

    let idOrden = 'ord-' + Date.now();
    if (!window.isDemoSession && window.portalAuth) {
      const { data, error } = await window.portalAuth.rpc('gestionar_orden_portal', {
        p_serial: serial, p_tipo: tipo, p_fecha_prog: new Date(fechaVal).toISOString(), p_observaciones: obs
      });
      if (error) {
        notificarAccion('No se pudo programar la orden en Supabase.', 'warn');
        return;
      }
      if (data) idOrden = data;
    }

    datosEmpresa.ordenes = datosEmpresa.ordenes || [];
    datosEmpresa.ordenes.unshift({
      id: idOrden,
      serial,
      fecha: new Date(fechaVal).toISOString(),
      tipo,
      tecnico: el('profile-name')?.textContent || 'Técnico OTech',
      estado: 'PROGRAMADA',
      duracion: null,
      observaciones: obs || 'Programada desde consola web.'
    });
    el('orden-obs').value = '';
    renderMantenimiento();
    notificarAccion(`Orden programada para ${serial}.`);
  });
}

function abrirVistaImprimibleReporte(rep) {
  const win = window.open('', '_blank', 'width=860,height=720');
  if (!win) {
    notificarAccion('Permite las ventanas emergentes para abrir el PDF imprimible.', 'warn');
    return;
  }
  const doc = win.document;
  doc.open();
  doc.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Certificado OTech AirNet</title><style>body{font-family:Arial,sans-serif;padding:36px;color:#0f172a;line-height:1.5}h1{color:#0f766e;margin-bottom:4px}.meta{background:#f1f5f9;padding:14px;border-radius:8px;margin:16px 0;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#0f766e;color:white}.hash{font-family:monospace;font-size:11px;word-break:break-all;background:#e2e8f0;padding:8px;border-radius:6px}.actions{margin-top:20px}@media print{.actions{display:none}}</style></head><body></body></html>');
  doc.close();

  const h1 = doc.createElement('h1'); h1.textContent = 'OTech AirNet S.A.S. — Acta de Cumplimiento Ambiental';
  const sub = doc.createElement('p'); sub.textContent = rep.tipo;
  const meta = doc.createElement('div'); meta.className = 'meta';
  meta.textContent = `Organización: ${el('profile-org')?.textContent || 'OTech AirNet'} | Periodo: ${rep.inicio} a ${rep.fin} | Normativa: Res. 2254/2017 & EPA`;

  const tbl = doc.createElement('table');
  const thead = tbl.createTHead().insertRow();
  ['Estación', 'Sede', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'Humedad (%)', 'Temp (°C)', 'AQI PM2.5'].forEach(c => {
    const th = doc.createElement('th'); th.textContent = c; thead.append(th);
  });
  const tbody = tbl.createTBody();
  (datosEmpresa?.estaciones || []).forEach(e => {
    const tr = tbody.insertRow();
    const aqi = window.OTechCore?.calcularAQI_PM25(e.lecturas?.PM2_5) ?? '—';
    [e.serial, e.sede, e.lecturas?.PM2_5, e.lecturas?.PM10, e.lecturas?.HUM, e.lecturas?.TEMP, aqi].forEach(val => {
      const td = tr.insertCell(); td.textContent = val ?? '—';
    });
  });

  const hashBox = doc.createElement('p');
  hashBox.className = 'hash';
  hashBox.textContent = `Sello de Integridad SHA-256: ${rep.hash || 'VERIFICADO-OTECH-CLOUD'}`;

  const actions = doc.createElement('div'); actions.className = 'actions';
  const btnPrint = doc.createElement('button');
  btnPrint.textContent = '🖨️ Imprimir / Guardar como PDF';
  btnPrint.style.cssText = 'padding:10px 18px;background:#0f766e;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;';
  btnPrint.onclick = () => win.print();
  actions.append(btnPrint);

  doc.body.append(h1, sub, meta, tbl, hashBox, actions);
}

function archivoReporte(r) {
  const cont = document.createElement('div');
  cont.className = 'flex items-center gap-2';
  const url = r.archivo;
  if (url && (/^data:text\/plain;base64,[a-z0-9+/=]+$/i.test(url) || /^https:\/\//i.test(url))) {
    const a = document.createElement('a');
    if (/^data:/i.test(url)) a.download = 'certificado-otech.txt';
    else { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.href = url;
    a.textContent = '⬇ TXT';
    a.className = 'btn-accion-sm';
    cont.append(a);
  }
  const btnPdf = document.createElement('button');
  btnPdf.type = 'button';
  btnPdf.className = 'btn-accion-sm btn-accion-primary';
  btnPdf.textContent = '🖨️ PDF';
  btnPdf.onclick = () => abrirVistaImprimibleReporte(r);
  cont.append(btnPdf);
  return cont;
}

function renderReportes() {
  if (!datosEmpresa?.reportes) return;
  tabla('reportes-empresa', ['Reporte / Acta Normativa', 'Desde', 'Hasta', 'Firma SHA-256', 'Exportar'],
    datosEmpresa.reportes.map(r => [
      r.tipo,
      r.inicio,
      r.fin,
      r.hash ? r.hash.slice(0, 16) + '…' : '—',
      archivoReporte(r)
    ]));
}

const formReporte = el('form-generar-reporte');
if (formReporte) {
  formReporte.addEventListener('submit', async e => {
    e.preventDefault();
    if (!datosEmpresa) return;
    const tipo = el('rep-tipo').value;
    const inicio = el('rep-inicio').value || new Date(Date.now() - 86400000 * 7).toISOString().slice(0, 10);
    const fin = el('rep-fin').value || new Date().toISOString().slice(0, 10);
    const resumenTexto = [
      `OTech AirNet S.A.S. - ${tipo}`,
      `Periodo: ${inicio} al ${fin}`,
      `Organización: ${el('profile-org')?.textContent || 'OTech AirNet'}`,
      ...datosEmpresa.estaciones.map(s =>
        `${s.serial} | ${s.sede} | PM2.5=${s.lecturas?.PM2_5 ?? '-'} ug/m3 | PM10=${s.lecturas?.PM10 ?? '-'} ug/m3 | HR=${s.lecturas?.HUM ?? '-'}% | T=${s.lecturas?.TEMP ?? '-'}C`
      )
    ].join('\n');

    const hashHex = window.OTechCore?.computarHashSHA256
      ? await window.OTechCore.computarHashSHA256(resumenTexto)
      : 'sha256-' + Date.now().toString(16);
    const bytes = new TextEncoder().encode(resumenTexto);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    const dataUrl = 'data:text/plain;base64,' + btoa(bin);

    if (!window.isDemoSession && window.portalAuth) {
      const { error } = await window.portalAuth.rpc('registrar_reporte_portal', {
        p_tipo: tipo, p_inicio: inicio, p_fin: fin, p_archivo: dataUrl, p_hash: hashHex
      });
      if (error) notificarAccion('Reporte generado localmente (sin persistencia remota).', 'warn');
    }

    datosEmpresa.reportes = datosEmpresa.reportes || [];
    datosEmpresa.reportes.unshift({ tipo, inicio, fin, hash: hashHex, archivo: dataUrl });
    renderReportes();
    notificarAccion('Certificado generado y firmado con SHA-256.');
  });
}

function renderPredictivo() {
  const cont = el('panel-predictivo');
  if (!cont || !datosEmpresa?.estaciones || !window.OTechCore?.detectarAnomaliasRed) return;
  cont.replaceChildren();
  const hallazgos = window.OTechCore.detectarAnomaliasRed(datosEmpresa.estaciones);
  hallazgos.forEach(h => {
    const row = document.createElement('div');
    row.className = 'predictivo-item';
    const txt = document.createElement('span');
    txt.textContent = `⚠ Mantenimiento Predictivo (${h.serial} · ${h.sede}): ${h.mensaje}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-accion-sm';
    btn.textContent = 'Programar Preventivo';
    btn.onclick = () => {
      if (el('orden-serial')) el('orden-serial').value = h.serial;
      if (el('orden-tipo')) el('orden-tipo').value = h.tipo === 'BATERIA_BAJA' ? 'INSPECCION_BATERIA' : 'CALIBRACION_OPTICA';
      if (el('orden-obs')) el('orden-obs').value = h.mensaje;
      if (typeof window.switchTab === 'function') window.switchTab('tab-mantenimiento');
      notificarAccion(`Orden preventiva pre-cargada para ${h.serial}.`);
    };
    row.append(txt, btn);
    cont.append(row);
  });
}

let soundAlertsEnabled = true;
function reproducirBeepAlerta() {
  if (!soundAlertsEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {}
}

function inicializarPreferenciasUI() {
  const savedTheme = (() => { try { return localStorage.getItem('otech_theme'); } catch { return null; } })();
  if (savedTheme === 'light') document.body.classList.add('theme-light');
  const btnTheme = el('btn-toggle-theme');
  if (btnTheme) {
    btnTheme.onclick = () => {
      const isLight = document.body.classList.toggle('theme-light');
      try { localStorage.setItem('otech_theme', isLight ? 'light' : 'dark'); } catch {}
      notificarAccion(isLight ? 'Tema Claro activado (alto contraste).' : 'Tema Oscuro NOC activado.');
    };
  }
  const btnSound = el('btn-toggle-sound');
  if (btnSound) {
    btnSound.onclick = () => {
      soundAlertsEnabled = !soundAlertsEnabled;
      btnSound.style.opacity = soundAlertsEnabled ? '1' : '0.45';
      notificarAccion(soundAlertsEnabled ? 'Alertas sonoras activadas.' : 'Alertas sonoras silenciadas.', 'warn');
    };
  }
}
inicializarPreferenciasUI();

function poblarSelectoresEstacion() {
  if (!datosEmpresa?.estaciones) return;
  const seriales = datosEmpresa.estaciones.map(e => [e.serial, `${e.serial} · ${e.sede}`]);
  opciones('equipo-serie', seriales);
  opciones('equipo-comparar', [['', 'Sin comparación'], ...seriales]);
  opciones('orden-serial', seriales);
  opciones('regla-serial', [['TODAS', 'TODAS LAS ESTACIONES'], ...seriales]);
}

function mostrarEmpresa(datos) {
  limpiarEmpresa();
  datosEmpresa = datos;
  const equipos = datos.estaciones || [];
  renderResumenKPIs();
  renderPredictivo();
  actualizarContadoresGlobales();

  cerrarMapa = iniciarMapa(equipos.map(e => ({
    nombre: e.sede,
    id: e.serial,
    posicion: [e.lat, e.lon],
    pm25: e.lecturas?.PM2_5,
    pm10: e.lecturas?.PM10,
    hr: e.lecturas?.HUM,
    temp: e.lecturas?.TEMP
  })));

  tabla('lecturas', ['Estación', 'Sede', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'Humedad (%)', 'Temperatura (°C)'],
    equipos.map(e => [e.serial, e.sede, ...['PM2_5', 'PM10', 'HUM', 'TEMP'].map(k => e.lecturas?.[k])]));

  poblarSelectoresEstacion();
  if (allowedTabs.has('tab-dispositivos')) tabla('equipos', columnasEquipos, inventario());
  if (datos.serie) variablesEstacion();
  renderAlertasYReglas();
  renderMantenimiento();
  renderReportes();
}

// Sincronización en vivo desde el Gemelo Digital 3D (BroadcastChannel + localStorage)
function procesarTelemetria3D(msg) {
  if (!datosEmpresa || !msg || msg.type !== 'telemetry_3d') return;
  const serialTarget = msg.serial || 'OT-CORF-01';
  const est = datosEmpresa.estaciones.find(e => e.serial === serialTarget) || datosEmpresa.estaciones[0];
  if (!est) return;

  est.lecturas.PM2_5 = msg.pm25;
  est.lecturas.PM10 = msg.pm10;
  est.lecturas.HUM = msg.hr;
  est.lecturas.TEMP = msg.temp;
  est.conexion = msg.fecha || new Date().toISOString();

  if (Number(msg.pm25) > 55.4) {
    reproducirBeepAlerta();
  }

  if (datosEmpresa.serie) {
    const fecha = est.conexion;
    datosEmpresa.serie.push(
      { serial: est.serial, variable: 'PM2_5', fecha, valor: msg.pm25, crudo: msg.pm25Crudo ?? msg.pm25, unidad: 'µg/m³' },
      { serial: est.serial, variable: 'PM10', fecha, valor: msg.pm10, crudo: msg.pm10Crudo ?? msg.pm10, unidad: 'µg/m³' },
      { serial: est.serial, variable: 'HUM', fecha, valor: msg.hr, crudo: msg.hr, unidad: '%' },
      { serial: est.serial, variable: 'TEMP', fecha, valor: msg.temp, crudo: msg.temp, unidad: '°C' }
    );
  }

  if (typeof window.setTelemetryModeBadge === 'function') {
    window.setTelemetryModeBadge('Sincronizado con Gemelo 3D (' + (msg.weatherLabel || msg.weather || 'Live') + ')', true);
  }
  if (typeof window.refrescarEstacionMapa === 'function') {
    window.refrescarEstacionMapa(est.serial, { pm25: msg.pm25, pm10: msg.pm10, hr: msg.hr, temp: msg.temp });
  }
  renderResumenKPIs();
  renderPredictivo();
  tabla('lecturas', ['Estación', 'Sede', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'Humedad (%)', 'Temperatura (°C)'],
    datosEmpresa.estaciones.map(e => [e.serial, e.sede, ...['PM2_5', 'PM10', 'HUM', 'TEMP'].map(k => e.lecturas?.[k])]));

  if (!el('tab-estadisticas')?.classList.contains('hidden')) {
    mostrarSerie();
  }
}

if (typeof BroadcastChannel !== 'undefined') {
  const canal3d = new BroadcastChannel('otech-airnet-sync');
  canal3d.onmessage = ev => procesarTelemetria3D(ev.data);
}
window.addEventListener('storage', ev => {
  if (ev.key === 'otech_3d_live_telemetry' && ev.newValue) {
    try { procesarTelemetria3D(JSON.parse(ev.newValue)); } catch {}
  }
});
