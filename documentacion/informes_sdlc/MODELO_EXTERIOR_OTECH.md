# Documento de Especificación y Modelado: Estación Exterior OTech AirNet
**Evolución del Hardware Abierto CanAirIO a Solución Institucional e Industrial B2G / B2B**

---

## 1. Introducción y Justificación del Rediseño

El proyecto de código abierto **CanAirIO** proporciona una excelente base de referencia para el monitoreo de material particulado mediante microcontroladores ESP32 y sensores de bajo costo. No obstante, las implementaciones tradicionales de CanAirIO (como la versión *CanAirIO Bike* o los prototipos en tubos de PVC básicos) fueron concebidas principalmente para ciencia ciudadana y monitoreo móvil a corto plazo.

Para cumplir con los compromisos del **Plan de Negocio de OTech S.A.S.** (contratos B2G con alcaldías/gobernaciones y B2B con constructoras e industrias), la estación física debe ser adaptada y endurecida para operar de manera ininterrumpida a la intemperie durante años bajo condiciones climáticas severas:

```
[ Prototipo CanAirIO Base ]                 [ Estación Exterior OTech AirNet ]
--------------------------------            ---------------------------------------------
- Carcasa 3D básica PLA no sellada          -> Gabinete hermético IP65 en polímero ASA/PETG-UV
- Tomas de aire expuestas a lluvia          -> Escudo Stevenson con deflectores inclinados a 45°
- Sin aislamiento de radiación solar        -> Doble cámara con aislamiento térmico y drenaje
- Alimentación USB/PowerBank comercial      -> Sistema Híbrido: Panel Solar MPPT + LiFePO4 / PoE
- Dificultad para mantenimiento en poste    -> Bandeja modular deslizante (Hot-Swap)
- Calibración única de fábrica              -> Trazabilidad, QA/QC y redundancia de sensores
```

---

## 2. Arquitectura Mecánica del Modelo Exterior

El diseño del dispositivo exterior se divide en 5 subsistemas modulares concéntricos y desmontables:

### 2.1. Cúpula Superior y Módulo Solar (Top Solar Hood)
* **Geometría**: Techo cónico/inclinado a 12° respecto a la horizontal. Esto garantiza el escurrimiento instantáneo de aguas lluvias, previene la acumulación de polvo/hojas y optimiza la captación solar para latitudes tropicales y templadas.
* **Hermeticidad**: Canal perimetral con junta tórica de elastómero (O-Ring de EPDM/Silicona) con sellado por compresión mediante 4 tornillos de acero inoxidable AISI 316.
* **Panel Solar**: Celda solar monocristalina de 6V / 2.5W a 5W con recubrimiento de ETFE de alta transmitancia y resistencia UV.

### 2.2. Gabinete Principal de Electrónica (Main Sealed Enclosure - Grado IP65)
* **Aislamiento**: Cámara completamente estanca que alberga la PCB principal (OTech Core / ESP32-S3), la batería de respaldo y el módem de conectividad (LoRaWAN / NB-IoT / 4G / Wi-Fi).
* **Entradas/Salidas**: Prensaestopas estancos de nylon grado IP68 (PG7 / PG9) para alimentación externa por cable o inyector PoE (Power over Ethernet).
* **Guías Internas**: Carriles laterales ranurados que permiten deslizar e insertar la bandeja electrónica sin necesidad de manipular tornillos en campo.

### 2.3. Cámara de Muestreo de Aire (Louvered Stevenson Intake Chamber)
* **Diseño Aerodinámico**: Módulo cilíndrico equipado con anillos deflectores concéntricos inclinados a 45° (diseño tipo *Stevenson Screen* miniaturizado).
* **Protección contra Precipitación**: Impide la entrada de gotas de lluvia arrastradas por vientos laterales de hasta 80 km/h, evitando que el agua líquida penetre en el sensor láser óptico.
* **Barrera Biológica y Particulado Grueso**: Malla metálica de acero inoxidable 316 con luz de malla de 0.3 mm (300 µm) que bloquea el ingreso de insectos, telarañas y pelusas sin restringir la difusión de PM1.0, PM2.5 ni gases.
* **Vórtice de Decantación**: Embudo cónico inferior que evacúa por gravedad cualquier microgotícula condensada.

### 2.4. Bandeja Deslizable de Sensores (Internal Modular Chassis)
* **Mantenimiento Hot-Swap**: Chasis interno que soporta los sensores y la batería. En caso de recalibración o falla de sensor, el técnico de campo afloja la base, extrae el chasis y coloca una unidad calibrada en menos de 2 minutos.
* **Amortiguación de Vibraciones**: Soportes elastoméricos para el sensor de partículas láser Sensirion SPS30, evitando descalibración óptica por vibraciones en postes de tráfico.

### 2.5. Soporte Universal de Montaje (Pole & Wall Mount Bracket)
* **Fijación en Poste (Mástil)**: Mordaza curva con radios escalonados compatible con postes y tubos de 1.5" a 2.5" de diámetro exterior.
* **Canales para Abrazaderas**: Dos ranuras reforzadas para abrazaderas de acero inoxidable tipo cremallera sinfín (12.7 mm de ancho).
* **Fijación en Pared**: 4 orificios pasantes reforzados para anclaje sobre concreto o mampostería mediante pernos M6.

---

## 3. Matriz de Componentes y Sensores (BOM Industrial)

| Módulo / Componente | Modelo Recomendado | Función Técnica | Rango / Parámetro Medido |
| :--- | :--- | :--- | :--- |
| **Microcontrolador Principal** | ESP32-S3-WROOM-1 (16MB Flash, 8MB PSRAM) | Firmware OTech, procesamiento de señales, buffer local SPIFFS, cifrado TLS | Control general y telemetría |
| **Sensor de Material Particulado** | Sensirion SPS30 (Certificación MCERTS) | Medición láser de dispersión con limpieza automática de polvo | PM1.0, PM2.5, PM4.0, PM10 (0 a 1000 µg/m³) |
| **Sensor Termohigrométrico & Gases** | Bosch Sensortec BME680 | Presión atmosférica, temperatura, humedad relativa y Compuestos Orgánicos Volátiles (VOCs) | -40 a +85 °C, 0-100% HR, 300-1100 hPa |
| **Sensor de Gas Opcional (NDIR)** | Sensirion SCD41 / Winsen MH-Z19C | Medición infrarroja no dispersiva de dióxido de carbono | CO2 (400 a 5000 ppm) |
| **Comunicaciones de Respaldo** | Módulo LoRaWAN SX1262 o Quectel BG95 (NB-IoT/LTE-M) | Transmisión redundante en áreas sin Wi-Fi institucional | Cobertura de 5-15 km en LoRa / Red Celular |
| **Gestión de Energía Solar** | Controlador MPPT CN3791 / BQ25792 | Carga optimizada por seguimiento de punto de máxima potencia | Eficiencia de conversión > 93% |
| **Batería de Respaldo** | Pack LiFePO4 3.2V 6000 mAh (Formato 32650 o 2x 21700) | Autonomía de 72 horas sin radiación solar directa | Ciclo de vida > 2500 ciclos (-20°C a +60°C) |

---

## 4. Dinámica de Flujo y Protección contra Humedad

Uno de los principales errores en los montajes exteriores caseros es colocar sensores de partículas en ambientes húmedos (>85% HR) sin compensación. Cuando la humedad relativa es muy alta, las gotas de vapor de agua microscópicas son leídas por el láser como partículas PM2.5, disparando falsas alarmas (higroscopicidad).

### Soluciones Implementadas en OTech Exterior:
1. **Algoritmo de Corrección Higroscópica (Curva Kappa-Köhler)**: Integrado en el firmware para ajustar la concentración de PM2.5 en función de la humedad y temperatura leídas por el BME680 en tiempo real.
2. **Cámara con Flujo Pasivo Continuo**: La convección natural generada por el diferencial térmico entre el escudo exterior y el interior promueve un flujo laminar constante sin necesidad de microventiladores ruidosos que acortan la vida útil de la batería.
3. **Cámara de Salto Térmico**: La separación entre el gabinete del microcontrolador (que genera un calor residual controlado de ~0.5W) y la cámara de muestreo previene la condensación de rocío sobre la lente del SPS30.

---

## 5. Instrucciones de Fabricación e Impresión 3D

Para series de prototipado o producción de bajo volumen:
* **Material Obligatorio**: **ASA (Acrilonitrilo Estireno Acrilato)** o **PETG con filtro UV**. *(No usar PLA, ya que se deforma a más de 50°C bajo el sol y se biodegrada con la lluvia).*
* **Altura de Capa**: 0.20 mm - 0.28 mm.
* **Perímetros (Paredes)**: 4 a 5 perímetros (grosor mínimo 2.4 mm).
* **Relleno (Infill)**: 35% Gyroid para máxima resistencia mecánica y absorción de impacto.
* **Post-procesado**: Aplicación de junta de silicona RTV o cordón de EPDM en las ranuras de acople.
