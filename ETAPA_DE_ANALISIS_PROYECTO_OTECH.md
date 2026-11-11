# Documento Oficial de Ingeniería de Requisitos y Análisis de Sistemas (SDLC)
## Proyecto: Ecosistema Integral de Monitoreo Ambiental OTech AirNet
**Asignatura / Marco:** Modelo de Construcción de Software & Ciclo de Vida (SDLC)  
**Etapa:** Fase 1 - Etapa de Análisis  
**Autor:** Equipo de Ingeniería de Software & Hardware OTech S.A.S.  
**Versión:** 2.0 (Documento Definitivo de Entrega)

---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 FASE 1 DEL CICLO DE VIDA: ETAPA DE ANÁLISIS                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [ 1. IDENTIFICAR UN PROBLEMA ] ──► Diagnóstico y Síntomas de la Industria │
│                 │                                                           │
│                 ▼                                                           │
│   [ 2. DEFINIR EL PROBLEMA ]     ──► Alcance, Árbol de Causas y Efectos     │
│                 │                                                           │
│                 ▼                                                           │
│   [ 3. COMPONENTES PRINCIPALES ] ──► Arquitectura en 4 Capas Desacopladas   │
│                 │                                                           │
│                 ▼                                                           │
│   [ 4. REQUERIMIENTOS ]          ──► 10 Funcionales (RF) + 8 No Funcionales │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Identificar un Problema

### 1.1. Situación Actual y Diagnóstico
La contaminación atmosférica (material particulado $\text{PM}_{2.5}$, $\text{PM}_{10}$ y gases de efecto invernadero $\text{CO}_2$, $\text{CO}$, $\text{NO}_2$) representa el mayor riesgo de salud ambiental a nivel global, causando más de 7 millones de muertes prematuras al año según la Organización Mundial de la Salud (OMS).

En el mercado actual existen dos extremos tecnológicos ineficientes:
1. **Estaciones Meteorológicas Estatales Tipo Referencia (CAMS):** Tienen un costo prohibitivo ($\$30,000 - \$80,000\text{ USD}$ por estación), lo que restringe la red a solo 2 o 3 puntos en una ciudad entera, generando "puntos ciegos" geográficos donde no se sabe qué respira la población en colegios, fábricas o barrios residenciales.
2. **Dispositivos "Hágalo Usted Mismo" (DIY / Ciencia Ciudadana):** Aunque son económicos, están fabricados con materiales termoplásticos biodegradables no aptos para intemperie (PLA abierto), carecen de protección contra lluvia torrencial, no aplican corrección algorítmica por humedad ($HR > 75\%$) y sus datos no son admitidos en licitaciones públicas ni en procesos sancionatorios ambientales por falta de trazabilidad metrológica y sellado industrial.

### 1.2. Justificación de la Oportunidad
Existe una necesidad imperiosa en alcaldías, corporaciones autónomas regionales (CARs), industrias manufactureras y constructoras de contar con una **solución intermedia de grado industrial accesible ($<\$150\text{ USD/nodo}$)** que garantice fiabilidad de grado metrológico (MCERTS), soporte climas tropicales extremos (IP65, radiación UV) y cuente con una plataforma de software en la nube respaldada por un gemelo digital 3D para su diseño, simulación y manufactura controlada.

---

## 2. Definir el Problema

### 2.1. Declaración Formal del Problema
> **"La ausencia de un ecosistema integrado de hardware robusto, firmware inteligente y plataforma cloud con gemelo digital 3D impide el despliegue masivo y confiable de redes de monitoreo de calidad del aire con certificación industrial, generando dispersión de datos, mediciones distorsionadas por condiciones climáticas adversas y falta de trazabilidad en los procesos de fabricación y calibración."**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ÁRBOL DE CAUSAS - PROBLEMA - EFECTOS                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  EFECTOS:                                                                   │
│  [E1] Pérdida de validez jurídica de datos ambientales ante entidades.      │
│  [E2] Daño prematuro del hardware por infiltración de agua o recalentamiento│
│  [E3] Ineficiencia en la línea de ensamble por falta de balanceo Takt Time. │
│                                     ▲                                       │
│  ───────────────────────────────────┼─────────────────────────────────────  │
│  PROBLEMA CENTRAL:                                                          │
│  Inexistencia de una plataforma estandarizada de hardware/software para     │
│  capturar, calibrar y visualizar telemetría ambiental con grado IP65 y      │
│  soporte de manufactura asistida por gemelo digital interactivo.            │
│  ───────────────────────────────────┼─────────────────────────────────────  │
│                                     ▼                                       │
│  CAUSAS:                                                                    │
│  [C1] Dispositivos vulnerables sin diseño aerodinámico ni filtros UV/lluvia.│
│  [C2] Falta de algoritmos que descuenten el crecimiento higroscópico de PM. │
│  [C3] Carencia de gemelos digitales para supervisión remota y control QA.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Objetivos del Proyecto
* **Objetivo General:** Desarrollar el ecosistema integral de software, hardware y manufactura **OTech AirNet**, que capture variables ambientales con precisión industrial, aplique compensación climática en tiempo real y ofrezca una plataforma web con gemelo digital 3D y trazabilidad de planta para 500 unidades/mes.
* **Objetivos Específicos:**
  1. Diseñar el nodo físico modular hermético (IP65/NEMA 4X) con admisión Stevenson desacoplada y autonomía solar de 72 horas.
  2. Implementar en firmware y backend los algoritmos de corrección higroscópica (Kappa-Köhler) y cálculo de Índice de Calidad del Aire (AQI).
  3. Construir la plataforma web interactiva en Three.js con despiece explosionado, simulación climática y monitoreo de la línea de ensamble en 'U'.
  4. Garantizar la trazabilidad de calidad en las 7 estaciones de producción (ICT, IP65, Metrología, Burn-In de 48h y OQC).

---

## 3. Identificar los Componentes Principales

Siguiendo la metodología de **Arquitectura en Capas (Layered Architecture)**, el sistema se descompone en **4 piezas clave** para entender su estructura, sus funciones y cómo se relacionan entre sí:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MAPA DE COMPONENTES DEL SISTEMA                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ COMPONENTE 1: INTERFAZ DE USUARIO (UI / FRONTEND) ]                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • Gemelo Digital 3D Interactivo (Three.js / WebGL / Canvas).          │  │
│  │ • Selector de Modos de Inspección (Estación 3D vs Planta Fabril).     │  │
│  │ • Sistema de Acordeones Desplegables de Ingeniería y Organigrama.     │  │
│  │ • Docks Flotantes de Control (Despiece Explosionado, Clima, Takt/OEE).│  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ Peticiones HTTPS / WebSockets        │
│                                      ▼                                      │
│  [ COMPONENTE 2: MÓDULOS DE LÓGICA DE NEGOCIO (BACKEND & FIRMWARE) ]         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • Algoritmo de Compensación Higroscópica (Kappa-Köhler para HR > 75%).│  │
│  │ • Motor de Cálculo de AQI bajo norma EPA 40 CFR Part 58.              │  │
│  │ • Simulador y Balanceador de Línea de Producción (Takt Time 16.8 min).│  │
│  │ • Firmware Embebido OTech OS (FreeRTOS, ESP32-S3, C/C++, Cripto-TLS). │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ Transacciones SQL / Ingesta Streams  │
│                                      ▼                                      │
│  [ COMPONENTE 3: BASES DE DATOS Y PERSISTENCIA (DATA LAYER) ]                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • Base de Datos de Series de Tiempo (TimescaleDB / PostgreSQL).       │  │
│  │ • Registro de Trazabilidad y Calidad de Lotes (ICT, IP65, Metrología).│  │
│  │ • Repositorio Seguro de Certificados Criptográficos mTLS y UUIDs.     │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ Protocolos de Red / Enlace Físico    │
│                                      ▼                                      │
│  [ COMPONENTE 4: SERVICIOS EXTERNOS, APIS Y HARDWARE (INTEGRACIONES) ]       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • Red LoRaWAN (The Things Network / ChirpStack) + Celular LTE-M.      │  │
│  │ • Buses de Sensores Físicos I2C/UART (Sensirion SPS30, BME680, SCD41).│  │
│  │ • Integración de Modelado CAD (Autodesk Inventor, Fusion 360, STEP).  │  │
│  │ • Generador de Reportes Editoriales en PDF (`md2pdf` automatizado).   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detalle de Funciones e Interrelación:
1. **Componente 1 (UI / Frontend):** Permite al usuario final, operadores de planta y clientes institucionales interactuar visualmente con el hardware y la fábrica en 3D sin instalar software pesado.
2. **Componente 2 (Lógica / Backend / Firmware):** Es el cerebro computacional. El firmware en el microcontrolador muestrea los sensores cada 60s, aplica filtros digitales y transmite la trama encriptada; el backend recibe los datos, calcula el AQI y distribuye la telemetría a la interfaz.
3. **Componente 3 (Datos / Persistencia):** Almacena de forma inmutable el historial ambiental y los registros de calidad (certificados de calibración y resultados de hermeticidad de cada número de serie producido).
4. **Componente 4 (Servicios Externos / Hardware):** Canaliza la comunicación entre el mundo físico (sensores, antenas, máquinas de prueba de presión) y el software, proveyendo además exportadores a suites CAD industriales.

---

## 4. Requerimientos del Sistema

### 4.1. Requerimientos Funcionales (RF)

| ID | Nombre del Requerimiento | Descripción Detallada | Criterio de Aceptación |
| :--- | :--- | :--- | :--- |
| **RF-01** | Ingesta Multivariable en Tiempo Real | El sistema debe capturar simultáneamente $\text{PM}_{1.0}, \text{PM}_{2.5}, \text{PM}_{10}, \text{CO}_2$, TVOCs, temperatura, humedad y presión atmosférica cada 60 segundos. | Lecturas estables transmitidas por LoRaWAN/LTE-M con marca de tiempo UTC. |
| **RF-02** | Compensación Climática Higroscópica | El software debe aplicar el modelo Kappa-Köhler sobre el sensor óptico cuando $HR > 75\%$ para evitar sobredimensionamiento de partículas por humedad. | Desviación inferior al $\pm 5\%$ contrastado contra estación de referencia en lluvia. |
| **RF-03** | Visualizador 3D Interactivo (Gemelo Digital) | La interfaz web debe renderizar en 3D el nodo exterior y la planta industrial, permitiendo rotación orbital, zoom, vista explosionada y corte de rayos X. | Renderizado fluido a $60\text{ FPS}$ en WebGL sin plugins externos. |
| **RF-04** | Simulación de Condiciones Climáticas | El usuario debe poder activar en tiempo real modos climáticos de sol radiante, lluvia torrencial con gotas animadas y modo nocturno. | Cambio dinámico de iluminación y activación de partículas en el visor 3D. |
| **RF-05** | Monitoreo y Simulación de Planta Lean | El sistema debe calcular en tiempo real el Takt Time ($16.8\text{ min}$), unidades producidas al día (25 uds), OEE global ($86.4\%$) y balanceo Yamazumi. | Gráficos de barras interactivos con detección visual de cuellos de botella. |
| **RF-06** | Inspección Técnica de Estaciones de Ensamble | Al hacer clic en cualquiera de las 7 estaciones o 6 dependencias administrativas, la cámara 3D debe enfocarse automáticamente en el área y abrir su ficha técnica. | Movimiento suave de cámara y despliegue del acordeón con parámetros SOP. |
| **RF-07** | Trazabilidad de Calidad (QA/QC) | El módulo de base de datos debe registrar el resultado de prueba de las 4 estaciones críticas: ICT Pogo-Pin, estanqueidad IP65, calibración gas y Burn-In de 48h. | Asignación de código QR y número de serie único por dispositivo probado. |
| **RF-08** | Exportación de Modelos CAD Industriales | El sistema debe proveer scripts de automatización en Python y mallas 3D (`.OBJ`, `.MTL`, `.SCAD`) compatibles con Autodesk Inventor, Fusion 360 y AutoCAD. | Importación directa en suites CAD sin errores de geometría no-múltiple. |
| **RF-09** | Conversión Documental Automatizada a PDF | La plataforma debe incluir una herramienta autónoma (`md2pdf.bat` / `md_to_pdf.py`) para compilar manuales y reportes a PDF corporativo con 1 clic. | Generación de PDFs A4 con tipografía corporativa y paginación correcta. |
| **RF-10** | Sistema de Acordeones y Filtros Desplegables | La interfaz lateral debe permitir colapsar o expandir las capas de ingeniería y organigrama para evitar saturación visual. | Acordeones con animación suave y botón global "Expandir/Colapsar Todo". |

---

### 4.2. Requerimientos No Funcionales (RNF)

| ID | Categoría (ISO/IEC 25010) | Especificación Técnica | Métrica / Tolerancia |
| :--- | :--- | :--- | :--- |
| **RNF-01** | **Rendimiento y Eficiencia** | Tiempo de carga inicial del visor 3D web y procesamiento de telemetría. | Carga inicial $< 1.8\text{ s}$; renderizado sostenido $\ge 60\text{ FPS}$. |
| **RNF-02** | **Confiabilidad y Autonomía** | Continuidad operativa del nodo hardware en ausencia total de luz solar. | Autonomía $\ge 72\text{ horas}$ continuas con batería LiFePO4 6000 mAh. |
| **RNF-03** | **Seguridad de la Información** | Encriptación de datos de telemetría en tránsito y autenticación de dispositivos. | Autenticación mTLS con cripto-chip dedicado y cifrado AES-128. |
| **RNF-04** | **Robustez y Estanqueidad Física** | Resistencia de la envolvente mecánica ante lluvia, polvo y vientos fuertes. | Certificación IP65 / NEMA 4X y resistencia eólica a $120\text{ km/h}$. |
| **RNF-05** | **Mantenibilidad y Modularidad** | Tiempo de sustitución de la bandeja de sensores en campo sin herramientas complejas. | Reemplazo Hot-Swap de bandeja interna en $\le 2.0\text{ minutos}$. |
| **RNF-06** | **Compatibilidad e Interoperabilidad** | Compatibilidad del frontend web con navegadores estándar y suites de ingeniería. | Chrome, Edge, Firefox, Safari y compatibilidad CAD con Autodesk 2020+. |
| **RNF-07** | **Usabilidad y Accesibilidad** | Interfaz ergonómica con modo oscuro de alto contraste y tarjetas visuales claras. | Cumplimiento de pautas WCAG 2.1 Nivel AA en legibilidad y contrastes. |
| **RNF-08** | **Capacidad de Manufactura** | Capacidad nominal de producción en planta bajo régimen de 1 turno de 8 horas. | Producción de 25 unidades/día (500 unidades/mes con 1 turno). |

---

## 5. Matriz de Trazabilidad: Problema - Componentes - Requerimientos

```
┌───────────────────────────┬───────────────────────────┬───────────────────────────┐
│     PROBLEMA DEFINIDO     │   COMPONENTE RESPONSABLE  │   REQUERIMIENTOS ASOCIADOS│
├───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ [P1] Dispersión de datos  │ Componente 1: UI Frontend │ • RF-03 (Gemelo 3D)       │
│ y falta de visor digital. │ (Three.js / WebGL)        │ • RF-06 (Inspección)      │
│                           │                           │ • RNF-01 (60 FPS)         │
├───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ [P2] Falsos positivos por │ Componente 2: Lógica      │ • RF-01 (Muestreo 60s)    │
│ humedad relativa > 75%.   │ (Backend & Firmware)      │ • RF-02 (Kappa-Köhler)    │
│                           │                           │ • RNF-03 (Seguridad TLS)  │
├───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ [P3] Falta de trazabilidad│ Componente 3: Data Layer  │ • RF-05 (Métricas Lean)   │
│ en calidad y lotes.       │ (TimescaleDB / Postgre)   │ • RF-07 (Trazabilidad QR) │
│                           │                           │ • RNF-08 (500 uds/mes)    │
├───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ [P4] Vulnerabilidad física│ Componente 4: Hardware    │ • RF-04 (Simulación Clima)│
│ y falta de estándar CAD.  │ & Integraciones Externas  │ • RF-08 (Modelos CAD)     │
│                           │                           │ • RNF-04 (IP65 / 120 km/h)│
└───────────────────────────┴───────────────────────────┴───────────────────────────┘
```

---

## 6. Conclusión de la Etapa de Análisis

La resolución rigurosa de los 4 pilares de la **Etapa de Análisis**:
1. **Identificar el problema:** Se diagnosticó la brecha entre estaciones de referencia inaccesibles y dispositivos DIY frágiles.
2. **Definir el problema:** Se delimitó el alcance técnico del ecosistema OTech AirNet y su árbol de causas/efectos.
3. **Identificar los componentes principales:** Se estructuró la arquitectura en 4 capas desacopladas (Presentación, Lógica, Datos e Integración).
4. **Requerimientos:** Se formalizaron 10 requerimientos funcionales (RF) y 8 no funcionales (RNF) bajo la norma internacional ISO/IEC 25010.

Este documento sienta las bases firmes e inmutables para proceder con éxito a las siguientes fases del SDLC: **Diseño de Arquitectura**, **Desarrollo/Codificación**, **Pruebas de Integración** y **Despliegue Operativo**.
