let datosEmpresa = null;
let cerrarMapa = null;
let grafica = null;
const el = id => document.getElementById(id);
const fechaLocal = valor => valor ? new Date(valor).toLocaleString('es-CO', {timeZone:'America/Bogota'}) : '—';
const variables = { PM2_5:'PM2.5', PM10:'PM10', HUM:'Humedad', TEMP:'Temperatura' };

function tabla(id, columnas, filas) {
  const contenedor = el(id);
  contenedor.replaceChildren();
  if (!filas.length) { contenedor.textContent = 'Sin registros para esta consulta.'; return; }
  const t = document.createElement('table');
  const cabecera = t.createTHead().insertRow();
  columnas.forEach(nombre => { const th=document.createElement('th'); th.textContent=nombre; cabecera.append(th); });
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

function limpiarEmpresa() {
  cerrarMapa?.(); cerrarMapa = null;
  grafica?.destroy(); grafica = null;
  datosEmpresa = null;
  document.querySelectorAll('.tabla-empresa,#resumen,#equipo-serie,#variable-serie').forEach(n => n.replaceChildren());
  el('buscar-equipo').value = '';
}

function inventario() {
  const busca = el('buscar-equipo').value.toLocaleLowerCase().trim();
  return datosEmpresa.estaciones.filter(e => (e.serial+' '+e.sede).toLocaleLowerCase().includes(busca))
    .map(e => [e.serial,e.sede,e.estado,e.bateria,fechaLocal(e.conexion)]);
}
const columnasEquipos = ['Estación','Sede','Estado','Batería (%)','Última conexión'];
el('buscar-equipo').oninput = () => tabla('equipos',columnasEquipos,inventario());

function descargar(blob,nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
el('exportar-equipos').onclick = () => {
  const csv = [columnasEquipos,...inventario()].map(row => row.map(v => {
    const s=String(v??'').replace(/^[=+@\-\t\r]/, "'$&");
    return '"' + s.replaceAll('"','""') + '"';
  }).join(';')).join('\r\n');
  descargar(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}),'inventario.csv');
};

function mostrarSerie() {
  if (!datosEmpresa?.serie) return;
  const equipo = el('equipo-serie').value, variable = el('variable-serie').value;
  const serie = datosEmpresa.serie.filter(v => v.serial === equipo && v.variable === variable);
  const horas = Number(el('periodo').value);
  const inicio = serie.length && horas ? Date.parse(serie.at(-1).fecha)-horas*3600000 : -Infinity;
  const filas = serie.filter(v => Date.parse(v.fecha)>inicio);
  grafica?.destroy(); grafica=null;
  if (window.Chart && filas.length) {
    grafica = new Chart(el('grafica'), {type:'line',data:{labels:filas.map(v=>fechaLocal(v.fecha)),datasets:[
      {label:(variables[variable]??variable)+' ('+filas[0].unidad+')',data:filas.map(v=>v.valor),borderColor:'#45cdb9',pointRadius:2}
    ]},options:{maintainAspectRatio:false,animation:false,scales:{x:{ticks:{maxTicksLimit:8}}}}});
  }
  tabla('serie',['Fecha (Bogotá)','Lectura cruda','Lectura compensada','Unidad'],filas.slice().reverse().map(v=>[fechaLocal(v.fecha),v.crudo,v.valor,v.unidad]));
}
function opciones(id,items) { el(id).replaceChildren(...items.map(([v,t])=>new Option(t,v))); }
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
el('equipo-serie').onchange=variablesEstacion;
el('variable-serie').onchange=mostrarSerie;
el('periodo').onchange=mostrarSerie;

function archivoReporte(url) {
  if (!url) return 'Sin archivo';
  const a = document.createElement('a');
  if (/^data:text\/plain;base64,[a-z0-9+/=]+$/i.test(url)) a.download='resumen-estacion.txt';
  else if (/^https:\/\//i.test(url)) { a.target='_blank'; a.rel='noopener noreferrer'; }
  else return 'Sin archivo disponible';
  a.href=url; a.textContent='Descargar'; a.className='text-teal-300 underline';
  return a;
}

function mostrarEmpresa(datos) {
  limpiarEmpresa();
  datosEmpresa = datos;
  const equipos = datos.estaciones;
  const indicadores = [['Estaciones',equipos.length],['Sedes con equipos',new Set(equipos.map(e=>e.sede)).size],
    ['Equipos operativos',equipos.filter(e=>e.estado==='OPERATIVO_ONLINE').length]];
  for (const [nombre,valor] of indicadores) {
    const card=document.createElement('div'), cifra=document.createElement('strong');
    cifra.textContent=valor; card.append(nombre,cifra); el('resumen').append(card);
  }
  cerrarMapa=iniciarMapa(equipos.map(e=>({nombre:e.sede,id:e.serial,posicion:[e.lat,e.lon],
    pm25:e.lecturas?.PM2_5,pm10:e.lecturas?.PM10,hr:e.lecturas?.HUM,temp:e.lecturas?.TEMP})));
  tabla('lecturas',['Estación','Sede','PM2.5 (µg/m³)','PM10 (µg/m³)','Humedad (%)','Temperatura (°C)'],
    equipos.map(e=>[e.serial,e.sede,...['PM2_5','PM10','HUM','TEMP'].map(k=>e.lecturas?.[k])]));
  if (allowedTabs.has('tab-dispositivos')) tabla('equipos',columnasEquipos,inventario());
  if (datos.serie) {
    opciones('equipo-serie',equipos.map(e=>[e.serial,e.serial+' · '+e.sede]));
    variablesEstacion();
  }
  el('cantidad-alertas').textContent=datos.alertas?.filter(i=>i.estado!=='RESUELTO').length??'';
  if(datos.alertas) tabla('alertas-empresa',['Estación','Inicio','Variable','Umbral','Máximo','Estado'],
    datos.alertas.map(a=>[a.serial,fechaLocal(a.fecha),variables[a.variable]??a.variable,a.umbral,a.maximo,a.estado]));
  if(datos.ordenes) tabla('ordenes-empresa',['Estación','Programada','Intervención','Técnico','Estado'],
    datos.ordenes.map(o=>[o.serial,fechaLocal(o.fecha),o.tipo,o.tecnico,o.estado]));
  if(datos.reportes) tabla('reportes-empresa',['Reporte','Desde','Hasta','Archivo'],
    datos.reportes.map(r=>[r.tipo,r.inicio,r.fin,archivoReporte(r.archivo)]));
}
