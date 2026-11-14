# Documentación Técnica Completa — Ecosistema OTech AirNet S.A.S.

Guía consolidada de arquitectura, operación, sincronización 3D ↔ Web, analítica ambiental, base de datos, modo offline/PWA y pruebas automatizadas del proyecto **OTech AirNet S.A.S.**

---

## 1. Estructura del Proyecto

```text
├── index.html                        # Hub central del ecosistema (acceso a Web, Público y Gemelo 3D)
├── manifest.webmanifest              # Manifiesto PWA instalable (modo standalone)
├── sw.js                             # Service Worker para caché y operación 100% offline
├── README.md                         # Presentación general del repositorio
├── .github/workflows/ci.yml          # Pipeline CI (verificación sintaxis JS + suite QA en Node)
├── assets/vendor/                    # Librerías JS locales (Tailwind, Chart.js, Lucide, Supabase, Three.js r128)
├── database/                         # Migraciones PostgreSQL / Supabase (001..004) y package.json de pruebas
├── plataforma_web/
│   ├── portal.html                   # Plataforma Corporativa Multi-Tenant (7 módulos + acceso 1-clic por rol)
│   ├── publico.html                  # Portal Ciudadano (semáforo AQI sin login + recomendaciones de salud)
│   ├── index.html                    # Redirección automática hacia portal.html
│   ├── airnet-core.js                # Núcleo compartido: κ-Köhler, AQI EPA, catálogo 8 estaciones, SHA-256, pronóstico
│   ├── panel-empresa.js              # Lógica CRUD, gráficas Chart.js, predictivo, tema claro/oscuro y sync 3D
│   ├── panel-empresa.css             # Estilos NOC oscuro + tema claro + modales/badges/toasts
│   ├── portal-auth.js                # Autenticación Supabase con fallback offline automático (1-clic por rol)
│   ├── mapa-estaciones.html / .js    # Mapa Leaflet con capa vectorial local automática (bogota-base.svg)
│   └── bogota-base.svg               # Mapa vectorial local de Bogotá para operación sin internet
├── gemelo_digital_3d/
│   ├── index.html                    # Interfaz WebGL Three.js (Estación Exterior IP65 + Planta Industrial 2 pisos)
│   ├── app.js                        # Motor 3D, pantalla OLED dinámica, climas, Tour Guiado y sync bidireccional
│   └── styles.css                    # HUD Glassmorphism del visor 3D
├── scripts/tests/
│   └── otech_suite.test.mjs          # Suite automatizada (17 pruebas unitarias y de integración estática)
└── documentacion/                    # Informes SDLC, plan de negocio, presentaciones y prototipos
```

---

## 2. Cómo Ejecutar el Proyecto y las Pruebas

### Servidor local (obligatorio para BroadcastChannel, Service Worker y módulos locales)
Desde una terminal PowerShell en la raíz del repositorio:

```powershell
python -m http.server 8080
```

URLs principales en el navegador:
- **Portal Central (Hub):** `http://localhost:8080/index.html`
- **Plataforma Corporativa:** `http://localhost:8080/plataforma_web/portal.html`
- **Portal Ciudadano (Público):** `http://localhost:8080/plataforma_web/publico.html`
- **Gemelo Digital 3D:** `http://localhost:8080/gemelo_digital_3d/index.html`

### Suite de pruebas automatizadas (QA)
```powershell
npm --prefix database test
```
*(Ejecuta `node --test ../scripts/tests/otech_suite.test.mjs` con 17 pruebas que validan cálculos físicos, catálogo de estaciones, enlaces locales sin CDNs externos, contratos de IDs DOM, sintaxis JS y balance de transacciones SQL.)*

---

## 3. Plataforma Web Corporativa (`plataforma_web/portal.html`)

### Acceso Rápido por Rol (1-Clic y Supabase Auth)
`portal-auth.js` soporta tanto autenticación real contra **Supabase** como acceso inmediato local/offline (cuando no hay conexión o `window.supabase` no está disponible):
- **Super Admin** (7 vistas)
- **Admin Empresa** (6 vistas)
- **Analista Ambiental** (4 vistas)
- **Técnico de Campo** (4 vistas)
- **Visualizador Público** (tablero y mapa)

### Módulos Operativos
1. **Tablero Central & Mapa (`#tab-dashboard`)**:
   - 5 KPIs dinámicos (Estaciones Totales, Sedes, Equipos Operativos, Alertas Sin Resolver, AQI Máximo).
   - **Mantenimiento Predictivo (`#panel-predictivo`)**: evalúa mediante `detectarAnomaliasRed()` si alguna estación tiene batería `< 88%` o lectura PM2.5 `> 2.4x` la mediana de la red (posible deriva óptica), con botón directo para pre-llenar una orden preventiva.
   - Mapa interactivo Leaflet con las **8 estaciones canónicas** (`ESTACIONES_BASE_OTECH`) y tabla de últimas lecturas.
2. **Gestión de Aparatos IoT (`#tab-dispositivos`)**:
   - Buscador por serial/sede, exportación CSV y **Ficha Técnica de Hardware (`#modal-ficha-equipo`)** con chip criptográfico `ATECC608A`, firmware, energía LiFePO4, comunicación LoRaWAN, lotes de manufactura (`IP65`, `Cámara Gas`, `Burn-In 48h`), tabla de sensores instalados, **Autodiagnóstico Remoto (`#btn-autodiagnostico`)** y botón **Ver en Gemelo 3D (`#btn-ver-en-3d`)**.
3. **Analítica Histórica & $\kappa$-Köhler (`#tab-estadisticas`)**:
   - Gráfica Chart.js comparando lectura **Cruda Óptica** vs. **Compensada $\kappa$-Köhler** ($HR > 75\%$).
   - **Comparador Multi-Estación (`#equipo-comparar`)** para superponer dos estaciones simultáneamente.
   - **Límites Normativos (`#chk-limite-oms`)** OMS / Res. 2254 (`15 µg/m³` PM2.5 / `45 µg/m³` PM10).
   - **Pronóstico +24h (`#chk-pronostico-24h`)** basado en media móvil ponderada (`proyectarTendencia24h`).
4. **Reglas & Alertas (`#tab-alertas`)**:
   - Resolución y acuse de incidentes con registro de bitácora, más formulario `#form-regla-alerta` para crear reglas personalizadas (`>`, `>=`, `<`, `<=`) por estación y severidad.
5. **Mantenimiento Hot-Swap & Calibraciones (`#tab-mantenimiento`)**:
   - Programación de órdenes (`HOT_SWAP_CARTUCHO`, `CALIBRACION_OPTICA`, `MANTENIMIENTO_PREVENTIVO`, etc.) y cierre con medición de tiempo de intervención (meta Hot-Swap $\le 2\text{ min}$), junto con la tabla de trazabilidad metrológica.
6. **Reportes Normativos (`#tab-reportes`)**:
   - Generación de certificados firmados con hash criptográfico **`SHA-256`** (`computarHashSHA256`) y vista imprimible para exportación a PDF.
7. **Modelo ER (`#tab-database`)**:
   - Esquema relacional e inventario de tablas del sistema.

### Preferencias UI
- **Tema Claro / Oscuro (`#btn-toggle-theme`)**: alterna modo oscuro NOC y modo claro de alto contraste para exteriores o proyectores (`localStorage.otech_theme`).
- **Alerta Sonora (`#btn-toggle-sound`)**: emite un aviso sonoro vía Web Audio API si se recibe telemetría crítica (`PM2.5 > 55.4 µg/m³`).

---

## 4. Portal Ciudadano (`plataforma_web/publico.html`)

Diseñado para consulta pública sin credenciales:
- Muestra el **Índice AQI EPA** en tiempo real para cualquiera de las 8 estaciones en Bogotá y Sabana.
- Indica cumplimiento o exceso frente a la guía diaria de la **OMS (`15 µg/m³`)**.
- Despliega recomendaciones específicas para **Población General**, **Niños / Adultos Mayores / Asma** y **Actividad Física / Ciclistas**.
- Se actualiza en vivo si el **Gemelo Digital 3D** está abierto en otra pestaña.

---

## 5. Gemelo Digital 3D y Sincronización Bidireccional (`gemelo_digital_3d/`)

### Modos y Controles
- **Estación Exterior IP65**: vista explosionada, rayos X, cotas dimensionales, mástil y pantalla OLED reactiva (`drawOLEDTelemetry` sobre `window.oledCanvasTexture`).
- **Planta Industrial (2 Pisos + PTAR)**: visualización por pisos, techo (`T`), fachada P2, recorrido en Primera Persona (`WASD`, `Shift`, `Tab`, `1/2/3`, `Esc`) y **Tour Guiado Automático (`#btn-plant-tour`)** por 5 zonas clave (Fachada, Ensamble P1, Laboratorio R&D $\kappa$-Köhler P2, PTAR y Zona Logística).
- **Simulación Climática**: `Sol`, `Lluvia` (activa humedad `> 75%` demostrando la compensación $\kappa$-Köhler), `Noche` y **`Pico AQI`** (eleva el material particulado para probar alertas en tiempo real).

### Protocolo de Sincronización Web ↔ 3D
Se realiza mediante `BroadcastChannel('otech-airnet-sync')` y respaldo en `localStorage` (`otech_3d_live_telemetry`):
- **3D → Web (`type: 'telemetry_3d'`)**: cada 2.5 s (y al instante al cambiar de clima), el 3D transmite `{ serial, weather, pm25, pm25Crudo, pm10, pm10Crudo, hr, temp, aqi, fecha }`. La plataforma web, el mapa Leaflet y el portal ciudadano actualizan sus marcadores, series y KPIs sin recargar.
- **Web → 3D (`type: 'command_3d'`)**: desde la ficha técnica de un equipo en `portal.html`, al pulsar *Autodiagnóstico Remoto* o *Ver en Gemelo 3D*, se envía `{ action: 'diagnostico' | 'focus_station', serial }`, provocando respuesta visual en el anillo LED y actualización del HUD del 3D.

---

## 6. Base de Datos PostgreSQL / Supabase (`database/`)

Migraciones ordenadas en `database/`:
- `001_inicial.sql`: esquema completo de 13 tablas, tipos ENUM (`estado_dispositivo_enum`, `calidad_dato_enum`, `severidad_alerta_enum`, `estado_incidente_enum`) e índices.
- `002_acceso_portal.sql`: función `public.mi_acceso_portal()` para mapeo de roles y vistas permitidas.
- `003_panel_empresa.sql`: consulta inicial `public.panel_empresa()`.
- `004_acciones_operativas.sql`: actualización de `panel_empresa()` (hardware `ATECC608A`, sensores, manufactura, reglas y calibraciones) y 4 RPCs de escritura multi-tenant:
  - `public.resolver_incidente_portal(...)`
  - `public.crear_regla_alerta_portal(...)`
  - `public.gestionar_orden_portal(...)`
  - `public.registrar_reporte_portal(...)`

---

## 7. Operación 100% Offline y PWA

- Todas las dependencias externas (`tailwindcss.js`, `chart.umd.min.js`, `lucide.min.js`, `supabase.js` y `three/` r128) están alojadas localmente en `assets/vendor/`.
- Ningún HTML activo depende de CDNs externos para funcionar.
- El mapa Leaflet cambia automáticamente al mapa vectorial local (`plataforma_web/bogota-base.svg`) si fallan los tiles de internet (`tileerror`), y ofrece la capa manual `"🧭 Vector Local (Offline)"`.
- Con `manifest.webmanifest` y `sw.js`, la aplicación puede instalarse como PWA en escritorio o móvil.
