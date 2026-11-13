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

## 📂 Estructura de Archivos

```text
├── index.html                           # Aplicación Web 3D interactiva principal (Página de inicio GitHub Pages)
├── portal.html                          # Plataforma Web Cloud (Dashboard, Mapa, Estadísticas y Gestión)
├── app.js                               # Motor 3D Three.js: Estación IP65, Planta Fabril, PTAR y simulación
├── styles.css                           # Diseño visual y controles de ingeniería
├── .nojekyll                            # Archivo de anulación de Jekyll para GitHub Pages
│
├── ENTREGA_FINAL_OTECH_PLATAFORMA_WEB/  # Paquete de la Plataforma Cloud & Base de Datos
│   ├── index.html                       # Plataforma Web Cloud independiente
│   ├── diagrama_bases_datos_otech.png   # Diagrama Entidad-Relación en Ultra HD 4K
│   ├── schema_database_otech.sql        # Script DDL SQL (PostgreSQL 16 + TimescaleDB)
│   ├── ARQUITECTURA_BASE_DATOS_Y_MOCKUPS.pdf # Documento PDF oficial
│   └── ARQUITECTURA_BASE_DATOS_Y_MOCKUPS.md  # Especificación técnica
│
├── DOCUMENTOS FAINLES/                  # Documentos finales de constitución y SDLC
├── *.stl, *.obj, *.mtl, *.scad          # Modelos CAD de la estación y nave fabril
└── README.md                            # Guía general
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
