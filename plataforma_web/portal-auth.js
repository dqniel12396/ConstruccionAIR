/* Configuración pública de Supabase para el portal web (con soporte offline/demo). */
const portalAuth = window.supabase ? window.supabase.createClient(
  'https://gokwnexcdyxqgtwqgwen.supabase.co',
  'sb_publishable_bvf-QHxP9y0AmoR5SPV_xA_E8coW7F5',
  { auth: { storage: window.sessionStorage, detectSessionInUrl: false } }
) : null;
window.portalAuth = portalAuth;
window.isDemoSession = false;

const login = document.getElementById('login');
const form = document.getElementById('login-form');
const statusLogin = document.getElementById('login-status');
const portal = document.getElementById('portal');
const allowedTabs = new Set();
let revision = 0;
let currentUser = null;

function setTelemetryModeBadge(texto, esLive = false) {
  const lbl = document.getElementById('telemetry-mode-label');
  const dot = document.getElementById('telemetry-mode-dot');
  if (lbl) lbl.textContent = texto;
  if (dot) {
    dot.className = esLive
      ? 'w-2 h-2 rounded-full bg-emerald-400 pulse-dot'
      : 'w-2 h-2 rounded-full bg-amber-400 pulse-dot';
  }
}
window.setTelemetryModeBadge = setTelemetryModeBadge;

function lockPortal(message = '') {
  if (typeof limpiarEmpresa === 'function') limpiarEmpresa();
  currentUser = null;
  window.isDemoSession = false;
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
    window.isDemoSession = false;
    allowedTabs.clear();
    data.vistas.forEach(view => allowedTabs.add('tab-' + view));
    document.querySelectorAll('[data-view]').forEach(el => {
      el.hidden = !allowedTabs.has(el.dataset.view);
    });
    document.querySelectorAll('.tab-content').forEach(section => { section.hidden = !allowedTabs.has(section.id); });
    document.getElementById('profile-name').textContent = data.nombre;
    document.getElementById('profile-roles').textContent = data.perfiles.join(' · ');
    document.getElementById('profile-org').textContent = data.organizacion;
    setTelemetryModeBadge('Supabase Live (Multi-Tenant)', true);
    const active = portal.querySelector('.tab-content:not(.hidden)')?.id;
    login.hidden = true;
    portal.hidden = false;
    mostrarEmpresa(respuesta.data);
    switchTab(allowedTabs.has(active) ? active : 'tab-dashboard');
  } catch {
    if (request === revision) lockPortal('No se pudo verificar el perfil. Intenta iniciar sesión de nuevo.');
  }
}

if (portalAuth) {
  portalAuth.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => loadProfile(session), 0);
  });
} else {
  statusLogin.textContent = 'Modo offline: usa los botones de Acceso Rápido por Rol →';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!portalAuth) {
    statusLogin.textContent = 'Cliente Supabase no disponible sin conexión. Usa Acceso Rápido.';
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
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
  if (portalAuth) {
    const { error } = await portalAuth.auth.signOut({ scope: 'local' });
    if (error) statusLogin.textContent = 'No se pudo completar el cierre de sesión. Cierra esta pestaña.';
  }
});

window.addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
});

// Catálogo canónico + series de tiempo sintéticas con compensación física Kappa-Köhler
const core = window.OTechCore;
const estacionesConfig = (core?.ESTACIONES_BASE_OTECH || []).map(e => ({
  ...e,
  conexion: new Date().toISOString()
}));

const datosDemoEmpresa = {
  estaciones: estacionesConfig.map(e => ({
    serial: e.serial,
    sede: e.sede,
    lat: e.lat,
    lon: e.lon,
    estado: e.estado,
    bateria: e.bateria,
    voltaje: e.voltaje,
    chip_id: e.chip_id,
    modelo: e.modelo,
    firmware: e.firmware,
    soporte: e.soporte,
    comunicacion: e.comunicacion,
    sensores: e.sensores,
    manufactura: e.manufactura,
    conexion: e.conexion,
    lecturas: {
      PM2_5: core ? core.aplicarKappaKohler(e.base.pm25 * 1.12, e.base.hum) : e.base.pm25,
      PM10: core ? core.aplicarKappaKohler(e.base.pm10 * 1.10, e.base.hum) : e.base.pm10,
      HUM: e.base.hum,
      TEMP: e.base.temp
    }
  })),
  serie: (function () {
    const s = [];
    const now = Date.now();
    for (let h = 48; h >= 0; h--) {
      const fecha = new Date(now - h * 3600000).toISOString();
      for (const e of estacionesConfig) {
        const offset = e.serial.charCodeAt(e.serial.length - 1);
        const humVal = Math.min(96, Math.max(30, +(e.base.hum + Math.cos((h + offset) / 4.5) * 14).toFixed(1)));
        const tempVal = +(e.base.temp + Math.sin((h + offset) / 6.0) * 3.5).toFixed(1);

        const pm25Raw = Math.max(2, +(e.base.pm25 * 1.12 + Math.sin((h + offset) / 3.5) * (e.base.pm25 * 0.28)).toFixed(1));
        const pm25Comp = core ? core.aplicarKappaKohler(pm25Raw, humVal) : +(pm25Raw * 0.92).toFixed(1);
        s.push({ serial: e.serial, variable: 'PM2_5', fecha, valor: pm25Comp, crudo: pm25Raw, unidad: 'µg/m³' });

        const pm10Raw = Math.max(4, +(e.base.pm10 * 1.10 + Math.sin((h + offset) / 4.0) * (e.base.pm10 * 0.24)).toFixed(1));
        const pm10Comp = core ? core.aplicarKappaKohler(pm10Raw, humVal) : +(pm10Raw * 0.93).toFixed(1);
        s.push({ serial: e.serial, variable: 'PM10', fecha, valor: pm10Comp, crudo: pm10Raw, unidad: 'µg/m³' });

        s.push({ serial: e.serial, variable: 'HUM', fecha, valor: humVal, crudo: humVal, unidad: '%' });
        s.push({ serial: e.serial, variable: 'TEMP', fecha, valor: tempVal, crudo: tempVal, unidad: '°C' });
      }
    }
    return s;
  })(),
  reglas: [
    { id: 'reg-1', serial: 'OT-MOVI-04', variable: 'PM2_5', operador: '>', umbral: 55.0, severidad: 'CONTINGENCIA_CRITICA', activa: true },
    { id: 'reg-2', serial: 'OT-INDU-02', variable: 'PM10', operador: '>', umbral: 54.0, severidad: 'ALERTA_FASE_1', activa: true },
    { id: 'reg-3', serial: 'TODAS', variable: 'PM2_5', operador: '>', umbral: 35.4, severidad: 'PREVENTIVO', activa: true },
    { id: 'reg-4', serial: 'TODAS', variable: 'HUM', operador: '>', umbral: 75.0, severidad: 'INFORMATIVO', activa: true }
  ],
  alertas: [
    { id: 'alt-1', serial: 'OT-MOVI-04', fecha: new Date(Date.now() - 7200000).toISOString(), variable: 'PM2_5', umbral: 55.0, maximo: 58.2, estado: 'ABIERTO', bitacora: '' },
    { id: 'alt-2', serial: 'OT-INDU-02', fecha: new Date(Date.now() - 36000000).toISOString(), variable: 'PM10', umbral: 54.0, maximo: 55.6, estado: 'EN_MITIGACION', bitacora: 'Revisión de flujo de aire y compensación κ-Köhler en curso.' },
    { id: 'alt-3', serial: 'OT-CHIA-07', fecha: new Date(Date.now() - 64800000).toISOString(), variable: 'PM2_5', umbral: 12.0, maximo: 14.1, estado: 'RECONOCIDO', bitacora: 'Monitoreo preventivo por pico matutino de tráfico.' },
    { id: 'alt-4', serial: 'OT-CORF-01', fecha: new Date(Date.now() - 86400000).toISOString(), variable: 'HUM', umbral: 75.0, maximo: 78.5, estado: 'RESUELTO', bitacora: 'Compensación higroscópica validada sin falsa alarma.' }
  ],
  ordenes: [
    { id: 'ord-1', serial: 'OT-MOVI-04', fecha: new Date(Date.now() + 86400000).toISOString(), tipo: 'REEMPLAZO_HOT_SWAP_BANDEJA', tecnico: 'Jamyson Steven Rolón', estado: 'PROGRAMADA', duracion: null, observaciones: 'Sustitución preventiva módulo SPS30.' },
    { id: 'ord-2', serial: 'OT-INDU-02', fecha: new Date(Date.now() + 172800000).toISOString(), tipo: 'Inspección de Malla & Celda Solar', tecnico: 'Téc. Andrea Silva', estado: 'PROGRAMADA', duracion: null, observaciones: 'Limpieza escudo Stevenson.' },
    { id: 'ord-3', serial: 'OT-AERO-03', fecha: new Date(Date.now() - 86400000).toISOString(), tipo: 'CALIBRACION_ANUAL', tecnico: 'Ing. Felipe Restrepo', estado: 'COMPLETADA', duracion: 2, observaciones: 'Contrastada vs BAM-1020 sin desviación.' },
    { id: 'ord-4', serial: 'OT-CORF-01', fecha: new Date(Date.now() - 259200000).toISOString(), tipo: 'REEMPLAZO_HOT_SWAP_BANDEJA', tecnico: 'Téc. Andrea Silva', estado: 'COMPLETADA', duracion: 1, observaciones: 'Recambio modular Hot-Swap en 1.4 min (Meta RNF-05 OK).' }
  ],
  calibraciones: [
    { serial: 'OT-CORF-01', variable: 'PM2_5', patron: 'Met One BAM-1020 CAMS #04', pendiente: 1.0021, offset_cero: -0.1400, certificado: 'CERT-OT-2026-019', fecha: new Date(Date.now() - 432000000).toISOString() },
    { serial: 'OT-AERO-03', variable: 'PM10', patron: 'Met One BAM-1020 CAMS #04', pendiente: 0.9968, offset_cero: 0.2100, certificado: 'CERT-OT-2026-018', fecha: new Date(Date.now() - 86400000).toISOString() },
    { serial: 'OT-INDU-02', variable: 'HUM', patron: 'Vaisala HMP155 Referencia', pendiente: 1.0040, offset_cero: 0.3500, certificado: 'CERT-OT-2026-015', fecha: new Date(Date.now() - 1296000000).toISOString() }
  ],
  reportes: [
    { tipo: 'Certificado Mensual de Conformidad Res. 2254/2017', inicio: '2026-10-01', fin: '2026-10-31', hash: '7e4c9a12b8f04421d9e3c78201a54f118b6a2c44d910e3f2a1b4c8d9e0f12345', archivo: 'data:text/plain;base64,T1RlY2ggQWlyTmV0IC0gQ2VydGlmaWNhZG8gZGUgQ2FsaWRhZCBkZWwgQWlyZQ==' },
    { tipo: 'Auditoría Ambiental CAR / IDEAM - Red Sabana', inicio: '2026-09-01', fin: '2026-09-30', hash: '3b8a1f77c4e29104a5d8e23f67901c229d4b5e66f012a3b4c5d6e7f8a9b0c1d2', archivo: 'data:text/plain;base64,T1RlY2ggQWlyTmV0IC0gQXVkaXRvcmlhIENBUiBTYWJhbmEgQ29sb21iaWE=' },
    { tipo: 'Consolidado Estadístico 48h Estaciones Industriales', inicio: '2026-11-10', fin: '2026-11-12', hash: '9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d', archivo: 'data:text/plain;base64,T1RlY2ggQWlyTmV0IC0gUmVwb3J0ZSBFc3RhZGlzdGljbyA0OGg=' }
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
  window.isDemoSession = true;
  allowedTabs.clear();
  perfil.vistas.forEach(v => allowedTabs.add('tab-' + v));

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
  setTelemetryModeBadge('Modo Demostración · Offline Ready', false);

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

if (portalAuth) {
  form.querySelector('button[type="submit"]').disabled = false;
}
