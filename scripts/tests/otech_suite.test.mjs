import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const OTechCore = require(path.join(ROOT, 'plataforma_web', 'airnet-core.js'));

describe('OTech AirNet Core — Física κ-Köhler, AQI y Reglas', () => {
  it('mantiene lecturas sin alterar cuando HR <= 75%', () => {
    assert.equal(OTechCore.aplicarKappaKohler(30, 50), 30);
    assert.equal(OTechCore.aplicarKappaKohler(15.4, 75), 15.4);
  });

  it('aplica compensación higroscópica cuando HR > 75%', () => {
    const corr90 = OTechCore.aplicarKappaKohler(30, 90);
    assert.equal(corr90, 21.8);
    assert.ok(corr90 < 30 && corr90 > 0);
  });

  it('maneja valores nulos o inválidos de forma segura en aplicarKappaKohler', () => {
    assert.equal(OTechCore.aplicarKappaKohler(null, 80), null);
    assert.equal(OTechCore.aplicarKappaKohler('abc', 80), null);
    assert.equal(OTechCore.aplicarKappaKohler(25, null), 25);
  });

  it('calcula AQI EPA para PM2.5 en los tramos normativos', () => {
    assert.equal(OTechCore.calcularAQI_PM25(0), 0);
    assert.equal(OTechCore.calcularAQI_PM25(12.0), 50);
    assert.equal(OTechCore.calcularAQI_PM25(35.4), 100);
    assert.equal(OTechCore.calcularAQI_PM25(55.4), 150);
    assert.equal(OTechCore.calcularAQI_PM25(150.4), 200);
    assert.equal(OTechCore.calcularAQI_PM25(-1), null);
    assert.equal(OTechCore.calcularAQI_PM25(null), null);
  });

  it('clasifica colores y etiquetas AQI correctamente por variable y valor', () => {
    const buena = OTechCore.getAQIInfo('pm25', 10);
    assert.equal(buena.color, '#10b981');
    assert.equal(buena.etiqueta, 'Buena');

    const moderada = OTechCore.getAQIInfo('pm25', 25);
    assert.equal(moderada.color, '#eab308');

    const danina = OTechCore.getAQIInfo('pm25', 65);
    assert.equal(danina.color, '#ef4444');

    const sinDatos = OTechCore.getAQIInfo('pm25', null);
    assert.equal(sinDatos.etiqueta, 'Sin Datos');
  });

  it('evalúa operadores de reglas de umbral (>, >=, <, <=)', () => {
    assert.equal(OTechCore.evaluarRegla(35.1, '>', 35), true);
    assert.equal(OTechCore.evaluarRegla(35, '>', 35), false);
    assert.equal(OTechCore.evaluarRegla(35, '>=', 35), true);
    assert.equal(OTechCore.evaluarRegla(10, '<', 15), true);
    assert.equal(OTechCore.evaluarRegla(15, '<=', 15), true);
    assert.equal(OTechCore.evaluarRegla('nan', '>', 10), false);
  });

  it('computa SHA-256 coincidente con Node crypto estándar', async () => {
    const sample = 'OTech-AirNet-Report-2026';
    const expected = crypto.createHash('sha256').update(sample, 'utf8').digest('hex');
    const actual = await OTechCore.computarHashSHA256(sample);
    assert.equal(actual, expected);
    assert.match(actual, /^[0-9a-f]{64}$/);
  });

  it('proyecta tendencia a 24h y detecta anomalías de red de forma predictiva', () => {
    const serie = [12, 14, 16, 19, 21, 24];
    const proy = OTechCore.proyectarTendencia24h(serie, 6);
    assert.equal(proy.length, 6);
    assert.ok(proy[0] > 24);

    const anomalias = OTechCore.detectarAnomaliasRed([
      { serial: 'OT-1', sede: 'A', bateria: 98, estado: 'OPERATIVO_ONLINE', lecturas: { PM2_5: 12 } },
      { serial: 'OT-2', sede: 'B', bateria: 96, estado: 'OPERATIVO_ONLINE', lecturas: { PM2_5: 14 } },
      { serial: 'OT-3', sede: 'C', bateria: 80, estado: 'ADVERTENCIA_MODERADA', lecturas: { PM2_5: 48 } }
    ]);
    assert.ok(anomalias.some(a => a.serial === 'OT-3' && a.tipo === 'BATERIA_BAJA'));
    assert.ok(anomalias.some(a => a.serial === 'OT-3' && a.tipo === 'POSIBLE_DERIVA_OPTICA'));
  });
});

describe('OTech AirNet Core — Catálogo Canónico de 8 Estaciones', () => {
  it('contiene exactamente 8 estaciones únicas en coordenadas de Bogotá / Sabana', () => {
    const estaciones = OTechCore.ESTACIONES_BASE_OTECH;
    assert.equal(estaciones.length, 8);

    const seriales = new Set(estaciones.map(e => e.serial));
    assert.equal(seriales.size, 8);

    for (const est of estaciones) {
      assert.match(est.serial, /^OT-/);
      assert.ok(est.lat >= 4.4 && est.lat <= 5.1, `Lat fuera de rango en ${est.serial}: ${est.lat}`);
      assert.ok(est.lon >= -74.4 && est.lon <= -73.8, `Lon fuera de rango en ${est.serial}: ${est.lon}`);
      assert.ok(est.chip_id && est.modelo && est.firmware && est.manufactura);
      assert.ok(Array.isArray(est.sensores) && est.sensores.length >= 2);
    }
  });
});

describe('Offline Readiness, Enlaces Locales y Contratos DOM/JS', () => {
  const htmlFiles = [
    'index.html',
    'gemelo_digital_3d/index.html',
    'plataforma_web/portal.html',
    'plataforma_web/publico.html',
    'plataforma_web/mapa-estaciones.html',
    'plataforma_web/index.html'
  ];

  it('no usa CDNs externos en archivos HTML activos y todos los assets locales existen', () => {
    const forbiddenCdns = [
      'cdn.tailwindcss.com',
      'cdn.jsdelivr.net',
      'unpkg.com',
      'cdnjs.cloudflare.com'
    ];

    for (const relHtml of htmlFiles) {
      const absHtml = path.join(ROOT, relHtml);
      assert.ok(fs.existsSync(absHtml), `Falta HTML: ${relHtml}`);
      const content = fs.readFileSync(absHtml, 'utf8');

      for (const cdn of forbiddenCdns) {
        assert.equal(
          content.includes(cdn),
          false,
          `${relHtml} aún referencia CDN externo bloqueable offline: ${cdn}`
        );
      }

      const attrRegex = /(?:src|href)=["']([^"']+)["']/gi;
      let match;
      while ((match = attrRegex.exec(content)) !== null) {
        const ref = match[1].trim();
        if (!ref || ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('#') || ref.startsWith('data:') || ref.startsWith('mailto:')) {
          continue;
        }
        const cleanRef = ref.split('?')[0].split('#')[0];
        const targetPath = path.resolve(path.dirname(absHtml), cleanRef);
        assert.ok(fs.existsSync(targetPath), `Enlace roto en ${relHtml}: ${ref} -> ${targetPath}`);
      }
    }
  });

  it('verifica librerías vendored en assets/vendor/ y limpieza de archivos obsoletos', () => {
    const requiredVendors = [
      'assets/vendor/tailwindcss.js',
      'assets/vendor/chart.umd.min.js',
      'assets/vendor/lucide.min.js',
      'assets/vendor/supabase.js',
      'assets/vendor/three/three.min.js',
      'assets/vendor/three/controls/OrbitControls.js',
      'assets/vendor/three/exporters/OBJExporter.js',
      'assets/vendor/three/exporters/STLExporter.js',
      'assets/vendor/three/shaders/CopyShader.js',
      'assets/vendor/three/shaders/FXAAShader.js',
      'assets/vendor/three/shaders/LuminosityHighPassShader.js',
      'assets/vendor/three/postprocessing/EffectComposer.js',
      'assets/vendor/three/postprocessing/RenderPass.js',
      'assets/vendor/three/postprocessing/ShaderPass.js',
      'assets/vendor/three/postprocessing/UnrealBloomPass.js'
    ];

    for (const rel of requiredVendors) {
      const abs = path.join(ROOT, rel);
      assert.ok(fs.existsSync(abs), `Falta librería vendored: ${rel}`);
      assert.ok(fs.statSync(abs).size > 500, `Librería vendored vacía o truncada: ${rel}`);
    }

    assert.equal(fs.existsSync(path.join(ROOT, 'scripts/utilidades/three.test.js')), false);
    assert.ok(fs.existsSync(path.join(ROOT, 'plataforma_web/bogota-base.svg')));
  });

  it('portal.html expone todos los IDs requeridos por panel-empresa.js y portal-auth.js', () => {
    const portalHtml = fs.readFileSync(path.join(ROOT, 'plataforma_web', 'portal.html'), 'utf8');
    const requiredIds = [
      'telemetry-mode-dot',
      'telemetry-mode-label',
      'badge-online-count',
      'badge-alertas-count',
      'cantidad-alertas',
      'toast-otech',
      'modal-ficha-equipo',
      'btn-cerrar-ficha',
      'ficha-titulo',
      'ficha-chip',
      'ficha-modelo',
      'ficha-firmware',
      'ficha-energia',
      'ficha-comunicacion',
      'ficha-manufactura',
      'ficha-sensores-body',
      'btn-autodiagnostico',
      'ficha-diagnostico-res',
      'chk-comparar-kohler',
      'chk-limite-oms',
      'stats-kpi-bar',
      'form-regla-alerta',
      'regla-serial',
      'regla-variable',
      'regla-operador',
      'regla-umbral',
      'regla-severidad',
      'reglas-empresa',
      'form-nueva-orden',
      'orden-serial',
      'orden-tipo',
      'orden-fecha',
      'orden-obs',
      'calibraciones-empresa',
      'form-generar-reporte',
      'rep-tipo',
      'rep-inicio',
      'rep-fin',
      'panel-predictivo',
      'equipo-comparar',
      'chk-pronostico-24h',
      'btn-toggle-theme',
      'btn-toggle-sound',
      'btn-ver-en-3d'
    ];

    for (const id of requiredIds) {
      assert.ok(portalHtml.includes(`id="${id}"`), `Falta id="${id}" en plataforma_web/portal.html`);
    }
  });

  it('gemelo_digital_3d/index.html incluye clima smog, tour guiado, pill de telemetría y airnet-core.js', () => {
    const html3d = fs.readFileSync(path.join(ROOT, 'gemelo_digital_3d', 'index.html'), 'utf8');
    assert.ok(html3d.includes('data-weather="smog"'));
    assert.ok(html3d.includes('id="btn-plant-tour"'));
    assert.ok(html3d.includes('id="hud-live-telemetry-badge"'));
    assert.ok(html3d.includes('id="hud-live-telemetry-text"'));
    const idxCore = html3d.indexOf('../plataforma_web/airnet-core.js');
    const idxApp = html3d.indexOf('app.js');
    assert.ok(idxCore !== -1 && idxApp !== -1 && idxCore < idxApp, 'airnet-core.js debe cargarse antes que app.js');
  });

  it('verifica infraestructura PWA (manifest, sw.js) y workflow CI en .github/workflows/ci.yml', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'manifest.webmanifest')));
    assert.ok(fs.existsSync(path.join(ROOT, 'sw.js')));
    assert.ok(fs.existsSync(path.join(ROOT, '.github', 'workflows', 'ci.yml')));
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    assert.equal(manifest.display, 'standalone');
  });

  it('sin referencias obsoletas a ENTREGA_FINAL_OTECH_PLATAFORMA_WEB en docs y package.json', () => {
    for (const rel of ['plataforma_web/ARQUITECTURA_BASE_DATOS_Y_MOCKUPS.md', 'plataforma_web/README.md', 'database/package.json']) {
      const txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.equal(txt.includes('ENTREGA_FINAL_OTECH_PLATAFORMA_WEB'), false, `Ruta obsoleta en ${rel}`);
    }
  });

  it('todos los scripts JS activos compilan sin errores sintácticos', () => {
    const scripts = [
      'plataforma_web/airnet-core.js',
      'plataforma_web/mapa-estaciones.js',
      'plataforma_web/panel-empresa.js',
      'plataforma_web/portal-auth.js',
      'gemelo_digital_3d/app.js',
      'sw.js'
    ];
    for (const rel of scripts) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.doesNotThrow(() => new vm.Script(code, { filename: rel }));
    }
  });
});

describe('Integridad de Migraciones SQL (database/)', () => {
  it('verifica existencia, balance BEGIN/COMMIT y RPCs de 004_acciones_operativas.sql', () => {
    for (const file of ['001_inicial.sql', '002_acceso_portal.sql', '003_panel_empresa.sql', '004_acciones_operativas.sql']) {
      const abs = path.join(ROOT, 'database', file);
      assert.ok(fs.existsSync(abs), `Falta migración SQL: ${file}`);
      const sql = fs.readFileSync(abs, 'utf8');
      const begins = (sql.match(/^\s*BEGIN\s*;/gim) || []).length;
      const commits = (sql.match(/^\s*COMMIT\s*;/gim) || []).length;
      assert.equal(begins, commits, `Desbalance BEGIN/COMMIT en ${file}`);
    }

    const sql004 = fs.readFileSync(path.join(ROOT, 'database', '004_acciones_operativas.sql'), 'utf8');
    const rpcs = [
      'panel_empresa',
      'resolver_incidente_portal',
      'crear_regla_alerta_portal',
      'gestionar_orden_portal',
      'registrar_reporte_portal'
    ];
    for (const fn of rpcs) {
      assert.ok(sql004.includes(`public.${fn}(`), `Falta RPC public.${fn} en 004_acciones_operativas.sql`);
    }
  });
});

