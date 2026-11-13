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
form.querySelector('button').disabled = false;
