# Documento de Ingeniería de Software: Etapa de Análisis (SDLC)
## Proyecto: Plataforma OTech AirNet & Ecosistema de Producción
**Autor:** Dirección de Tecnología (CTO) & Dirección de Producto (CPO)  
**Versión:** 1.0  
**Fecha:** Agosto 2026  
**Marco Metodológico:** Ciclo de Vida del Desarrollo de Software (SDLC)

---

## 1. Identificación y Definición del Problema

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           ÁRBOL DEL PROBLEMA                               │
├────────────────────────────────────────────────────────────────────────────┤
│  EFECTO 1: Falta de trazabilidad en calidad y calibración metrológica.     │
│  EFECTO 2: Incompatibilidad entre diseño hardware y visualización web/CAD. │
│  EFECTO 3: Riesgo de fallas por factores ambientales (lluvia, humedad, UV).│
│                                   ▲                                        │
│  ─────────────────────────────────┼──────────────────────────────────────  │
│  PROBLEMA CENTRAL:                                                         │
│  Inexistencia de una plataforma unificada de monitoreo ambiental y         │
│  gestión de manufactura inteligente capaz de integrar hardware IoT de      │
│  alta precisión (sensores PM/gases), analítica cloud y control de calidad  │
│  en planta bajo estándares industriales (IP65, EPA/ESD, MCERTS).           │
│  ─────────────────────────────────┼──────────────────────────────────────  │
│                                   ▼                                        │
│  CAUSA 1: Dispersión de herramientas (CAD aislado, sin telemetría web).    │
│  CAUSA 2: Ausencia de corrección algorítmica para humedad (>75% HR).       │
│  CAUSA 3: Falta de estandarización en estaciones de ensamble y pruebas.    │
└────────────────────────────────────────────────────────────────────────────┘
```

### 1.1. Contexto y Oportunidad
Los dispositivos de monitoreo ambiental convencionales de ciencia ciudadana (e.g. prototipos basados en carcasas abiertas de PLA y sensores no calibrados) sufren tres deficiencias críticas:
1. **Falta de Robustez Física:** Vulnerabilidad ante lluvia torrencial, radiación solar directa y polvo, provocando degradación óptica de los sensores en menos de 90 días.
2. **Sesgo en las Mediciones:** Las partículas higroscópicas crecen de tamaño en presencia de alta humedad relativa ($HR > 75\%$), generando lecturas erróneas de $\text{PM}_{2.5}$ y $\text{PM}_{10}$ si el software no aplica corrección compensatoria.
3. **Desconexión entre Software y Producción:** Los equipos de ingeniería de software no cuentan con gemelos digitales (Digital Twins) interactivos para simular el ensamble, la calibración y el ciclo de vida del producto.

### 1.2. Declaración Formal del Problema
> *"¿Cómo diseñar e implementar una solución integral de software y hardware que permita capturar, procesar, calibrar y visualizar telemetría ambiental en tiempo real con grado industrial IP65, integrando un gemelo digital 3D para la simulación y aseguramiento de calidad en la planta de manufactura?"*

---

## 2. Identificación de los Componentes Principales del Sistema

Siguiendo la metodología de **Arquitectura en Capas (Layered Architecture)** descrita en el SDLC, el sistema se descompone en 4 componentes principales fuertemente cohesionados y desacoplados:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        ARQUITECTURA DE COMPONENTES                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. CAPA DE PRESENTACIÓN & INTERFAZ DE USUARIO (UI / FRONTEND)             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ • Gemelo Digital 3D (Three.js / WebGL / Canvas)                      │  │
│  │ • Panel de Despiece Explosionado & Simulación Climática (Sol/Lluvia) │  │
│  │ • Dashboard de Planta Lean (Takt Time, FPY, OEE, Yamazumi)           │  │
│  │ • Visor de Sede Administrativa & Organigrama Interactivo             │  │
│  └──────────────────────────────────┬───────────────────────────────────┘  │
│                                     │ Eventos & WebSockets / REST          │
│                                     ▼                                      │
│  2. CAPA DE LÓGICA DE NEGOCIO Y PROCESAMIENTO (BACKEND & FIRMWARE)         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ • Módulo de Ingesta y Corrección Higroscópica (Kappa-Köhler)         │  │
│  │ • Motor de Cálculo AQI (EPA 40 CFR Part 58)                          │  │
│  │ • Algoritmo de Balanceo de Línea de Producción (Takt net Net Net)    │  │
│  │ • Firmware Embebido OTech OS (ESP32-S3, C/C++, FreeRTOS, OTA)       │  │
│  └──────────────────────────────────┬───────────────────────────────────┘  │
│                                     │ Queries SQL / TimeSeries Write       │
│                                     ▼                                      │
│  3. CAPA DE DATOS Y PERSISTENCIA (DATA LAYER)                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ • Base de Datos de Series Temporales (TimescaleDB / PostgreSQL)      │  │
│  │ • Registro de Trazabilidad de Calidad (IQC, ICT, Calibración, OQC)   │  │
│  │ • Repositorio de Certificados Criptográficos TLS y Números de Serie  │  │
│  └──────────────────────────────────┬───────────────────────────────────┘  │
│                                     │ Drivers & Protocolos                 │
│                                     ▼                                      │
│  4. CAPA DE SERVICIOS EXTERNOS & INTERFACES CAD/IOT (APIs & HARDWARE)      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ • Red LoRaWAN (The Things Stack) / Módem Celular LTE-M               │  │
│  │ • Sensores I2C/UART (Sensirion SPS30, Bosch BME680, Sensirion SCD41)│  │
│  │ • Exportador Paramétrico CAD (Autodesk Inventor, Fusion 360, STEP)   │  │
│  │ • API de Reportes Oficiales & Generador PDF Corporativo              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Matriz de Detalle de los Componentes Principales

| Componente Principal | Subcomponentes / Módulos | Responsabilidad y Función | Tecnologías / Estándares |
| :--- | :--- | :--- | :--- |
| **1. Interfaz de Usuario (UI / Frontend)** | • Visor 3D WebGL<br>• Selector de Modo (Estación / Planta)<br>• Acordeones Técnicos<br>• Docks Flotantes de Control | Renderizar el modelo tridimensional interactivo, permitir despiece explosionado, inspeccionar estaciones de manufactura y visualizar métricas operativas. | HTML5 Semántico, CSS3 Vanilla (Glassmorphism), JavaScript (ES6+), Three.js, Lucide Icons. |
| **2. Módulos de Lógica de Negocio** | • Algoritmo Kappa-Köhler<br>• Motor de Takt Time & OEE<br>• Validador de Sellado IP65<br>• Firmware FreeRTOS | Procesar telemetría de sensores, eliminar ruido por humedad, computar índices de calidad de aire (AQI) y orquestar el flujo de manufactura celular. | Python, Node.js, C/C++ Embebido, FreeRTOS, ESP-IDF. |
| **3. Bases de Datos y Persistencia** | • Serie Temporal Telemetría<br>• Tabla de Calibraciones (Zero/Span)<br>• Registro Trazabilidad Lotes | Almacenar lecturas por segundo de $\text{PM}_{1.0}, \text{PM}_{2.5}, \text{PM}_{10}, \text{CO}_2$, temperatura, presión y estados de inspección QA. | PostgreSQL / TimescaleDB, Redis Cache, SQLite local en pasarela. |
| **4. Servicios Externos, APIs y Hardware** | • Conector LoRaWAN / MQTT<br>• Integración CAD Autodesk<br>• Conversor Markdown a PDF | Conectar el hardware físico con servidores en la nube, sincronizar ensambles con Autodesk Inventor/AutoCAD y emitir certificados oficiales. | Protocolo MQTT, LoRaWAN v1.0.4, Autodesk API, Python Headless Edge Print. |

---

## 4. Requerimientos del Sistema (Funcionales y No Funcionales)

### 4.1. Requerimientos Funcionales (RF)
* **RF-01 (Monitoreo Multivariable):** El sistema debe capturar simultáneamente $\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{CO}_2$, TVOCs, temperatura, humedad y presión barométrica cada 60 segundos.
* **RF-02 (Gemelo Digital Interactivo):** La interfaz web debe permitir rotar, trasladar, seccionar por rayos X y explosionar el modelo 3D del dispositivo y de la planta de producción.
* **RF-03 (Trazabilidad QA/QC):** El módulo de calidad debe registrar los resultados de las 4 estaciones críticas: ICT Pogo-Pin, caída de presión IP65, calibración de gases y envejecimiento en Burn-In (48h).
* **RF-04 (Exportación CAD/PDF):** El usuario debe poder descargar el modelo 3D en formato `.OBJ`/`.STL`/`.SCAD` y generar los manuales técnicos en PDF con un clic.

### 4.2. Requerimientos No Funcionales (RNF)
* **RNF-01 (Rendimiento Web 3D):** La visualización 3D debe mantener una tasa de cuadros estable de $\ge 60\text{ FPS}$ en navegadores modernos sin caídas de memoria.
* **RNF-02 (Autonomía Energética):** El nodo hardware exterior debe operar de forma ininterrumpida durante 72 horas continuas sin radiación solar gracias a su batería LiFePO4 de 6000 mAh.
* **RNF-03 (Protección Mecánica IP65):** La envolvente exterior debe soportar chorros de agua a presión y vientos de hasta 120 km/h sin filtraciones.
* **RNF-04 (Seguridad Criptográfica):** Cada estación debe incorporar un cripto-chip para autenticación mTLS y encriptación de datos AES-128/256.

---

## 5. Beneficios del Análisis y Arquitectura para OTech S.A.S.

1. **Comprensión Holística:** Permite al equipo de hardware, software y planta entender cómo cada tornillo y cada línea de código se integran en el producto final.
2. **Organización del Trabajo por Roles:** Cada dirección del organigrama (CTO, CPO, HW Director, COO, CFO) tiene delimitadas sus responsabilidades técnicas y herramientas.
3. **Mantenimiento y Modularidad:** Fallas en un sensor específico (e.g. SPS30) pueden diagnosticarse y aislarse mediante la bandeja deslizable sin detener el resto del nodo ni la red.
4. **Cumplimiento de Plazos y Costos:** La planificación precisa del Takt Time ($16.8\text{ min/ud}$) y del costo BOM ($134\text{ USD/nodo}$) asegura rentabilidad para licitaciones públicas y clientes privados.
