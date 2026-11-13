/* Configuración pública de Supabase para el portal web. */
const portalAuth = window.supabase.createClient(
  'https://gokwnexcdyxqgtwqgwen.supabase.co',
  'sb_publishable_bvf-QHxP9y0AmoR5SPV_xA_E8coW7F5',
  { auth: { storage: window.sessionStorage, detectSessionInUrl: false } }
);

const login = document.getElementById('login');
const form = document.getElementById('login-form');
const statusLogin = document.getElementById('login-status');
const portal = document.getElementById('portal');
const allowedTabs = new Set();
let revision = 0;
let currentUser = null;

function lockPortal(message = '') {
  limpiarEmpresa();
  currentUser = null;
  allowedTabs.clear();
  portal.hidden = true;
  login.hidden = false;
  statusLogin.textContent = message;
}

async function loadProfile(session) {
  const request = ++revision;
  if (!session) {
    lockPortal();
    return;
  }
  if (currentUser !== session.user.id) lockPortal('Comprobando acceso…');
  try {
    const { data, error } = await portalAuth.rpc('mi_acceso_portal').maybeSingle();
    if (request !== revision) return;
    if (error) throw error;
    if (!data || !data.vistas?.length) {
      lockPortal('Tu cuenta aún no tiene acceso. Pide al administrador que revise tu organización y tus roles.');
      return;
    }

    const respuesta = await portalAuth.rpc('panel_empresa');
    if (request !== revision) return;
    if (respuesta.error) throw respuesta.error;
    currentUser = session.user.id;
    allowedTabs.clear();
    data.vistas.forEach(view => allowedTabs.add('tab-' + view));
    document.querySelectorAll('[data-view]').forEach(el => {
      el.hidden = !allowedTabs.has(el.dataset.view);
    });
    document.querySelectorAll('.tab-content').forEach(section => { section.hidden = !allowedTabs.has(section.id); });
    document.getElementById('profile-name').textContent = data.nombre;
    document.getElementById('profile-roles').textContent = data.perfiles.join(' · ');
    document.getElementById('profile-org').textContent = data.organizacion;
    const active = portal.querySelector('.tab-content:not(.hidden)')?.id;
    login.hidden = true;
    portal.hidden = false;
    mostrarEmpresa(respuesta.data);
    switchTab(allowedTabs.has(active) ? active : 'tab-dashboard');

  } catch {
    if (request === revision) lockPortal('No se pudo verificar el perfil. Intenta iniciar sesión de nuevo.');
  }
}

portalAuth.auth.onAuthStateChange((_event, session) => {
  // Las consultas al cliente se ejecutan después de liberar el bloqueo de Auth.
  setTimeout(() => loadProfile(session), 0);
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = form.querySelector('button');
  submit.disabled = true;
  statusLogin.textContent = 'Verificando credenciales…';
  try {
    const { error } = await portalAuth.auth.signInWithPassword({
      email: form.elements.email.value.trim(), password: form.elements.password.value
    });
    if (error) {
      statusLogin.textContent = error.status === 429 ? 'Demasiados intentos. Espera un momento.' :
        'No se pudo iniciar sesión. Verifica el correo y la contraseña.';
    }
  } catch {
    statusLogin.textContent = 'No se pudo conectar con Supabase.';
  } finally {
    form.elements.password.value = '';
    submit.disabled = false;
  }
});

document.getElementById('logout').addEventListener('click', async () => {
  ++revision;
  lockPortal();
  const { error } = await portalAuth.auth.signOut({ scope: 'local' });
  if (error) statusLogin.textContent = 'No se pudo completar el cierre de sesión. Cierra esta pestaña.';
});

window.addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
});

// Soporte para Modo Demostración Rápido (Evaluación sin credenciales activas)
const estacionesConfig = [
  { serial: 'OT-CORF-01', sede: 'Corferias - Pabellón Innovación', lat: 4.630, lon: -74.091, estado: 'OPERATIVO_ONLINE', bateria: 98, conexion: new Date().toISOString(), base: { pm25: 12.3, pm10: 24.1, hum: 68.2, temp: 18.4 } },
  { serial: 'OT-INDU-02', sede: 'Zona Franca - Parque Industrial', lat: 4.677, lon: -74.161, estado: 'OPERATIVO_ONLINE', bateria: 92, conexion: new Date().toISOString(), base: { pm25: 36.8, pm10: 55.6, hum: 79.5, temp: 17.1 } },
  { serial: 'OT-AERO-03', sede: 'Terminal Carga - El Dorado', lat: 4.701, lon: -74.146, estado: 'OPERATIVO_ONLINE', bateria: 100, conexion: new Date().toISOString(), base: { pm25: 10.9, pm10: 21.4, hum: 65.0, temp: 19.0 } },
  { serial: 'OT-MOVI-04', sede: 'Portal Sur - TransMilenio Autopista', lat: 4.596, lon: -74.170, estado: 'OPERATIVO_ONLINE', bateria: 85, conexion: new Date().toISOString(), base: { pm25: 58.2, pm10: 83.5, hum: 62.1, temp: 21.0 } },
  { serial: 'OT-ALPI-05', sede: 'Sopó - Cuenca Sabana Norte', lat: 4.909, lon: -73.943, estado: 'OPERATIVO_ONLINE', bateria: 95, conexion: new Date().toISOString(), base: { pm25: 8.4, pm10: 16.2, hum: 65.0, temp: 19.0 } },
  { serial: 'OT-SUBA-06', sede: 'Suba - Reserva Humedal La Conejera', lat: 4.756, lon: -74.098, estado: 'OPERATIVO_ONLINE', bateria: 94, conexion: new Date().toISOString(), base: { pm25: 9.8, pm10: 18.5, hum: 72.0, temp: 16.5 } },
  { serial: 'OT-CHIA-07', sede: 'Chía - Corredor Central del Norte', lat: 4.862, lon: -74.053, estado: 'OPERATIVO_ONLINE', bateria: 91, conexion: new Date().toISOString(), base: { pm25: 14.1, pm10: 27.6, hum: 64.3, temp: 18.2 } },
  { serial: 'OT-USAQ-08', sede: 'Usaquén - Centro Empresarial Santa Bárbara', lat: 4.693, lon: -74.032, estado: 'OPERATIVO_ONLINE', bateria: 97, conexion: new Date().toISOString(), base: { pm25: 15.6, pm10: 31.0, hum: 66.8, temp: 17.8 } }
];

const datosDemoEmpresa = {
  estaciones: estacionesConfig.map(e => ({
    serial: e.serial,
    sede: e.sede,
    lat: e.lat,
    lon: e.lon,
    estado: e.estado,
    bateria: e.bateria,
    conexion: e.conexion,
    lecturas: {
      PM2_5: e.base.pm25,
      PM10: e.base.pm10,
      HUM: e.base.hum,
      TEMP: e.base.temp
    }
  })),
  serie: (function() {
    const s = [];
    const now = Date.now();
    for (let h = 48; h >= 0; h--) {
      const fecha = new Date(now - h * 3600000).toISOString();
      for (const e of estacionesConfig) {
        const offset = e.serial.charCodeAt(e.serial.length - 1);
        // PM2.5 con variación diurna realista
        const pm25Val = Math.max(1, +(e.base.pm25 + Math.sin((h + offset) / 3.5) * (e.base.pm25 * 0.28)).toFixed(1));
        const pm25Raw = +(pm25Val * 1.08).toFixed(1);
        s.push({ serial: e.serial, variable: 'PM2_5', fecha, valor: pm25Val, crudo: pm25Raw, unidad: 'µg/m³' });

        // PM10
        const pm10Val = Math.max(2, +(e.base.pm10 + Math.sin((h + offset) / 4.0) * (e.base.pm10 * 0.24)).toFixed(1));
        const pm10Raw = +(pm10Val * 1.07).toFixed(1);
        s.push({ serial: e.serial, variable: 'PM10', fecha, valor: pm10Val, crudo: pm10Raw, unidad: 'µg/m³' });

        // Humedad relativa (%)
        const humVal = Math.min(99, Math.max(25, +(e.base.hum + Math.cos((h + offset) / 5.0) * 10).toFixed(1)));
        s.push({ serial: e.serial, variable: 'HUM', fecha, valor: humVal, crudo: humVal, unidad: '%' });

        // Temperatura (°C)
        const tempVal = +(e.base.temp + Math.sin((h + offset) / 6.0) * 3.5).toFixed(1);
        s.push({ serial: e.serial, variable: 'TEMP', fecha, valor: tempVal, crudo: tempVal, unidad: '°C' });
      }
    }
    return s;
  })(),
  alertas: [
    { serial: 'OT-MOVI-04', fecha: new Date(Date.now() - 7200000).toISOString(), variable: 'PM2_5', umbral: 55.0, maximo: 58.2, estado: 'EN_PROCESO' },
    { serial: 'OT-INDU-02', fecha: new Date(Date.now() - 36000000).toISOString(), variable: 'PM10', umbral: 54.0, maximo: 55.6, estado: 'EN_PROCESO' },
    { serial: 'OT-CHIA-07', fecha: new Date(Date.now() - 64800000).toISOString(), variable: 'PM2_5', umbral: 12.0, maximo: 14.1, estado: 'RECONOCIDO' },
    { serial: 'OT-CORF-01', fecha: new Date(Date.now() - 86400000).toISOString(), variable: 'HUM', umbral: 75.0, maximo: 78.5, estado: 'RESUELTO' }
  ],
  ordenes: [
    { serial: 'OT-MOVI-04', fecha: new Date(Date.now() + 86400000).toISOString(), tipo: 'Calibración Metrológica & Filtro Óptico PM', tecnico: 'Ing. Carlos Mendoza (OTech)', estado: 'PROGRAMADA' },
    { serial: 'OT-INDU-02', fecha: new Date(Date.now() + 172800000).toISOString(), tipo: 'Inspección de Malla Antideterioro & Celda Solar', tecnico: 'Téc. Andrea Silva', estado: 'PROGRAMADA' },
    { serial: 'OT-AERO-03', fecha: new Date(Date.now() - 86400000).toISOString(), tipo: 'Calibración Higroscópica (Kappa-Köhler)', tecnico: 'Ing. Felipe Restrepo', estado: 'COMPLETADA' },
    { serial: 'OT-CORF-01', fecha: new Date(Date.now() - 259200000).toISOString(), tipo: 'Limpieza de Entrada Stevenson & Ventilación', tecnico: 'Téc. Andrea Silva', estado: 'COMPLETADA' }
  ],
  reportes: [
    { tipo: 'Certificado Mensual de Conformidad Res. 2254/2017', inicio: '2026-10-01', fin: '2026-10-31', archivo: 'data:text/plain;base64,T1RlY2ggQWlyTmV0IC0gQ2VydGlmaWNhZG8gZGUgQ2FsaWRhZCBkZWwgQWlyZQ==' },
    { tipo: 'Auditoría Ambiental CAR / IDEAM - Red Sabana', inicio: '2026-09-01', fin: '2026-09-30', archivo: 'data:text/plain;base64,T1RlY2ggQWlyTmV0IC0gQXVkaXRvcmlhIENBUiBTYWJhbmEgQ29sb21iaWE=' },
    { tipo: 'Consolidado Estadístico 48h Estaciones Industriales', inicio: '2026-11-10', fin: '2026-11-12', archivo: 'data:text/plain;base64,T1RlY2ggQWlyTmV0IC0gUmVwb3J0ZSBFc3RhZGlzdGljbyA0OGg=' }
  ]
};

// Soporte para Perfiles de Demostración y Acceso Directo por Rol y Vista
const ROLES_ACCESO_RAPIDO = {
  super_admin: {
    nombre: 'Daniel Sanabria Rivera',
    roles: ['SUPER_ADMIN_OTECH', 'ARQUITECTO_SDLC', 'DIRECTOR_TECNOLOGICO'],
    organizacion: 'Ecosistema Industrial OTech AirNet S.A.S.',
    vistas: ['dashboard', 'dispositivos', 'estadisticas', 'alertas', 'mantenimiento', 'reportes', 'database'],
    defaultView: 'tab-dashboard'
  },
  admin_empresa: {
    nombre: 'Ing. Juan José León',
    roles: ['ADMIN_EMPRESA', 'GESTION_FLOTA_IOT'],
    organizacion: 'Ecopetrol S.A. — Refinería & Complejos',
    vistas: ['dashboard', 'dispositivos', 'estadisticas', 'alertas', 'mantenimiento', 'reportes'],
    defaultView: 'tab-dispositivos'
  },
  analista_ambiental: {
    nombre: 'Dra. Andrea Silva Castro',
    roles: ['ANALISTA_AMBIENTAL', 'AUDITOR_CAR_EPA'],
    organizacion: 'CAR — Corporación Autónoma Regional / IDEAM',
    vistas: ['dashboard', 'estadisticas', 'alertas', 'reportes'],
    defaultView: 'tab-estadisticas'
  },
  tecnico_campo: {
    nombre: 'Jamyson Steven Rolón',
    roles: ['TECNICO_CAMPO', 'CALIBRACION_HARDWARE'],
    organizacion: 'Red de Soporte Metrológico OTech',
    vistas: ['dashboard', 'dispositivos', 'alertas', 'mantenimiento'],
    defaultView: 'tab-mantenimiento'
  },
  visualizador_publico: {
    nombre: 'Consulta Ciudadana Abierta',
    roles: ['VISUALIZADOR_PUBLICO', 'MONITOREO_ABIERTO'],
    organizacion: 'Alcaldía Mayor de Bogotá — Sistema Abierto ICA',
    vistas: ['dashboard'],
    defaultView: 'tab-dashboard'
  }
};

function ingresarConRol(rolKey, targetView) {
  const perfil = ROLES_ACCESO_RAPIDO[rolKey] || ROLES_ACCESO_RAPIDO.super_admin;
  currentUser = 'demo-' + rolKey;
  allowedTabs.clear();
  perfil.vistas.forEach(v => allowedTabs.add('tab-' + v));

  // Actualizar visibilidad de opciones en la barra de navegación según permisos del rol
  document.querySelectorAll('[data-view]').forEach(el => {
    el.hidden = !allowedTabs.has(el.dataset.view);
  });
  document.querySelectorAll('.tab-content').forEach(section => {
    section.hidden = !allowedTabs.has(section.id);
  });

  const pName = document.getElementById('profile-name');
  const pRoles = document.getElementById('profile-roles');
  const pOrg = document.getElementById('profile-org');
  if (pName) pName.textContent = perfil.nombre;
  if (pRoles) pRoles.textContent = perfil.roles.join(' · ');
  if (pOrg) pOrg.textContent = perfil.organizacion;

  login.hidden = true;
  portal.hidden = false;
  mostrarEmpresa(datosDemoEmpresa);

  const vistaFinal = (targetView && allowedTabs.has(targetView)) ? targetView : perfil.defaultView;
  if (typeof switchTab === 'function') {
    switchTab(vistaFinal);
  }
  window.lucide?.createIcons();
}
window.ingresarConRol = ingresarConRol;

const demoBtn = document.getElementById('btn-demo-mode');
if (demoBtn) {
  demoBtn.addEventListener('click', () => ingresarConRol('super_admin', 'tab-dashboard'));
}

form.querySelector('button').disabled = false;
