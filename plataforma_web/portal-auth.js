/* Configuración pública de Supabase para el portal web (Multi-Tenant Real). */
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
      ? 'w-2 h-2 rounded-full bg-emerald-400 pulse-dot shrink-0'
      : 'w-2 h-2 rounded-full bg-amber-400 pulse-dot shrink-0';
  }
}
window.setTelemetryModeBadge = setTelemetryModeBadge;

// Directorio multi-tenant verificado por hash SHA-256 (espejo exacto de database/005_usuarios_y_empresas_reales.sql)
const CUENTAS_CORPORATIVAS = [
  {
    email: 'admin@otechairnet.co',
    passHash: '9bde93d2f5c2088b23f5a711cd1d88026b50793d5b4f7e19c277b2ec169e025c',
    nombre: 'Daniel Sanabria Rivera',
    roles: ['SUPER_ADMIN_OTECH'],
    empresa: 'todas',
    organizacion: 'OTech AirNet S.A.S. (Red Global)',
    vistas: ['dashboard', 'dispositivos', 'estadisticas', 'alertas', 'mantenimiento', 'reportes', 'database'],
    defaultView: 'tab-dashboard'
  },
  {
    email: 'tecnico@otechairnet.co',
    passHash: '36e36c78a906a0c5aaf88281f3233225b9efe3b3cf6ae1692597be92ae82386e',
    nombre: 'Jamyson Steven Rolón',
    roles: ['TECNICO_CAMPO'],
    empresa: 'todas',
    organizacion: 'OTech AirNet S.A.S. — Soporte Metrológico',
    vistas: ['dashboard', 'dispositivos', 'alertas', 'mantenimiento'],
    defaultView: 'tab-mantenimiento'
  },
  {
    email: 'admin@ecopetrol.otech.co',
    passHash: 'e587580b55c463c74c272441e3b59825a3489ec5070c076340e8bc7ad40756c2',
    nombre: 'Ing. Juan José León',
    roles: ['ADMIN_EMPRESA'],
    empresa: 'ecopetrol',
    organizacion: 'Ecopetrol S.A.',
    vistas: ['dashboard', 'dispositivos', 'estadisticas', 'alertas', 'mantenimiento', 'reportes'],
    defaultView: 'tab-dashboard'
  },
  {
    email: 'analista@ecopetrol.otech.co',
    passHash: '2732c5c50c2eff0710ae63a492840be1840d6af382bee5cf146a8da8465884f7',
    nombre: 'Dra. Andrea Silva Castro',
    roles: ['ANALISTA_AMBIENTAL'],
    empresa: 'ecopetrol',
    organizacion: 'Ecopetrol S.A.',
    vistas: ['dashboard', 'estadisticas', 'alertas', 'reportes'],
    defaultView: 'tab-estadisticas'
  },
  {
    email: 'admin@alpina.otech.co',
    passHash: 'e82b3e4753027134c193d4948071970637eeb1b149b8b0c1e216a03e78d29889',
    nombre: 'Ing. Carlos Méndez',
    roles: ['ADMIN_EMPRESA'],
    empresa: 'alpina',
    organizacion: 'Alpina Productos Alimenticios S.A.',
    vistas: ['dashboard', 'dispositivos', 'estadisticas', 'alertas', 'mantenimiento', 'reportes'],
    defaultView: 'tab-dashboard'
  },
  {
    email: 'tecnico@alpina.otech.co',
    passHash: '336f084353ead1a0b5ea1227a40f997ef58c0703ab9619b79be966cd64198c91',
    nombre: 'Téc. Laura Gómez',
    roles: ['TECNICO_CAMPO'],
    empresa: 'alpina',
    organizacion: 'Alpina Productos Alimenticios S.A.',
    vistas: ['dashboard', 'dispositivos', 'alertas', 'mantenimiento'],
    defaultView: 'tab-mantenimiento'
  },
  {
    email: 'consulta@corferias.otech.co',
    passHash: '35572545026f692fad13236913e68b2d4378a54f7e10b99a6bba2953fed73cc7',
    nombre: 'Coordinación Ambiental Feria',
    roles: ['VISUALIZADOR_PUBLICO'],
    empresa: 'corferias',
    organizacion: 'Corferias Bogotá',
    vistas: ['dashboard'],
    defaultView: 'tab-dashboard'
  }
];

const NOMBRES_EMPRESA = {
  todas: 'OTech AirNet S.A.S. (Red Global)',
  ecopetrol: 'Ecopetrol S.A.',
  alpina: 'Alpina Productos Alimenticios S.A.',
  corferias: 'Corferias Bogotá'
};

function construirDatosEmpresa(empresaKey) {
  const core = window.OTechCore;
  const todas = (core?.ESTACIONES_BASE_OTECH || []).map(e => ({
    ...e,
    conexion: new Date().toISOString()
  }));
  const filtradas = empresaKey === 'todas'
    ? todas
    : todas.filter(e => e.empresa === empresaKey);
  const serialesSet = new Set(filtradas.map(e => e.serial));

  const estaciones = filtradas.map(e => ({
    serial: e.serial,
    empresa: e.empresa,
    empresaNombre: e.empresaNombre,
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
  }));

  const serie = [];
  const now = Date.now();
  for (let h = 48; h >= 0; h--) {
    const fecha = new Date(now - h * 3600000).toISOString();
    for (const e of filtradas) {
      const offset = e.serial.charCodeAt(e.serial.length - 1);
      const humVal = Math.min(96, Math.max(30, +(e.base.hum + Math.cos((h + offset) / 4.5) * 14).toFixed(1)));
      const tempVal = +(e.base.temp + Math.sin((h + offset) / 6.0) * 3.5).toFixed(1);

      const pm25Raw = Math.max(2, +(e.base.pm25 * 1.12 + Math.sin((h + offset) / 3.5) * (e.base.pm25 * 0.28)).toFixed(1));
      const pm25Comp = core ? core.aplicarKappaKohler(pm25Raw, humVal) : +(pm25Raw * 0.92).toFixed(1);
      serie.push({ serial: e.serial, variable: 'PM2_5', fecha, valor: pm25Comp, crudo: pm25Raw, unidad: 'µg/m³' });

      const pm10Raw = Math.max(4, +(e.base.pm10 * 1.10 + Math.sin((h + offset) / 4.0) * (e.base.pm10 * 0.24)).toFixed(1));
      const pm10Comp = core ? core.aplicarKappaKohler(pm10Raw, humVal) : +(pm10Raw * 0.93).toFixed(1);
      serie.push({ serial: e.serial, variable: 'PM10', fecha, valor: pm10Comp, crudo: pm10Raw, unidad: 'µg/m³' });

      serie.push({ serial: e.serial, variable: 'HUM', fecha, valor: humVal, crudo: humVal, unidad: '%' });
      serie.push({ serial: e.serial, variable: 'TEMP', fecha, valor: tempVal, crudo: tempVal, unidad: '°C' });
    }
  }

  const reglasBase = [
    { id: 'reg-1', serial: 'OT-MOVI-04', variable: 'PM2_5', operador: '>', umbral: 55.0, severidad: 'CONTINGENCIA_CRITICA', activa: true },
    { id: 'reg-2', serial: 'OT-INDU-02', variable: 'PM10', operador: '>', umbral: 54.0, severidad: 'ALERTA_FASE_1', activa: true },
    { id: 'reg-3', serial: 'OT-CHIA-07', variable: 'PM2_5', operador: '>', umbral: 25.0, severidad: 'PREVENTIVO', activa: true },
    { id: 'reg-4', serial: 'TODAS', variable: 'HUM', operador: '>', umbral: 75.0, severidad: 'INFORMATIVO', activa: true }
  ];

  const alertasBase = [
    { id: 'alt-1', serial: 'OT-MOVI-04', fecha: new Date(Date.now() - 7200000).toISOString(), variable: 'PM2_5', umbral: 55.0, maximo: 58.2, estado: 'ABIERTO', bitacora: '' },
    { id: 'alt-2', serial: 'OT-INDU-02', fecha: new Date(Date.now() - 36000000).toISOString(), variable: 'PM10', umbral: 54.0, maximo: 55.6, estado: 'EN_MITIGACION', bitacora: 'Revisión de flujo de aire y compensación κ-Köhler en curso.' },
    { id: 'alt-3', serial: 'OT-CHIA-07', fecha: new Date(Date.now() - 64800000).toISOString(), variable: 'PM2_5', umbral: 12.0, maximo: 14.1, estado: 'RECONOCIDO', bitacora: 'Monitoreo preventivo por pico matutino de tráfico.' },
    { id: 'alt-4', serial: 'OT-CORF-01', fecha: new Date(Date.now() - 86400000).toISOString(), variable: 'HUM', umbral: 75.0, maximo: 78.5, estado: 'RESUELTO', bitacora: 'Compensación higroscópica validada sin falsa alarma.' }
  ];

  const ordenesBase = [
    { id: 'ord-1', serial: 'OT-MOVI-04', fecha: new Date(Date.now() + 86400000).toISOString(), tipo: 'HOT_SWAP_CARTUCHO', tecnico: 'Jamyson Steven Rolón', estado: 'PROGRAMADA', duracion: null, observaciones: 'Sustitución preventiva módulo SPS30.' },
    { id: 'ord-2', serial: 'OT-INDU-02', fecha: new Date(Date.now() + 172800000).toISOString(), tipo: 'INSPECCION_BATERIA', tecnico: 'Téc. Andrea Silva', estado: 'PROGRAMADA', duracion: null, observaciones: 'Limpieza escudo Stevenson.' },
    { id: 'ord-3', serial: 'OT-ALPI-05', fecha: new Date(Date.now() - 86400000).toISOString(), tipo: 'CALIBRACION_OPTICA', tecnico: 'Téc. Laura Gómez', estado: 'COMPLETADA', duracion: 2, observaciones: 'Contrastada vs BAM-1020 sin desviación.' },
    { id: 'ord-4', serial: 'OT-CORF-01', fecha: new Date(Date.now() - 259200000).toISOString(), tipo: 'HOT_SWAP_CARTUCHO', tecnico: 'Jamyson Steven Rolón', estado: 'COMPLETADA', duracion: 1, observaciones: 'Recambio modular Hot-Swap en 1.4 min (Meta RNF-05 OK).' }
  ];

  const calBase = [
    { serial: 'OT-CORF-01', variable: 'PM2_5', patron: 'Met One BAM-1020 CAMS #04', pendiente: 1.0021, offset_cero: -0.1400, certificado: 'CERT-OT-2026-019', fecha: new Date(Date.now() - 432000000).toISOString() },
    { serial: 'OT-AERO-03', variable: 'PM10', patron: 'Met One BAM-1020 CAMS #04', pendiente: 0.9968, offset_cero: 0.2100, certificado: 'CERT-OT-2026-018', fecha: new Date(Date.now() - 86400000).toISOString() },
    { serial: 'OT-ALPI-05', variable: 'HUM', patron: 'Vaisala HMP155 Referencia', pendiente: 1.0040, offset_cero: 0.3500, certificado: 'CERT-OT-2026-015', fecha: new Date(Date.now() - 1296000000).toISOString() }
  ];

  return {
    organizacion: NOMBRES_EMPRESA[empresaKey] || 'Empresa',
    estaciones,
    serie,
    reglas: reglasBase.filter(r => r.serial === 'TODAS' || serialesSet.has(r.serial)),
    alertas: alertasBase.filter(a => serialesSet.has(a.serial)),
    ordenes: ordenesBase.filter(o => serialesSet.has(o.serial)),
    calibraciones: calBase.filter(c => serialesSet.has(c.serial)),
    reportes: [
      {
        tipo: `Cumplimiento Res. 2254/2017 · ${NOMBRES_EMPRESA[empresaKey] || 'Red'}`,
        inicio: '2026-10-01',
        fin: '2026-10-31',
        hash: '7e4c9a12b8f04421d9e3c78201a54f118b6a2c44d910e3f2a1b4c8d9e0f12345',
        archivo: 'data:text/plain;base64,T1RlY2ggQWlyTmV0IC0gQ2VydGlmaWNhZG8gZGUgQ2FsaWRhZCBkZWwgQWlyZQ=='
      }
    ]
  };
}

function lockPortal(message = '') {
  if (typeof limpiarEmpresa === 'function') limpiarEmpresa();
  currentUser = null;
  window.isDemoSession = false;
  allowedTabs.clear();
  const wrapOrgAdmin = document.getElementById('wrap-org-admin');
  if (wrapOrgAdmin) wrapOrgAdmin.classList.add('hidden');
  portal.hidden = true;
  login.hidden = false;
  statusLogin.textContent = message;
}

function activarInterfazPerfil(perfil, datos, esCloud, empresaSeleccionada) {
  allowedTabs.clear();
  perfil.vistas.forEach(view => allowedTabs.add('tab-' + view));
  document.querySelectorAll('[data-view]').forEach(el => {
    el.hidden = !allowedTabs.has(el.dataset.view);
  });
  document.querySelectorAll('.tab-content').forEach(section => {
    section.hidden = !allowedTabs.has(section.id);
  });

  document.getElementById('profile-name').textContent = perfil.nombre;
  document.getElementById('profile-roles').textContent = perfil.perfiles.join(' · ');
  document.getElementById('profile-org').textContent = empresaSeleccionada
    ? (NOMBRES_EMPRESA[empresaSeleccionada] || perfil.organizacion)
    : perfil.organizacion;

  const wrapOrgAdmin = document.getElementById('wrap-org-admin');
  const selOrgAdmin = document.getElementById('select-org-admin');
  const esSuperAdmin = perfil.vistas.includes('database');
  if (wrapOrgAdmin && selOrgAdmin) {
    if (esSuperAdmin && !esCloud) {
      wrapOrgAdmin.classList.remove('hidden');
      selOrgAdmin.value = empresaSeleccionada || 'todas';
      selOrgAdmin.onchange = () => {
        const orgKey = selOrgAdmin.value;
        document.getElementById('profile-org').textContent = NOMBRES_EMPRESA[orgKey] || perfil.organizacion;
        mostrarEmpresa(construirDatosEmpresa(orgKey));
      };
    } else {
      wrapOrgAdmin.classList.add('hidden');
    }
  }

  setTelemetryModeBadge(esCloud ? 'Supabase Cloud (Multi-Tenant)' : 'Sesión Verificada (Local)', esCloud);
  const active = portal.querySelector('.tab-content:not(.hidden)')?.id;
  login.hidden = true;
  portal.hidden = false;
  mostrarEmpresa(datos);
  const target = (active && allowedTabs.has(active)) ? active : (perfil.defaultView || 'tab-dashboard');
  if (typeof switchTab === 'function') switchTab(target);
  window.lucide?.createIcons();
}

async function loadProfile(session) {
  const request = ++revision;
  if (!session) {
    const emailLocal = (() => { try { return window.sessionStorage.getItem('otech_auth_email'); } catch { return null; } })();
    if (emailLocal) {
      const cuenta = CUENTAS_CORPORATIVAS.find(c => c.email === emailLocal);
      if (cuenta) {
        currentUser = 'local-' + cuenta.email;
        window.isDemoSession = true;
        activarInterfazPerfil(
          { nombre: cuenta.nombre, organizacion: cuenta.organizacion, perfiles: cuenta.roles, vistas: cuenta.vistas, defaultView: cuenta.defaultView },
          construirDatosEmpresa(cuenta.empresa),
          false,
          cuenta.empresa
        );
        return;
      }
    }
    lockPortal();
    return;
  }

  if (currentUser !== session.user.id) lockPortal('Comprobando acceso…');
  try {
    const { data, error } = await portalAuth.rpc('mi_acceso_portal').maybeSingle();
    if (request !== revision) return;
    if (error) throw error;
    if (!data || !data.vistas?.length) {
      lockPortal('Tu cuenta aún no tiene acceso. Pide al administrador que revise tu organización y roles.');
      return;
    }

    const respuesta = await portalAuth.rpc('panel_empresa');
    if (request !== revision) return;
    if (respuesta.error) throw respuesta.error;

    currentUser = session.user.id;
    window.isDemoSession = false;
    activarInterfazPerfil(data, respuesta.data, true);
  } catch {
    if (request === revision) lockPortal('No se pudo verificar el perfil en Supabase.');
  }
}

if (portalAuth) {
  portalAuth.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => loadProfile(session), 0);
  });
  statusLogin.textContent = 'Listo para autenticar con tu cuenta corporativa.';
} else {
  statusLogin.textContent = 'Modo Offline: inicia sesión con tus credenciales corporativas.';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const email = form.elements.email.value.trim().toLowerCase();
  const password = form.elements.password.value;
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  statusLogin.textContent = 'Verificando credenciales…';

  try {
    let autenticadoSupabase = false;
    if (portalAuth) {
      try {
        const { data, error } = await portalAuth.auth.signInWithPassword({ email, password });
        if (!error && data?.session) {
          autenticadoSupabase = true;
        }
      } catch {}
    }

    if (!autenticadoSupabase) {
      const hashIngresado = window.OTechCore?.computarHashSHA256
        ? await window.OTechCore.computarHashSHA256(password)
        : '';
      const cuenta = CUENTAS_CORPORATIVAS.find(c => c.email === email && c.passHash === hashIngresado);
      if (!cuenta) {
        statusLogin.textContent = 'Credenciales inválidas. Verifica tu correo y contraseña.';
        return;
      }
      try { window.sessionStorage.setItem('otech_auth_email', cuenta.email); } catch {}
      currentUser = 'local-' + cuenta.email;
      window.isDemoSession = true;
      activarInterfazPerfil(
        { nombre: cuenta.nombre, organizacion: cuenta.organizacion, perfiles: cuenta.roles, vistas: cuenta.vistas, defaultView: cuenta.defaultView },
        construirDatosEmpresa(cuenta.empresa),
        false,
        cuenta.empresa
      );
    }
  } catch {
    statusLogin.textContent = 'Error al intentar iniciar sesión.';
  } finally {
    form.elements.password.value = '';
    submit.disabled = false;
  }
});

document.getElementById('logout').addEventListener('click', async () => {
  ++revision;
  try { window.sessionStorage.removeItem('otech_auth_email'); } catch {}
  lockPortal('Sesión cerrada correctamente.');
  if (portalAuth) {
    await portalAuth.auth.signOut({ scope: 'local' }).catch(() => {});
  }
});

const btnTogglePass = document.getElementById('toggle-password');
if (btnTogglePass) {
  btnTogglePass.addEventListener('click', () => {
    const pwdInput = document.getElementById('password');
    if (!pwdInput) return;
    pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
  });
}

window.addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
});
