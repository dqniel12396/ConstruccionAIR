# ARQUITECTURA DE BASE DE DATOS Y ESPECIFICACIÓN DE MOCKUPS
## Plataforma Web Integral OTech AirNet Cloud (SDLC Fase 1)

**Proyecto:** Ecosistema Integral de Monitoreo Ambiental OTech AirNet  
**Entidad / Empresa:** OTech S.A.S.  
**Marco Académico:** Modelo de Construcción de Software - Universidad Distrital Francisco José de Caldas  
**Documento Fuente:** `OTech_Esquema_Constitucion_Final.pdf`  
**Fecha de Publicación:** Noviembre de 2026  

---

## 1. Introducción y Propósito

El presente documento consolida la arquitectura lógica de datos y la interfaz gráfica de usuario para la plataforma de gestión de calidad del aire y dispositivos IoT de **OTech S.A.S.** 

El sistema responde a la necesidad de dotar a empresas industriales, entidades de transporte, obras civiles y entidades públicas (tales como la Secretaría Distrital de Ambiente - SDA o la CAR) de una solución trazable, auditable y de alta fidelidad metrológica para el monitoreo de material particulado ($\text{PM}_{1.0}, \text{PM}_{2.5}, \text{PM}_{10}$), gases y meteorología local.

---

## 2. Diagrama Entidad-Relación (ERD) de la Base de Datos

La persistencia del sistema está modelada para operar sobre **PostgreSQL 16** con la extensión **TimescaleDB**, permitiendo ingesta continua por segundo y consulta analítica ágil sobre particiones semanales sin degradación de rendimiento.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ARQUITECTURA DEL MODELO DE DATOS OTECH                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [ ORGANIZACIONES ] ──(1:N)──► [ SEDES_OPERATIVAS ] ──(1:N)──► [ DISPOSITIVOS ]       │
│           │                                                            │               │
│         (1:N)                                                        (1:N)             │
│           ▼                                                            ▼               │
│      [ USUARIOS ] ◄──(N:M)──► [ ROLES ]                    [ SENSORES_INSTALADOS ]     │
│           │                                                            │               │
│           │                                                          (1:N)             │
│           │                                                            ▼               │
│           └──────────────────────────────────────────────► [ MEDICIONES_TELEMETRIA ]   │
│                                                              (Hiper-tabla Timescale)   │
│                                                                        │               │
│   [ REGLAS_ALERTA ] ──────(1:N)──────► [ INCIDENTES_ALERTAS ] ◄────────┘               │
│                                                                                        │
│   [ ORDENES_MANTENIMIENTO ] ──(1:N)──► [ REGISTROS_CALIBRACION ] (Patrón CAMS)         │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Diccionario de Entidades Principales

| Entidad | Tipo / Motor | Propósito en el Ecosistema |
| :--- | :--- | :--- |
| **`organizaciones`** | Tabla Relacional | Soporte multi-empresa (Multi-Tenant). Modela clientes industriales como Ecopetrol, Alpina, Corferias o TransMilenio. |
| **`sedes_operativas`** | Tabla Relacional | Puntos geográficos específicos de una organización donde se instalan nodos de monitoreo. |
| **`usuarios` y `roles`** | Tabla Relacional (RBAC) | Control de acceso basado en roles: Super Admin OTech, Admin Empresa, Técnico de Campo, Analista Ambiental y Visualizador. |
| **`dispositivos`** | Tabla Relacional | Inventario de estaciones exteriores IP65. Vincula UUID de cripto-chip (ATECC608A), versión de firmware y estado de batería. |
| **`config_comunicacion`** | Tabla Relacional | Parámetros de enlace inalámbrico LoRaWAN (DevEUI, AppKey) o módems celulares 4G LTE-M / NB-IoT. |
| **`sensores_instalados`** | Tabla Relacional | Desacoplamiento de la bandeja modular Hot-Swap. Permite cambiar sensores ópticos SPS30 o electroquímicos sin perder el histórico del nodo. |
| **`mediciones_telemetria`** | Hiper-tabla TimescaleDB | Almacén masivo de series de tiempo. Registra valor crudo, valor compensado con el modelo físico $\kappa\text{-Köhler}$, y bandera de calidad del dato. |
| **`reglas_alerta`** | Tabla Relacional | Reglas de vigilancia preventiva y contingencia según normas EPA y Resolución 2254 de Colombia. |
| **`incidentes_alertas`** | Tabla Relacional | Registro auditable de eventos críticos, persistencia temporal y acciones de mitigación registradas por operadores. |
| **`ordenes_mantenimiento`**| Tabla Relacional | Trazabilidad del ciclo de vida físico: bitácora de intervenciones, sustituciones en campo y tiempo de recambio ($\le 2$ min). |
| **`registros_calibracion`** | Tabla Relacional | Certificados de calibración frente a estaciones patrón tipo BAM-1020 con hash SHA-256 no repudiable. |

---

## 3. Especificación de Mockups de la Plataforma Web

La interfaz ha sido diseñada siguiendo los estándares de diseño ergonómico industrial, alto contraste para operación diurna y nocturna, y cumplimiento con las pautas **WCAG 2.1 Nivel AA**.

### 3.1. Pantalla 1: Tablero Central y Mapa Geoespacial en Tiempo Real
- **Tarjetas KPI Superiores:** Resumen ejecutivo de Calidad del Aire (ICA/AQI) en escala cromática normalizada, concentración actual de $\text{PM}_{2.5}$, $\text{PM}_{10}$ y porcentaje de estaciones operativas en línea.
- **Mapa Georreferenciado:** Capas visuales conmutables ($\text{PM}_{2.5}$, $\text{PM}_{10}$, Humedad Relativa y Temperatura), con pines de estado dinámico que cambian de color según el umbral normativo.
- **Feed de Paquetes en Vivo:** Flujo en tiempo real que lista la telemetría recibida cada 60 segundos por enlace LoRaWAN o celular.
- **Curva Comparativa Diaria:** Gráfico de línea continuo que contrasta las mediciones de las últimas 24 horas frente al límite diario recomendado por la OMS ($15\,\mu\text{g/m}^3$).

### 3.2. Pantalla 2: Gestión de Aparatos e Inventario IoT
- **Tabla Dinámica con Filtros:** Búsqueda en vivo por número de serie, sede, tipo de conectividad y estado operativo.
- **Monitoreo de Energía:** Indicador visual de porcentaje de carga de las baterías $\text{LiFePO}_4$ y estado del panel solar.
- **Ficha Técnica e Inspección:** Modal detallado que despliega la versión de firmware del microcontrolador ESP32-S3, sensores en bandeja y botón de autodiagnóstico remoto.

### 3.3. Pantalla 3: Estadísticas & Analítica Avanzada
- **Selector de Calidad del Dato (RF-09):** Conmutador que permite comparar el **Dato Crudo** vs el **Dato Validado con Compensación $\kappa\text{-Köhler}$** (el cual mitiga la sobredimensión de partículas cuando la humedad relativa $HR > 75\%$), evitando falsas alarmas de contaminación.
- **Visualizador de Series Temporales:** Gráfica multieje interactiva con resolución minuto a minuto servida directamente desde la base de datos TimescaleDB.

### 3.4. Pantalla 4: Reglas, Alertas e Incidentes
- **Motor de Disparo Automático:** Creación de reglas con umbrales normativos, tiempos de persistencia mínima y canales de notificación multicanal (Email, SMS y Webhooks).
- **Consola de Incidentes Activos:** Gestión de eventos críticos en curso con botón de reconocimiento inmediato y apertura de bitácora técnica de contingencia.

### 3.5. Pantalla 5: Bitácora de Mantenimiento y Calibraciones (RF-07)
- **Trazabilidad Hot-Swap:** Registro del tiempo de intervención para sustitución de bandeja modular (meta de diseño $\le 2.0$ minutos lograda en 1.4 minutos promedio).
- **Certificados Metrológicos:** Historial de contrastes y calibración cero/span contra equipos de referencia CAMS.

### 3.6. Pantalla 6: Reportes y Cumplimiento Regulatorio (RF-08)
- **Exportación con 1 Clic:** Generación automática de reportes ejecutivos en PDF formal listos para auditorías de la Secretaría Distrital de Ambiente o la CAR, y datasets en CSV/Parquet para investigación científica.

---

## 4. Archivos Entregables en la Carpeta Final

La entrega se encuentra completamente empaquetada en los módulos unificados del repositorio (`plataforma_web/`, `gemelo_digital_3d/`, `database/` y `assets/vendor/`):

1. **`plataforma_web/portal.html`**: Portal multi-tenant completo offline-ready (7 módulos + control de acceso por roles + sincronización en vivo con el Gemelo 3D).
2. **`schema_database_otech.sql`**: Script DDL de base de datos PostgreSQL + TimescaleDB con índices, tipos ENUM y particionamiento.
3. **`ARQUITECTURA_BASE_DATOS_Y_MOCKUPS.md`**: Este documento técnico formal.
4. **`ARQUITECTURA_BASE_DATOS_Y_MOCKUPS.pdf`**: Versión PDF editorial generada para impresión y entrega académica.
5. **`ABRIR_PLATAFORMA_WEB.bat`**: Lanzador rápido para abrir el sistema web interactivo con 1 clic en Windows.

