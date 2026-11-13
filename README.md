# OTech AirNet 🌿 — Gemelo Digital 3D & Ecosistema de Monitoreo Ambiental IoT

> **Proyecto de Modelo de Construcción de Software & Ciclo de Vida (SDLC - Fase 1)**  
> **Universidad Distrital Francisco José de Caldas — Facultad de Ingeniería de Sistemas**  
> **Docente:** Leonardo Molina  
> **Integrantes:**  
> - Juan José León Gómez (20212020055)  
> - Daniel Sanabria Rivera (20242020046)  
> - Jamyson Steven Rolón Castaño (20222020163)  
>  
> **Repositorio Oficial:** `git@github.com:dqniel12396/visualplantasoftare.git`  
> **GitHub Pages:** [https://dqniel12396.github.io/visualplantasoftare/](https://dqniel12396.github.io/visualplantasoftare/)  

---

## 🚀 Resumen del Ecosistema

**OTech AirNet** integra dos piezas de ingeniería interactiva:
1. **Gemelo Digital 3D de Alta Fidelidad (Three.js / WebGL):**
   - **Nodo Exterior IP65:** Cúpula solar monocristalina con 4 busbars, bisel de aluminio CNC, pantalla Display OLED en vivo, anillo LED difusor 360° con efecto respiración, bandeja modular Hot-Swap con micro-turbina SPS30 activa, sensor NDIR dorado de $\text{CO}_2$, pack dual $\text{LiFePO}_4$ y cámara Stevenson aerodinámica de 6 anillos con drenaje.
   - **Complejo Industrial y Planta de Producción Lean (500 uds/mes):** Nave industrial de 2 plantas, celdas de manufactura Yamazumi, oficinas corporativas, **planta de tratamiento de aguas residuales (PTAR)** con 3 tanques cilíndricos y bombas, **canales perimetrales de drenaje con rejillas metálicas**, **parqueadero ampliado** con bahías EV y PMR, zona techada de motos/bicis y **zonas verdes extendidas con senderos peatonales**.
2. **Plataforma Web OTech AirNet Cloud (Portal Multi-Tenant):** Portal corporativo para empresas (Ecopetrol, Alpina, Corferias, TransMilenio) con mapa georreferenciado, series temporales TimescaleDB y compensación higroscópica $\kappa$-Köhler.

---

## 🌐 Cómo Activar y Visualizar en GitHub Pages

Este repositorio está preparado para **GitHub Pages** sin configuraciones complejas:

1. Ve a la pestaña **Settings** (Configuración) de tu repositorio en GitHub:  
   `https://github.com/dqniel12396/visualplantasoftare/settings/pages`
2. En la sección **Build and deployment**:
   - **Source:** Selecciona `Deploy from a branch`.
   - **Branch:** Selecciona `main` y carpeta `/ (root)`.
3. Haz clic en **Save** (Guardar).
4. En 1-2 minutos tu aplicación estará publicada en vivo en:  
   `https://dqniel12396.github.io/visualplantasoftare/`

---

## 📂 Estructura Arquitectónica del Proyecto

```text
├── index.html                           # Portal Central y Lanzador de Aplicaciones (GitHub Pages Hub)
├── README.md                            # Guía y documentación general del proyecto
├── .gitignore                           # Exclusiones estándar de Git
│
├── 📁 gemelo_digital_3d/                # Gemelo Digital 3D de Alta Fidelidad (Three.js / WebGL)
│   ├── index.html                       # Visor 3D: Planta de Producción Lean & Estación Exterior IP65
│   ├── app.js                           # Motor Three.js: Pipeline PBR, Post-processing Bloom/FXAA y Simulación
│   └── styles.css                       # Estilos glassmorphism y controles de ingeniería (WASD, Floorplan)
│
├── 📁 plataforma_web/                   # Plataforma Web Cloud IoT Multi-Tenant
│   ├── portal.html                      # Portal Corporativo con Acceso Rápido por Rol (1-Clic sin claves)
│   ├── portal-auth.js                   # Lógica de autenticación RBAC y perfiles de demostración
│   ├── panel-empresa.js                 # Telemetría en vivo, gráficos Chart.js y mapa Leaflet
│   ├── panel-empresa.css                # Estilos visuales de la plataforma cloud
│   ├── mapa-estaciones.html             # Mapa geoespacial de estaciones en tiempo real (Leaflet / Esri)
│   ├── mapa-estaciones.js               # Dispersión de contaminantes y capas GIS
│   ├── bogota-base.svg                  # Capa vectorial de referencia geográfica
│   ├── diagrama_bases_datos_otech.png   # Diagrama Entidad-Relación HD (PostgreSQL + TimescaleDB)
│   └── schema_database_otech.sql        # Script DDL de persistencia y particionamiento
│
├── 📁 cad_models/                       # Modelos CAD 3D y piezas paramétricas
│   ├── *.stl                            # Cúpula, Gabinete IP65, Bandeja, Cámara Stevenson, Soporte
│   ├── *.obj, *.mtl                     # Mallas 3D de la Estación y Complejo Industrial
│   ├── *.scad                           # Scripts OpenSCAD de modelado geométrico
│   └── *.ipt                            # Modelos de ensamblaje Autodesk Inventor
│
├── 📁 documentacion/                    # Documentación académica y de negocio
│   ├── 📁 informes_sdlc/                # Informes del Ciclo de Vida del Software (PDF y Markdown)
│   ├── 📁 plan_de_negocio/              # Plan de negocio y constitución empresarial
│   ├── 📁 presentaciones/               # Diapositivas y material de sustentación
│   └── 📁 prototipos/                   # Prototipos y mockups interactivos iniciales
│
├── 📁 database/                         # Migraciones SQL y configuración de conexión
│   ├── 001_inicial.sql, 002_acceso_portal.sql, 003_panel_empresa.sql
│   ├── activar_timescaledb.sql, demo_empresas.sql
│   ├── package.json, conexion.cjs
│   └── supabase-ca.pem, supabase.ps1
│
├── 📁 scripts/                          # Herramientas de automatización y desarrollo
│   ├── 📁 cad/                          # Generadores de modelos CAD en Python y Fusion 360
│   ├── 📁 doc_tools/                    # Conversores y generadores de informes Markdown a PDF
│   └── 📁 utilidades/                   # Scripts de sincronización, render ERD y utilidades
│
└── 📁 assets/                           # Recursos gráficos estáticos
    ├── 📁 imagenes_documento/           # Diagramas y capturas de informes
    ├── 📁 scratch_images/               # Renders intermedios
    └── 📁 user_screenshots/             # Evidencias visuales
```

---

## 🛠️ Cómo Probar Localmente

```bash
# 1. Clonar el repositorio
git clone git@github.com:dqniel12396/visualplantasoftare.git
cd visualplantasoftare

# 2. Servir localmente
python -m http.server 8080
# O con Node.js
npx serve .
```
Abre en tu navegador: `http://localhost:8080`

---
© 2026 OTech S.A.S. — Universidad Distrital Francisco José de Caldas
