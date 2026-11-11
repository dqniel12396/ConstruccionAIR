# OTech AirNet 🌿 — Plataforma Web & Ecosistema de Monitoreo Ambiental IoT

> **Proyecto de Modelo de Construcción de Software & Ciclo de Vida (SDLC - Fase 1)**  
> **Universidad Distrital Francisco José de Caldas — Facultad de Ingeniería de Sistemas**  
> **Docente:** Leonardo Molina  
> **Integrantes:**  
> - Juan José León Gómez (20212020055)  
> - Daniel Sanabria Rivera (20242020046)  
> - Jamyson Steven Rolón Castaño (20222020163)  

---

## 🚀 Resumen del Proyecto

**OTech AirNet** es un ecosistema tecnológico integral para el monitoreo indicativo e inteligente de la calidad del aire, diseñado para cerrar la brecha entre las costosas estaciones regulatorias gubernamentales (CAMS) y los prototipos de bajo costo sin trazabilidad.

La solución integra:
1. **Gemelo Digital 3D (Frontend Three.js / WebGL):** Visualización interactiva del nodo exterior IP65 (con escudo Stevenson y bandeja de sensores Hot-Swap) y simulación de la planta de producción industrial Lean.
2. **Plataforma Web OTech AirNet Cloud (Portal Multi-Tenant):** Portal web para que empresas (Ecopetrol, Alpina, Corferias, TransMilenio, etc.) y ciudadanos gestionen sus estaciones, visualicen el semáforo ICA en mapas georreferenciados, configuren alertas y analicen telemetría histórica.
3. **Motor de Calidad del Dato (Modelo Físico $\kappa$-Köhler):** Compensación higroscópica automática cuando la Humedad Relativa $HR > 75\%$, eliminando falsas alarmas ambientales causadas por niebla.
4. **Base de Datos Multi-Tenant & Series Temporales:** Modelado relacional en **PostgreSQL 16** con hiper-tablas **TimescaleDB** y trazabilidad de lotes de calibración/mantenimiento.

---

## 📂 Estructura del Repositorio

```text
├── index.html                           # Visor 3D interactivo (Gemelo Digital Estación Exterior & Planta)
├── portal.html                          # Plataforma Web Cloud (Dashboard, Mapa, Estadísticas y Gestión)
├── app.js                               # Lógica 3D Three.js, órbitas, explosión de despiece y simulación
├── styles.css                           # Estilos del visualizador 3D y docks de ingeniería
│
├── ENTREGA_FINAL_OTECH_PLATAFORMA_WEB/  # Paquete autónomo de la Plataforma Web & Base de Datos
│   ├── index.html                       # Plataforma Web Cloud completa
│   ├── diagrama_bases_datos_otech.png   # Diagrama Entidad-Relación en Ultra HD 4K (3600x2400)
│   ├── schema_database_otech.sql        # Script DDL SQL (PostgreSQL 16 + TimescaleDB)
│   ├── ARQUITECTURA_BASE_DATOS_Y_MOCKUPS.pdf # Documento PDF oficial de arquitectura
│   ├── ARQUITECTURA_BASE_DATOS_Y_MOCKUPS.md  # Documento técnico en Markdown
│   ├── ABRIR_PLATAFORMA_WEB.bat         # Lanzador rápido de la web en Windows
│   └── ABRIR_IMAGEN_BASE_DE_DATOS.bat   # Lanzador directo de la imagen de BD
│
├── DOCUMENTOS FAINLES/                  # Documentación legal, comercial y SDLC
│   ├── OTech_Esquema_Constitucion_Final.pdf # Documento fuente de constitución y SDLC
│   └── ...
│
├── *.stl, *.obj, *.mtl, *.scad          # Modelos CAD 3D de la estación y planta fabril
├── ETAPA_DE_ANALISIS_PROYECTO_OTECH.md  # Requisitos funcionales (RF-01 a RF-10) y RNF
└── README.md                            # Guía general del proyecto
```

---

## 🛠️ Cómo Ejecutar y Probar el Proyecto

No se requieren compiladores complejos ni dependencias pesadas:

### Opción 1: Directo en el Navegador
- **Para el Gemelo Digital 3D:** Abre el archivo `index.html` con doble clic o usando la extensión **Live Server** de VS Code.
- **Para la Plataforma Web Cloud:** Abre `portal.html` o `ENTREGA_FINAL_OTECH_PLATAFORMA_WEB/index.html`.
- Ambas páginas están interconectadas en sus barras de navegación superiores.

### Opción 2: Con Servidor Local (Recomendado)
Desde la terminal en la raíz del repositorio:
```bash
# Con Python
python -m http.server 8080

# O con Node.js / npx
npx serve .
```
Luego ingresa en tu navegador a: `http://localhost:8080`

---

## 👥 Guía para los Miembros del Equipo: ¿Cómo Modificar y Colaborar?

1. **Clonar el repositorio:**
   ```bash
   git clone git@github.com:dqniel12396/ConstruccionAIR.git
   cd ConstruccionAIR
   ```
2. **Crear una rama para tu feature:**
   ```bash
   git checkout -b feature/nombre-mejora
   ```
3. **Áreas clave de mejora identificadas:**
   - **Frontend 3D (`app.js` / `styles.css`):** Agregar nuevas animaciones, texturas PBR, o interactividad con nuevos sensores en la bandeja Hot-Swap.
   - **Plataforma Web Cloud (`portal.html`):** Conectar con endpoints reales de backend (NestJS/Fastify o API REST), agregar nuevos filtros de analítica o soporte para exportación en formato Excel/CSV en vivo.
   - **Base de Datos (`schema_database_otech.sql`):** Nuevas entidades para gestión de contratos, proveedores o facturación electrónica (Módulo SIGE OTech).
4. **Hacer commit y push:**
   ```bash
   git add .
   git commit -m "feat: descripción de la mejora"
   git push origin feature/nombre-mejora
   ```

---

## 📜 Licencia y Derechos
© 2026 OTech S.A.S. — Proyecto Académico & Tecnológico desarrollado para la Universidad Distrital Francisco José de Caldas.
