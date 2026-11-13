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
const datosDemoEmpresa = {
  estaciones: [
    { serial: 'OT-CORF-01', sede: 'Corferias - Pabellón Innovación', lat: 4.630, lon: -74.091, estado: 'OPERATIVO_ONLINE', bateria: 98, conexion: new Date().toISOString(), lecturas: { PM2_5: 12.3, PM10: 24.1, HUM: 68.2, TEMP: 18.4 } },
    { serial: 'OT-INDU-02', sede: 'Zona Franca - Parque Industrial', lat: 4.677, lon: -74.161, estado: 'OPERATIVO_ONLINE', bateria: 92, conexion: new Date().toISOString(), lecturas: { PM2_5: 36.8, PM10: 55.6, HUM: 79.5, TEMP: 17.1 } },
    { serial: 'OT-AERO-03', sede: 'Terminal Carga - El Dorado', lat: 4.701, lon: -74.146, estado: 'OPERATIVO_ONLINE', bateria: 100, conexion: new Date().toISOString(), lecturas: { PM2_5: 10.9, PM10: 21.4, HUM: 65.0, TEMP: 19.0 } },
    { serial: 'OT-MOVI-04', sede: 'Portal Sur - TransMilenio Autopista', lat: 4.596, lon: -74.170, estado: 'OPERATIVO_ONLINE', bateria: 85, conexion: new Date().toISOString(), lecturas: { PM2_5: 58.2, PM10: 83.5, HUM: 62.1, TEMP: 21.0 } },
    { serial: 'OT-ALPI-05', sede: 'Sopó - Cuenca Sabana Norte', lat: 4.909, lon: -73.943, estado: 'OPERATIVO_ONLINE', bateria: 95, conexion: new Date().toISOString(), lecturas: { PM2_5: 8.4, PM10: 16.2, HUM: 65.0, TEMP: 19.0 } }
  ],
  serie: (function() {
    const s = [];
    const now = Date.now();
    for (let h = 48; h >= 0; h--) {
      const fecha = new Date(now - h * 3600000).toISOString();
      s.push({ serial: 'OT-CORF-01', variable: 'PM2_5', fecha, valor: +(11 + Math.sin(h/4)*4).toFixed(1), crudo: +(12 + Math.sin(h/4)*4.5).toFixed(1), unidad: 'µg/m³' });
      s.push({ serial: 'OT-CORF-01', variable: 'PM10', fecha, valor: +(22 + Math.sin(h/4)*6).toFixed(1), crudo: +(24 + Math.sin(h/4)*7).toFixed(1), unidad: 'µg/m³' });
      s.push({ serial: 'OT-CORF-01', variable: 'HUM', fecha, valor: +(65 + Math.cos(h/6)*12).toFixed(1), crudo: +(65 + Math.cos(h/6)*12).toFixed(1), unidad: '%' });
      s.push({ serial: 'OT-CORF-01', variable: 'TEMP', fecha, valor: +(18 + Math.sin(h/5)*3).toFixed(1), crudo: +(18 + Math.sin(h/5)*3).toFixed(1), unidad: '°C' });
      s.push({ serial: 'OT-INDU-02', variable: 'PM2_5', fecha, valor: +(34 + Math.sin(h/3)*6).toFixed(1), crudo: +(38 + Math.sin(h/3)*8).toFixed(1), unidad: 'µg/m³' });
      s.push({ serial: 'OT-MOVI-04', variable: 'PM2_5', fecha, valor: +(52 + Math.cos(h/4)*8).toFixed(1), crudo: +(57 + Math.cos(h/4)*9).toFixed(1), unidad: 'µg/m³' });
    }
    return s;
  })(),
  alertas: [
    { serial: 'OT-MOVI-04', fecha: new Date(Date.now() - 7200000).toISOString(), variable: 'PM2_5', umbral: 55.0, maximo: 58.2, estado: 'EN_PROCESO' },
    { serial: 'OT-INDU-02', fecha: new Date(Date.now() - 86400000).toISOString(), variable: 'HUM', umbral: 75.0, maximo: 79.5, estado: 'RESUELTO' }
  ],
  ordenes: [
    { serial: 'OT-MOVI-04', fecha: new Date(Date.now() + 86400000).toISOString(), tipo: 'Calibración Metrológica & Filtro Óptico', tecnico: 'Ing. Carlos Mendoza (OTech)', estado: 'PROGRAMADA' },
    { serial: 'OT-INDU-02', fecha: new Date(Date.now() - 172800000).toISOString(), tipo: 'Limpieza de Entrada Stevenson & Vent', tecnico: 'Téc. Andrea Silva', estado: 'COMPLETADA' }
  ],
  reportes: [
    { tipo: 'Certificado Mensual de Conformidad Res. 2254/2017', inicio: '2026-10-01', fin: '2026-10-31', archivo: 'data:text/plain;base64,T1RlY2ggQWlyTmV0IC0gQ2VydGlmaWNhZG8gZGUgQ2FsaWRhZCBkZWwgQWlyZQ==' }
  ]
};

const demoBtn = document.getElementById('btn-demo-mode');
if (demoBtn) {
  demoBtn.addEventListener('click', () => {
    allowedTabs.clear();
    ['dashboard', 'dispositivos', 'estadisticas', 'alertas', 'mantenimiento', 'reportes', 'database'].forEach(v => allowedTabs.add('tab-' + v));
    document.querySelectorAll('[data-view]').forEach(el => el.hidden = false);
    document.querySelectorAll('.tab-content').forEach(section => section.hidden = false);
    const pName = document.getElementById('profile-name');
    const pRoles = document.getElementById('profile-roles');
    const pOrg = document.getElementById('profile-org');
    if (pName) pName.textContent = 'Daniel Sanabria (Demostración)';
    if (pRoles) pRoles.textContent = 'ADMIN_EMPRESA · AUDITOR_AMBIENTAL';
    if (pOrg) pOrg.textContent = 'Ecosistema Industrial OTech AirNet';
    login.hidden = true;
    portal.hidden = false;
    mostrarEmpresa(datosDemoEmpresa);
    if (typeof switchTab === 'function') switchTab('tab-dashboard');
  });
}

form.querySelector('button').disabled = false;
