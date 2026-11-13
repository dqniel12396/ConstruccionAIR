# OTech AirNet S.A.S. — Plataforma Web Multi-Tenant

Plataforma web de monitoreo ambiental IoT y gestión operativa de estaciones **OTech AirNet** en Bogotá D.C., con funcionamiento completo **100% offline/local** y compatibilidad total con **Supabase PostgreSQL**.

## Archivos principales

- `portal.html`: Aplicación unificada multi-rol (7 módulos: Dashboard Geoespacial, Gestión IoT + Ficha Hardware `ATECC608A`, Analítica $\kappa$-Köhler & OMS, Reglas & Alertas, Mantenimiento Hot-Swap & Calibraciones, Reportes con firma `SHA-256` e impresión PDF, y Modelo ER).
- `index.html`: Redirección automática hacia `portal.html`.
- `airnet-core.js`: Núcleo compartido de física ($\kappa$-Köhler), cálculo AQI EPA, catálogo canónico de 8 estaciones, motor de evaluación de reglas y cómputo `SHA-256`.
- `portal-auth.js`: Autenticación real con Supabase y acceso rápido en 1 clic por rol con fallback offline resiliente.
- `panel-empresa.js` & `panel-empresa.css`: Lógica interactiva CRUD (RPCs + demo local) y recepción en vivo desde el Gemelo Digital 3D vía `BroadcastChannel('otech-airnet-sync')`.
- `mapa-estaciones.html` & `mapa-estaciones.js` & `bogota-base.svg`: Mapa interactivo Leaflet con capa vectorial local automática ante ausencia de conexión a internet.
- `ARQUITECTURA_BASE_DATOS_Y_MOCKUPS.md`: Documentación de arquitectura del esquema de base de datos y módulos de interfaz.
