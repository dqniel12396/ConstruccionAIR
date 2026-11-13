/**
 * OTech AirNet - Modelado 3D Interactivo de Estación Exterior
 * Three.js Procedural CAD Engine & Visualizer
 */

// Global State
const state = {
  currentMode: 'product', // 'product' | 'plant'
  explodedProgress: 0,
  isXRay: false,
  showDimensions: false,
  showMast: true,
  currentWeather: 'sun', // 'sun', 'rain', 'night'
  selectedComponent: null,
  selectedStation: null,
  simRunning: true,
  simSpeed: 1,
  unitsProduced: 18,
  // Modo Primera Persona (FPS Walkthrough)
  fpsMode: false,
  fpsCameraPos: new THREE.Vector3(0, 10, 85),
  fpsCameraYaw: 0,
  fpsCameraPitch: 0,
  fpsMoveForward: false,
  fpsMoveBackward: false,
  fpsMoveLeft: false,
  fpsMoveRight: false,
  fpsRun: false,
  fpsJump: false,
  fpsVerticalVelocity: 0,
  fpsMouseSensitivity: 0.0005,
  showPlantRoof: false
};

// Scene, Camera, Renderer, Controls & Postprocessing
let scene, camera, renderer, controls;
let composer, renderPass, bloomPass, fxaaPass;
let pbrEnvMap = null;
let texAsphalt = null, texConcrete = null, texCorrugated = null, texGrass = null;
let modelRoot, hoodGroup, enclosureGroup, chassisGroup, stevensonGroup, bracketGroup, mastGroup;
let plantRootGroup, plantStationsMap = {}, plantMovingUnits = [];
let plantSkyDome = null;
const animClock = new THREE.Clock();
let airflowParticles, rainParticles;
let dimensionLinesGroup;
let raycaster, mouse;
let materialsMap = {};
let dirLight, hemiLight, ambientLight, ledRingLight;

function safeRefreshIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try { lucide.createIcons(); } catch (e) { console.warn('Lucide icons error:', e); }
  }
}

// Station Technical Data for Plant Floor Inspection
const plantStationData = {
  st1: {
    title: "Estación 1: Pre-ensamble Chasis & Sensores",
    type: "Ensamble Electromecánico (EPA / ESD)",
    desc: "Montaje de la bandeja deslizable modular (Hot-Swap). Se fijan el sensor láser Sensirion SPS30 con dampers de amortiguación de silicona, el sensor BME680 y el sensor SCD41 con conexionado JST blindado.",
    specs: {
      "Tiempo de Ciclo (CT)": "12.5 minutos / unidad",
      "Herramientas": "Atornillador de par controlado (0.4 N·m), galgas de tobera",
      "Protección ESD": "Piso conductivo + Tapete disipativo 10^7 Ω + Pulsera",
      "Poka-Yoke": "Plantilla guía física que impide montaje invertido",
      "Operario Responsable": "Operario 1 (Ensamble Chasis)"
    }
  },
  st2: {
    title: "Estación 2: Flasheo Firmware, TLS & Test ICT",
    type: "Programación & Test en Placa (ICT)",
    desc: "Carga automatizada del firmware OTech OS mediante jig con agujas Pogo-Pin. Inyección de claves criptográficas individuales, certificado TLS y prueba de consumo en Deep-Sleep (<150µA) y potencia RF LoRa/Wi-Fi.",
    specs: {
      "Tiempo de Ciclo (CT)": "8.0 minutos / unidad",
      "Equipamiento": "Jig Bed-of-Nails, Fuente DC programable, Analizador RF",
      "Parámetros Clave": "I_sleep < 150µA, I_tx < 180mA, Checksum MD5 OK",
      "Trazabilidad": "Asociación de MAC Address, IMEI y QR a ERP OTech",
      "Operario Responsable": "Operario 2 (Test Electrónico)"
    }
  },
  st3: {
    title: "Estación 3: Integración Gabinete IP65 & Sellado",
    type: "Integración Mecánica & Sellado Hermético",
    desc: "Inserción del chasis en el gabinete estanco de polímero ASA con filtro UV, inserción del pack de baterías LiFePO4 3.2V 6000mAh, acople de la junta perimetral de EPDM y apriete de prensaestopas PG9.",
    specs: {
      "Tiempo de Ciclo (CT)": "14.0 minutos / unidad",
      "Herramientas": "Llave dinamométrica para prensaestopas (2.5 N·m)",
      "Tornillería": "4x Pernos M4 Inox A4 cruzados (1.2 N·m)",
      "Polímero": "ASA / PETG-UV de alto impacto ignífugo",
      "Operario Responsable": "Operario 3 (Integración Final)"
    }
  },
  st4: {
    title: "Estación 4: Banco de Prueba de Hermeticidad IP65",
    type: "Control de Calidad QA - Prueba No Destructiva",
    desc: "Prueba neumática de caída de presión diferencial de aire (Air Decay Leak Test) para certificar estanqueidad IP65 real contra lluvias torrenciales sin sumergir el equipo en agua.",
    specs: {
      "Tiempo de Ciclo (CT)": "5.0 minutos / unidad",
      "Presión de Prueba": "+20 kPa (0.2 bar) con aire seco y limpio",
      "Criterio de Aceptación": "Fuga neta < 0.05 sccm tras 60 seg",
      "Equipo": "Detector neumático diferencial calibrado ATEQ",
      "Acción en Fallo": "Segregación inmediata a mesa de retrabajo de sellos"
    }
  },
  st5: {
    title: "Estación 5: Cámara de Calibración Metrológica",
    type: "Certificación Metrológica & Calibración",
    desc: "Cámara hermética de acero inoxidable 316 donde se inyectan gases patrón (CO2 / VOCs) y aerosol monodisperso de micropartículas PSL 2.5µm trazable a estación patrón MCERTS.",
    specs: {
      "Tiempo de Ciclo (CT)": "15.0 minutos por lote de 5 unidades",
      "Gases Patrón": "Zero Air sintético, CO2 (400, 1000, 2000 ppm)",
      "Aerosol Patrón": "Látex de Poliestireno (PSL 2.5µm) certificado",
      "Entregable": "Certificado de Calibración con Ganancia/Offset en EEPROM",
      "Responsable": "Metrólogo / Inspector QA"
    }
  },
  st6: {
    title: "Estación 6: Cámara de Burn-In Térmico (48 Horas)",
    type: "Prueba de Estrés Térmico & Envejecimiento Acelerado",
    desc: "Rack vertical con capacidad para 50 estaciones transmitiendo telemetría activa a 45°C y 80% HR durante 48 horas continuas para eliminar mortalidad infantil de chips y estabilizar baterías.",
    specs: {
      "Capacidad del Rack": "50 estaciones simultáneas (2 días de producción)",
      "Condición Térmica": "+45°C ± 2°C / 80% ± 5% Humedad Relativa",
      "Telemetría": "Transmisión LoRaWAN / Wi-Fi cada 60s a servidor",
      "Alarma Automática": "Detección de paquetes perdidos o drop de batería > 5%",
      "Régimen": "Proceso pasivo desatendido continuo 24/7"
    }
  },
  st7: {
    title: "Estación 7: Inspección OQC, Empaque & Despacho",
    type: "Aseguramiento de Calidad Saliente & Empaque",
    desc: "Inspección estética en cabina de luz D65, instalación del soporte de mástil, inclusión de manual de usuario, empaque en cartón Kraft corrugado con pulpa moldeada y pesaje de verificación.",
    specs: {
      "Tiempo de Ciclo (CT)": "10.0 minutos / unidad",
      "Inspección Visual": "Cabina D65 (cero rebabas, sellos alineados)",
      "Control de Peso": "Báscula de precisión 2.850 g ± 50 g (kit completo)",
      "Etiquetado": "Impresora térmica: Código QR, S/N, MAC y Sello QA",
      "Destino": "Almacén de Producto Terminado FGS (Muelle Despacho)"
    }
  },
  water: {
    title: "Sistema Industrial de Recolección de Agua de Lluvia",
    type: "Sostenibilidad & Infraestructura de Servicios (Piso 1)",
    desc: "Batería de tanques verticales cilíndricos de polietileno tricapa HDPE con capacidad de 10.000 L, alimentados por bajantes pluviales desde la cubierta, con separador de primeras aguas, filtración multimedia y grupo de presión hidroneumático para sanitarios y lavado industrial.",
    specs: {
      "Capacidad Total": "2x Tanques de 5.000 L (10.000 L totales)",
      "Material": "Polietileno de alta densidad (HDPE) con protección UV",
      "Etapas de Filtrado": "Filtro ciclónico de hojas + Lecho de arena/antracita + Carbón activado",
      "Grupo de Bombeo": "Bomba centrífuga dúplex con variador de frecuencia y calderín 100L",
      "Impacto Ambiental": "Reducción del 65% en la huella hídrica de la planta"
    }
  },
  solar: {
    title: "Parque Solar Fotovoltaico en Cubierta",
    type: "Generación de Energía Renovable & Respaldo (Cubierta)",
    desc: "Arreglo de 24 paneles solares monocristalinos bifaciales de alta eficiencia (550W cada uno) instalados con inclinación de 15°. Conectados a inversor híbrido trifásico con inyección a la microrred de la planta y monitoreo telemétrico en tiempo real.",
    specs: {
      "Potencia Pico Instalada": "13.2 kWp (24 módulos fotovoltaicos de 550W)",
      "Tecnología Celular": "Monocristalina PERC / N-Type bifacial anti-PID",
      "Inversor Solar": "Inversor híbrido trifásico 15 kW con telemetría IoT 4G/Wi-Fi",
      "Cobertura Energética": "Abastece el 85% del consumo eléctrico diurno de la celda de manufactura",
      "Reducción CO2": "Aproximadamente 9.5 toneladas de CO2 evitadas anualmente"
    }
  }
};

// Administrative & Corporate Departments (From Organigram)
const adminDeptData = {
  ceo: {
    title: "Dirección General & Junta de Accionistas",
    type: "Alta Gerencia & Gobierno Corporativo",
    desc: "Liderazgo estratégico, atracción de inversión, gobierno corporativo, cultura y cumplimiento de metas comerciales y financieras.",
    specs: {
      "Líder": "CEO - Gerente General",
      "Responsabilidades": "Estrategia global, relación con accionistas y contratos B2G",
      "Espacio": "Despacho de Presidencia + Sala de Juntas vidriada acústica",
      "Equipamiento": "Sistema de videoconferencia 4K, pantalla táctil interactiva"
    }
  },
  cpo: {
    title: "1. Dirección de Producto e Innovación (CPO)",
    type: "Visión, Portafolio y Roadmap de Producto",
    desc: "Conceptualización de características, priorización de backlog, investigación de experiencia de usuario y validación ambiental de estaciones.",
    specs: {
      "Líder": "CPO - Director de Producto",
      "Equipo": "Product Manager, Product Owner, Diseñador UX/UI, Especialista Ambiental, QA Producto",
      "Herramientas": "Figma, Jira, simuladores climáticos, análisis de métricas",
      "Espacio": "Estudio de cocreación con pizarras de ideación y estaciones UX"
    }
  },
  cto: {
    title: "2. Software, Datos y Nube (CTO)",
    type: "Arquitectura, Seguridad y Escalabilidad Cloud",
    desc: "Desarrollo de la plataforma web/móvil OTech AirNet, ingesta de telemetría IoT en tiempo real, pipelines de analítica/IA y ciberseguridad.",
    specs: {
      "Líder": "CTO - Director de Tecnología",
      "Equipo": "Arquitecto Software, Devs Backend/Frontend/Móvil, Ingeniero Datos/IA, DevOps/SRE, SecOps",
      "Stack": "Node.js, Python, Three.js, PostgreSQL/TimescaleDB, Docker, AWS/GCP",
      "Espacio": "Open space para desarrolladores con conectividad de 10 Gbps"
    }
  },
  hwd: {
    title: "3. Hardware e IoT (Dirección de HW & Lab R&D)",
    type: "Dispositivos, Firmware y Laboratorio Electrónico",
    desc: "Diseño esquemático de PCBs, desarrollo de firmware embebido C/C++ (OTech OS), soporte mecánico CAD y validación de prototipos.",
    specs: {
      "Líder": "Director de Hardware e IoT",
      "Equipo": "Ingeniero Electrónico, Ingeniero Firmware (OTA), Diseñador Industrial, QA HW, Técnico Lab",
      "Equipamiento Lab": "Osciloscopios, analizadores lógicos, microscopio SMD, impresoras 3D",
      "Espacio": "Laboratorio R&D con acceso directo a la nave de manufactura"
    }
  },
  coo: {
    title: "4. Operaciones y Customer Success (COO)",
    type: "Proyectos, Despliegue en Campo y Servicio 24/7",
    desc: "Instalación de redes de monitoreo en postes urbanos/industriales, gestión de SLA, soporte técnico N1/N2 y fidelización del cliente.",
    specs: {
      "Líder": "COO - Director de Operaciones",
      "Equipo": "Project Manager, Técnicos de Campo, Soporte N1/N2, Customer Success Manager, Analista Ops",
      "Infraestructura": "Centro NOC con Video Wall para monitoreo de flotas en vivo",
      "Cobertura": "Despliegues en campo con cuadrillas técnicas motorizadas"
    }
  },
  cfo: {
    title: "5. Comercial y Corporativo (CCO / CFO)",
    type: "Ventas Consultivas, Licitaciones y Sostenibilidad Financiera",
    desc: "Comercialización B2G (alcaldías/gobiernos) y B2B (constructoras/industrias), preparación de licitaciones públicas, finanzas y asesoría legal.",
    specs: {
      "Líder": "CCO / CFO - Dirección Corporativa",
      "Equipo": "Ejecutivo de Cuenta, Analista de Licitaciones (Secop II), Marketing, Finanzas, Legal",
      "Objetivo": "Captación de contratos públicos y expansión regional",
      "Espacio": "Área comercial, sala de licitaciones y archivo contractual seguro"
    }
  },
  datacenter: {
    title: "Infraestructura de Datos & Servidores Cloud IoT",
    type: "Data Center Tier II & Procesamiento Masivo",
    desc: "Centro de datos de alta disponibilidad en Piso 2 para ingesta telemétrica de redes de calidad del aire, almacenamiento histórico de mediciones y balanceo de carga de la plataforma web.",
    specs: {
      "Capacidad": "6x Racks 42U con servidores blade de alta densidad y doble fuente",
      "Conectividad": "Anillo redundante de fibra óptica 10 Gbps + switches gestionados",
      "Climatización": "Unidades In-Row CRAC de precisión con control de temperatura y humedad",
      "Energía": "Doble UPS modular online trifásica + respaldo solar/generador",
      "Seguridad": "Extinción automática por gas limpio Novec y control biométrico"
    }
  }
};

// Component Technical Data for Hotspot Inspection
const componentData = {
  hood: {
    title: "Cúpula Superior y Módulo Solar",
    type: "Protección Climática & Energía",
    desc: "Cúpula cónica inclinada a 12° con celda solar monocristalina y canal de compresión para junta tórica O-Ring. Evita empozamiento de agua y resiste granizo y radiación UV extrema.",
    specs: {
      "Material": "Polímero ASA con aditivo Anti-UV",
      "Inclinación": "12° hacia el ecuador",
      "Panel Solar": "5V / 5W Monocristalino ETFE",
      "Sellado": "Junta tórica EPDM perimetral (IP65)",
      "Fijación": "4x Tornillos Allen M4 Inoxidable A4"
    }
  },
  enclosure: {
    title: "Gabinete Hermético IP65 (Cuerpo Principal)",
    type: "Gabinete Estanco NEMA 4X",
    desc: "Aislamiento total de la electrónica frente a lluvia lateral y condensación. Incluye prensaestopas PG9 estanco y anillo difusor LED RGB para diagnóstico visual del estado de la red y nivel de AQI.",
    specs: {
      "Grado de Protección": "IP65 / IP66 Certificado",
      "Prensaestopas": "Nylon PG9 (Cables 4-8 mm) con O-ring",
      "Anillo LED": "Difusor acrílico 360° RGB inteligente",
      "Diámetro / Altura": "Ø110 mm x 100 mm",
      "Rieles": "Doble guía interna para chasis"
    }
  },
  chassis: {
    title: "Bandeja Deslizable (Chasis de Sensores Hot-Swap)",
    type: "Módulo Interno Electrónico",
    desc: "Estructura modular desmontable en campo en menos de 2 minutos. Aloja la tarjeta de control ESP32-S3, módem LoRaWAN/LTE-M, sensor de partículas Sensirion SPS30 con amortiguación y batería LiFePO4.",
    specs: {
      "MCU": "ESP32-S3 Dual Core + Cripto-chip",
      "Sensor PM": "Sensirion SPS30 (Láser MCERTS)",
      "Sensor Termohigro": "Bosch BME680 (Temp/HR/P/VOCs)",
      "Batería": "LiFePO4 3.2V 6000 mAh (72h backup)",
      "Mantenimiento": "Extracción rápida sin soltar mástil"
    }
  },
  stevenson: {
    title: "Cámara de Muestreo Stevenson (Air Intake)",
    type: "Admisión Aerodinámica de Aire",
    desc: "5 niveles de branquias louvered a 45° que permiten la convección natural del aire hacia los sensores mientras desvían la lluvia lateral. Malla de acero 316 bloquea insectos y cono inferior evacúa condensación.",
    specs: {
      "Ángulo Deflector": "45° hacia abajo contra lluvia",
      "Filtro Biológico": "Malla Acero Inox 316 (300 µm)",
      "Drenaje": "Embudo cónico inferior por gravedad",
      "Aislamiento Solar": "Previene sesgo térmico en BME680"
    }
  },
  bracket: {
    title: "Soporte de Montaje Universal para Mástil y Pared",
    type: "Fijación Mecánica Pesada",
    desc: "Mordaza reforzada para fijación segura en postes de 1.5 a 2.5 pulgadas de diámetro o en paredes de concreto. Resiste vientos huracanados de hasta 120 km/h.",
    specs: {
      "Compatibilidad": "Mástil 1.5\" - 2.5\" (38 a 64 mm)",
      "Abrazaderas": "2x Zunchos sinfín de Acero Inox (12.7 mm)",
      "Montaje Pared": "4x Barrenos para pernos M6",
      "Carga de Viento": "Resistencia a 120 km/h"
    }
  }
};

// Initialize Application
function initApp() {
  initThree();
  buildStation3D();
  buildPlant3D();
  createAirflowParticles();
  createRainParticles();
  createDimensionLines();
  setupUIEvents();
  safeRefreshIcons();
  animate();
}

// ====================================================================
// CONSTRUCCIÓN 3D ARQUITECTÓNICA DE ALTA FIDELIDAD (COMPLEJO OTECH)
// ====================================================================
function buildPlant3D() {
  plantRootGroup = new THREE.Group();
  plantRootGroup.visible = false;

  // Helper: Crear Figuras Humanas 3D de Alta Fidelidad y Articuladas para Animación
  function createHuman3D(x, y, z, rotDeg, isESD = true, isSeated = false, workerRole = 'general') {
    if (!window.plantWorkers) window.plantWorkers = [];
    const hGroup = new THREE.Group();

    // Paleta de Materiales de Protección Individual (EPI / PPE) de Alta Fidelidad
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfab8d, roughness: 0.65 });
    const helmetColor = isESD ? 0x0284c7 : (isSeated ? 0xf8fafc : 0xfacc15); // Blanco supervisores/oficina, amarillo planta, azul ESD
    const helmetMat = new THREE.MeshStandardMaterial({ color: helmetColor, roughness: 0.3, metalness: 0.15 });
    const bootSoleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });
    const bootLeatherMat = new THREE.MeshStandardMaterial({ color: 0x271c19, roughness: 0.65 });
    const toeCapMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.4 });
    const glassesLensMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5, roughness: 0.1 });

    // Chaleco de alta visibilidad (Hi-Vis) con bandas micro-prismáticas reflectivas plata
    const vestColor = isESD ? 0x0ea5e9 : (workerRole === 'guard' ? 0x1e293b : 0xf97316);
    const vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.5 });
    const reflectiveMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.05 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }); // Guante nitrilo ESD
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e2530, roughness: 0.8 });
    const metalToolMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });

    let headPivot = new THREE.Group();
    let torsoGroup = new THREE.Group();
    let leftArmPivot = new THREE.Group();
    let rightArmPivot = new THREE.Group();
    let rightForearmPivot = new THREE.Group();
    let toolMesh = null;
    let laserMesh = null;

    if (isSeated) {
      // SILLA ERGONÓMICA DE LABORATORIO TÉCNICA (5 RUEDAS EN ESTRELLA)
      const chairGroup = new THREE.Group();
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.15 });
      const fabricMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

      // Base 5 radios con ruedas
      for (let r = 0; r < 5; r++) {
        const ang = (r * Math.PI * 2) / 5;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 2.2), chromeMat);
        spoke.position.set(Math.sin(ang) * 1.1, 0.4, Math.cos(ang) * 1.1);
        spoke.rotation.y = ang;
        const castor = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 8), bootSoleMat);
        castor.rotation.z = Math.PI / 2;
        castor.position.set(Math.sin(ang) * 2.1, 0.25, Math.cos(ang) * 2.1);
        chairGroup.add(spoke, castor);
      }
      // Pistón de gas central y aro reposapiés
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 2.6, 12), chromeMat);
      piston.position.set(0, 1.6, 0);
      const footRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.12, 8, 16), chromeMat);
      footRing.rotation.x = Math.PI / 2;
      footRing.position.set(0, 1.2, 0);
      chairGroup.add(piston, footRing);

      // Asiento anatómico tapizado
      const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 3.2), fabricMat);
      seat.position.set(0, 3.0, 0);
      const backSupport = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 0.4), chromeMat);
      backSupport.position.set(0, 4.4, -1.5);
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 0.5), fabricMat);
      backrest.position.set(0, 5.2, -1.6);
      chairGroup.add(seat, backSupport, backrest);
      hGroup.add(chairGroup);

      // CUERPO HUMANO SENTADO
      // Botas y pantorrillas ergonómicas descansando en reposapiés
      const footRestAngled = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.4, 1.8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      footRestAngled.position.set(0, 0.2, 1.4);
      footRestAngled.rotation.x = -0.15;
      hGroup.add(footRestAngled);

      for (let s of [-0.9, 0.9]) {
        // Suela
        const sole = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.25, 2.0), bootSoleMat);
        sole.position.set(s, 0.35, 1.4);
        sole.rotation.x = -0.15;
        // Bota
        const boot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 1.9), bootLeatherMat);
        boot.position.set(s, 0.7, 1.4);
        boot.rotation.x = -0.15;
        // Puntera reforzada
        const toe = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.45, 0.8), toeCapMat);
        toe.position.set(s, 0.65, 2.1);
        toe.rotation.x = -0.15;

        const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 2.4, 8), pantsMat);
        calf.position.set(s, 1.8, 1.2);
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.58, 2.4, 8), pantsMat);
        thigh.rotation.x = Math.PI / 2;
        thigh.position.set(s, 3.2, 0.4);
        hGroup.add(sole, boot, toe, calf, thigh);
      }

      // Torso ergonómico
      torsoGroup.position.set(0, 5.1, -0.2);
      torsoGroup.rotation.x = 0.08;
      const torso = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.8, 1.9), shirtMat);
      const vest = new THREE.Mesh(new THREE.BoxGeometry(3.08, 3.2, 2.0), vestMat);
      const refBand1 = new THREE.Mesh(new THREE.BoxGeometry(3.12, 0.35, 2.04), reflectiveMat);
      refBand1.position.set(0, -0.9, 0);
      const refBand2 = new THREE.Mesh(new THREE.BoxGeometry(3.12, 0.35, 2.04), reflectiveMat);
      refBand2.position.set(0, 0.3, 0);
      torsoGroup.add(torso, vest, refBand1, refBand2);
      hGroup.add(torsoGroup);

      // Brazos articulados sentados
      leftArmPivot.position.set(-1.6, 5.4, -0.1);
      const lUpArm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 2.0, 8), shirtMat);
      lUpArm.position.set(0, -0.9, 0.4);
      lUpArm.rotation.x = -Math.PI / 5;
      const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 1.9, 8), skinMat);
      lForearm.position.set(0, -1.6, 1.2);
      lForearm.rotation.x = -Math.PI / 2.2;
      const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.8), gloveMat);
      lHand.position.set(0, -1.6, 2.2);
      leftArmPivot.add(lUpArm, lForearm, lHand);
      hGroup.add(leftArmPivot);

      rightArmPivot.position.set(1.6, 5.4, -0.1);
      const rUpArm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 2.0, 8), shirtMat);
      rUpArm.position.set(0, -0.9, 0.4);
      rUpArm.rotation.x = -Math.PI / 5;
      const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 1.9, 8), skinMat);
      rForearm.position.set(0, -1.6, 1.2);
      rForearm.rotation.x = -Math.PI / 2.2;
      const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.8), gloveMat);
      rHand.position.set(0, -1.6, 2.2);
      rightArmPivot.add(rUpArm, rForearm, rHand);

      if (workerRole === 'seated_iqc') {
        // Escáner manual en la mano derecha
        toolMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.7), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 }));
        toolMesh.position.set(0, -1.6, 2.6);
        rightArmPivot.add(toolMesh);
      }
      hGroup.add(rightArmPivot);

      // Cabeza y Cuello (Pivot)
      headPivot.position.set(0, 7.1, -0.05);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.8, 8), skinMat);
      neck.position.set(0, 0, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 14), skinMat);
      head.position.set(0, 0.9, 0.1);
      head.scale.set(1.0, 1.15, 1.05);

      const helmetDome = new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), helmetMat);
      helmetDome.position.set(0, 1.35, 0.1);
      const helmetBrim = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.15, 16), helmetMat);
      helmetBrim.position.set(0, 1.3, 0.25);
      const helmetRib = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 2.2), helmetMat);
      helmetRib.position.set(0, 2.3, 0.1);

      const glasses = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.4), glassesLensMat);
      glasses.position.set(0, 1.0, 1.0);
      headPivot.add(neck, head, helmetDome, helmetBrim, helmetRib, glasses);
      hGroup.add(headPivot);

    } else {
      // CUERPO HUMANO DE PIE (OPERARIO INDUSTRIAL ARTICULADO)
      // Botas industriales reforzadas con puntera de acero y suela antideslizante
      for (let s of [-0.9, 0.9]) {
        const sole = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.3, 2.4), bootSoleMat);
        sole.position.set(s, 0.15, 0.2);
        const heel = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.25, 0.9), bootSoleMat);
        heel.position.set(s, 0.42, -0.5);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 2.2), bootLeatherMat);
        boot.position.set(s, 0.75, 0.2);
        const toe = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.6, 0.9), toeCapMat);
        toe.position.set(s, 0.6, 0.9);

        // Piernas con pantalones cargo industriales
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 6.2, 8), pantsMat);
        leg.position.set(s, 3.8, 0);
        hGroup.add(sole, heel, boot, toe, leg);
      }

      // Torso y chaleco reflectivo
      torsoGroup.position.set(0, 9.2, 0);
      const belt = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.5, 1.9), bootSoleMat);
      belt.position.set(0, -2.3, 0);
      const torso = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.6, 2.0), shirtMat);
      const vest = new THREE.Mesh(new THREE.BoxGeometry(3.3, 4.2, 2.1), vestMat);
      const refStripesH1 = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.4, 2.15), reflectiveMat);
      refStripesH1.position.set(0, -1.0, 0);
      const refStripesH2 = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.4, 2.15), reflectiveMat);
      refStripesH2.position.set(0, 0.6, 0);
      const refStripeL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 2.16), reflectiveMat);
      refStripeL.position.set(-0.85, 0.3, 0);
      const refStripeR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 2.16), reflectiveMat);
      refStripeR.position.set(0.85, 0.3, 0);
      // Fotocheck / ID Card OTech
      const idBadge = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      idBadge.position.set(0.9, 0.8, 1.1);
      torsoGroup.add(belt, torso, vest, refStripesH1, refStripesH2, refStripeL, refStripeR, idBadge);
      hGroup.add(torsoGroup);

      // Brazos articulados (Shoulder Pivots)
      leftArmPivot.position.set(-1.8, 10.8, 0);
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 2.8, 8), shirtMat);
      lArm.position.set(0, -1.4, 0.3);
      lArm.rotation.x = -Math.PI / 7;
      const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 2.4, 8), skinMat);
      lForearm.position.set(0, -2.6, 1.2);
      lForearm.rotation.x = -Math.PI / 3;
      const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.8), gloveMat);
      lGlove.position.set(0, -2.6, 2.3);
      leftArmPivot.add(lArm, lForearm, lGlove);
      hGroup.add(leftArmPivot);

      rightArmPivot.position.set(1.8, 10.8, 0);
      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 2.8, 8), shirtMat);
      rArm.position.set(0, -1.4, 0.3);
      rArm.rotation.x = -Math.PI / 7;

      rightForearmPivot.position.set(0, -2.2, 0.6);
      const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 2.4, 8), skinMat);
      rForearm.position.set(0, -0.6, 0.6);
      rForearm.rotation.x = -Math.PI / 3;
      const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.8), gloveMat);
      rGlove.position.set(0, -0.6, 1.7);
      rightForearmPivot.add(rForearm, rGlove);

      // Herramientas específicas por rol de trabajo
      if (workerRole === 'assembly') {
        // Atornillador dinamométrico neumático vertical suspendido
        toolMesh = new THREE.Group();
        const driverBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 12), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 }));
        const driverBit = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), metalToolMat);
        driverBit.position.set(0, -1.4, 0);
        const driverHose = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        driverHose.position.set(0, 1.8, 0);
        toolMesh.add(driverBody, driverBit, driverHose);
        toolMesh.position.set(0, -0.6, 2.2);
        toolMesh.rotation.x = Math.PI / 2;
        rightForearmPivot.add(toolMesh);
      } else if (workerRole === 'sealing') {
        // Llave dinamométrica digital para prensaestopas
        toolMesh = new THREE.Group();
        const wrenchHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.8, 8), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        wrenchHandle.position.set(0, 0, 0);
        wrenchHandle.rotation.x = Math.PI / 2;
        const wrenchHead = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.8), metalToolMat);
        wrenchHead.position.set(0, 0, 1.5);
        toolMesh.add(wrenchHandle, wrenchHead);
        toolMesh.position.set(0, -0.6, 2.1);
        rightForearmPivot.add(toolMesh);
      } else if (workerRole === 'oqc') {
        // Pistola lectora de códigos QR / Datamatrix industrial
        toolMesh = new THREE.Group();
        const gunGrip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.5), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
        const gunHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.1), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        gunHead.position.set(0, 0.6, 0.3);
        toolMesh.add(gunGrip, gunHead);

        // Rayo láser de apuntamiento rojo
        laserMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 12, 6),
          new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6 })
        );
        laserMesh.rotation.x = Math.PI / 2;
        laserMesh.position.set(0, 0.6, 6.8);
        toolMesh.add(laserMesh);

        toolMesh.position.set(0, -0.6, 2.0);
        rightForearmPivot.add(toolMesh);
      } else if (workerRole === 'flashing') {
        // Sonda de verificación electrónica
        toolMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.04, 1.8, 8), metalToolMat);
        toolMesh.rotation.x = Math.PI / 3;
        toolMesh.position.set(0, -0.6, 2.2);
        rightForearmPivot.add(toolMesh);
      } else if (workerRole === 'guard') {
        // Tablilla de control de accesos
        const clipboard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x78350f }));
        clipboard.position.set(0, -2.6, 2.2);
        clipboard.rotation.x = -Math.PI / 4;
        leftArmPivot.add(clipboard);
      }

      rightArmPivot.add(rArm, rightForearmPivot);
      hGroup.add(rightArmPivot);

      // Cabeza y Cuello (Pivot)
      headPivot.position.set(0, 11.8, 0);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.9, 8), skinMat);
      neck.position.set(0, 0, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 14), skinMat);
      head.position.set(0, 1.0, 0.1);
      head.scale.set(1.0, 1.15, 1.05);

      const helmetDome = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), helmetMat);
      helmetDome.position.set(0, 1.5, 0.1);
      const helmetBrim = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.15, 16), helmetMat);
      helmetBrim.position.set(0, 1.45, 0.25);
      const helmetRib = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 2.3), helmetMat);
      helmetRib.position.set(0, 2.5, 0.1);

      const glasses = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.4), glassesLensMat);
      glasses.position.set(0, 1.1, 1.05);
      headPivot.add(neck, head, helmetDome, helmetBrim, helmetRib, glasses);
      hGroup.add(headPivot);
    }

    hGroup.rotation.y = THREE.MathUtils.degToRad(rotDeg);
    hGroup.position.set(x, y, z);

    window.plantWorkers.push({
      group: hGroup,
      role: workerRole,
      isSeated: isSeated,
      headPivot: headPivot,
      torsoGroup: torsoGroup,
      leftArmPivot: leftArmPivot,
      rightArmPivot: rightArmPivot,
      rightForearmPivot: rightForearmPivot,
      toolMesh: toolMesh,
      laserMesh: laserMesh,
      phaseOffset: Math.random() * Math.PI * 2
    });

    return hGroup;
  }

  // =========================================================================
  // ARQUITECTURA DE DOS (2) PISOS DEL COMPLEJO OTECH AIRNET
  // Piso 1 (Nivel 0): Planta de Producción y Ensamble (500 uds/mes), Almacén y Celda en 'U'
  // Piso 2 (Nivel +38): Sede Corporativa, CEO, Juntas, CTO Software, COO NOC y Lab R&D
  // Cubierta (Nivel +70): Cerchas estructurales, lucernarios translúcidos y paneles solares
  // =========================================================================
  window.plantFloor1Group = new THREE.Group();
  window.plantFloor2Group = new THREE.Group();
  window.plantOutdoorGroup = new THREE.Group();
  window.plantRoofGroup = new THREE.Group();
  plantRootGroup.add(window.plantOutdoorGroup);
  plantRootGroup.add(window.plantFloor1Group);
  plantRootGroup.add(window.plantFloor2Group);
  plantRootGroup.add(window.plantRoofGroup);

  // Registro global de colisiones físicas para el Modo Primera Persona (FPS)
  window.plantCollisionBoxes = [];
  function addCollisionBox(minX, maxX, minZ, maxZ, minY = -5, maxY = 50, name = '') {
    window.plantCollisionBoxes.push({ minX, maxX, minZ, maxZ, minY, maxY, name });
  }

  // -------------------------------------------------------------------------
  // 0. CAMPUS EXTERIOR, PARQUEADEROS, GARITA DE ACCESO Y PATIO DE CAMIONES
  // -------------------------------------------------------------------------
  function buildOutdoorCampus() {
    const outdoor = new THREE.Group();
    outdoor.name = "plantOutdoorCampus";

    // Inicializar Texturas Procedurales PBR de Alta Resolución
    if (!texAsphalt) texAsphalt = createAsphaltPBRTexture();
    if (!texConcrete) texConcrete = createConcretePBRTexture();
    if (!texCorrugated) texCorrugated = createCorrugatedPBRTexture();
    if (!texGrass) texGrass = createLawnPBRTexture();

    // Suelo Exterior General (380m x 380m) - Nivelado arquitectónico PBR con Textura de Concreto
    const groundMat = new THREE.MeshStandardMaterial({
      map: texConcrete,
      color: 0x1e293b,
      roughness: 0.80,
      metalness: 0.10
    });
    const ground = new THREE.Mesh(new THREE.BoxGeometry(400, 2, 400), groundMat);
    ground.position.set(0, -1.8, 50); // Losa base: cota superior en Y = -0.80
    ground.receiveShadow = true;
    outdoor.add(ground);

    // Parterres de Césped Verde delimitados con Textura Orgánica PBR
    const grassMat = new THREE.MeshStandardMaterial({
      map: texGrass,
      color: 0x166534,
      roughness: 0.88,
      metalness: 0.0
    });
    // Jardines perimetrales Oeste y Este (al norte de la vía de acceso, Z: -130 a 135)
    const lawnWest = new THREE.Mesh(new THREE.BoxGeometry(50, 0.35, 265), grassMat);
    lawnWest.position.set(-160, -0.625, 3);
    const lawnEast = new THREE.Mesh(new THREE.BoxGeometry(50, 0.35, 265), grassMat);
    lawnEast.position.set(160, -0.625, 3);

    // Parterres frontales ajardinados al sur de la vía de acceso (Z: 192 a 206)
    const lawnSouthW = new THREE.Mesh(new THREE.BoxGeometry(160, 0.35, 14), grassMat);
    lawnSouthW.position.set(-95, -0.625, 199);
    const lawnSouthE = new THREE.Mesh(new THREE.BoxGeometry(160, 0.35, 14), grassMat);
    lawnSouthE.position.set(95, -0.625, 199);

    // Islas ajardinadas decorativas entre parqueadero y patio de camiones
    const islandWest = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 30), grassMat);
    islandWest.position.set(-70, -0.625, 125);
    const islandEast = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 30), grassMat);
    islandEast.position.set(70, -0.625, 125);

    outdoor.add(lawnWest, lawnEast, lawnSouthW, lawnSouthE, islandWest, islandEast);

    // Vía de Acceso Principal Asfaltada PBR (Cota superior en Y = -0.500)
    const roadMat = new THREE.MeshStandardMaterial({
      map: texAsphalt,
      color: 0x1e2430,
      roughness: 0.82,
      metalness: 0.15
    });
    const road = new THREE.Mesh(new THREE.BoxGeometry(380, 0.25, 50), roadMat);
    road.position.set(0, -0.625, 165);
    road.receiveShadow = true;
    outdoor.add(road);

    // Patio de Maniobras para Camiones (Apron pavimentado, Cota superior en Y = -0.500)
    const apronMat = new THREE.MeshStandardMaterial({
      map: texConcrete,
      color: 0x334155,
      roughness: 0.72,
      metalness: 0.12
    });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(180, 0.25, 45), apronMat);
    apron.position.set(0, -0.625, 122.5);
    apron.receiveShadow = true;
    outdoor.add(apron);

    // -------------------------------------------------------------------------
    // SISTEMA DE SEÑALIZACIÓN VIAL INSTANCIADA (CERO Z-FIGHTING, 60 FPS)
    // -------------------------------------------------------------------------
    const yellowPaintMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0
    });
    const whitePaintMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0
    });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7, metalness: 0.1 });
    const instDummy = new THREE.Object3D();

    // 1. Líneas viales amarillas discontinuas centrales (22 marcas)
    const dashCoords = [];
    for (let rx = -170; rx < 170; rx += 16) dashCoords.push(rx);
    const laneDashes = new THREE.InstancedMesh(new THREE.BoxGeometry(10, 0.05, 0.8), yellowPaintMat, dashCoords.length);
    dashCoords.forEach((rx, idx) => {
      instDummy.position.set(rx, -0.475, 165);
      instDummy.rotation.set(0, 0, 0);
      instDummy.scale.set(1, 1, 1);
      instDummy.updateMatrix();
      laneDashes.setMatrixAt(idx, instDummy.matrix);
    });
    laneDashes.instanceMatrix.needsUpdate = true;
    outdoor.add(laneDashes);

    // 2. Pasos de cebra peatonales en el acceso frontal (9 franjas)
    const zebraCoords = [];
    for (let zx = -15; zx <= 15; zx += 3.5) zebraCoords.push(zx);
    const zebraStripes = new THREE.InstancedMesh(new THREE.BoxGeometry(2.0, 0.05, 12), whitePaintMat, zebraCoords.length);
    zebraCoords.forEach((zx, idx) => {
      instDummy.position.set(zx, -0.470, 165);
      instDummy.rotation.set(0, 0, 0);
      instDummy.scale.set(1, 1, 1);
      instDummy.updateMatrix();
      zebraStripes.setMatrixAt(idx, instDummy.matrix);
    });
    zebraStripes.instanceMatrix.needsUpdate = true;
    outdoor.add(zebraStripes);

    // 3. Demarcación de Bahías de Parqueo y Topellantas (10 Oeste + 9 Este = 19 Bahías)
    const pLineCoords = [];
    const wStopCoords = [];
    for (let pk = 0; pk < 10; pk++) {
      const pX = -155 + pk * 8;
      pLineCoords.push({ x: pX, z: 125 });
      wStopCoords.push({ x: pX + 4, z: 118 });
    }
    for (let pk = 0; pk < 9; pk++) {
      const pX = 88 + pk * 8;
      pLineCoords.push({ x: pX, z: 125 });
      wStopCoords.push({ x: pX + 4, z: 118 });
    }

    const parkingLinesMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.05, 15.5), whitePaintMat, pLineCoords.length);
    pLineCoords.forEach((pt, idx) => {
      instDummy.position.set(pt.x, -0.470, pt.z);
      instDummy.rotation.set(0, 0, 0);
      instDummy.scale.set(1, 1, 1);
      instDummy.updateMatrix();
      parkingLinesMesh.setMatrixAt(idx, instDummy.matrix);
    });
    parkingLinesMesh.instanceMatrix.needsUpdate = true;

    const wheelStopsMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(5.2, 0.45, 0.7), curbMat, wStopCoords.length);
    wStopCoords.forEach((pt, idx) => {
      instDummy.position.set(pt.x, -0.275, pt.z);
      instDummy.rotation.set(0, 0, 0);
      instDummy.scale.set(1, 1, 1);
      instDummy.updateMatrix();
      wheelStopsMesh.setMatrixAt(idx, instDummy.matrix);
    });
    wheelStopsMesh.instanceMatrix.needsUpdate = true;
    outdoor.add(parkingLinesMesh, wheelStopsMesh);

    // Bahías exclusivas para Vehículos Eléctricos (EV) con pintura verde
    const evGreenMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0
    });
    const evBay1 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.05, 15.5), evGreenMat);
    evBay1.position.set(-151, -0.485, 125);
    const evBay2 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.05, 15.5), evGreenMat);
    evBay2.position.set(-143, -0.485, 125);
    outdoor.add(evBay1, evBay2);

    // Postes de Recarga Eléctrica Rápida (EV Chargers)
    for (let evX of [-151, -143]) {
      const evCharger = new THREE.Group();
      const chBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.0, 1.2), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 }));
      chBody.position.set(0, 2.5, 0);
      const chLight = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.1), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      chLight.position.set(0, 4.2, 0.61);
      evCharger.add(chBody, chLight);
      evCharger.position.set(evX, -0.50, 116.5);
      outdoor.add(evCharger);
      addCollisionBox(evX - 1.2, evX + 1.2, 115, 118, 0, 8, "EVCharger");
    }

    // Helper: Crear Vehículos 3D Estilizados de Alta Gama PBR
    function createCar(x, z, colorHex, isVan = false) {
      const car = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.85, roughness: 0.22 });
      const glassCarMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.95,
        roughness: 0.05,
        transparent: true,
        opacity: 0.78
      });
      const trimDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.92 });
      const brakeCaliperMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.3 });

      if (isVan) {
        // Van utilitaria moderna
        const lower = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.6, 13.8), bodyMat);
        lower.position.set(0, 2.0, 0);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.4, 13.4), bodyMat);
        upper.position.set(0, 4.2, -0.1);
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.8, 3.6), glassCarMat);
        windshield.position.set(0, 3.8, 3.4);
        windshield.rotation.x = -0.3;
        const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(6.65, 1.0, 8.5), new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }));
        sideStripe.position.set(0, 3.0, -1.2);
        car.add(lower, upper, windshield, sideStripe);
      } else {
        // Sedán / Crossover aerodinámico moderno
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.5, 12.8), bodyMat);
        chassis.position.set(0, 1.5, 0);
        const hoodSlope = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.7, 3.6), bodyMat);
        hoodSlope.rotation.x = -0.12;
        hoodSlope.position.set(0, 2.3, 3.6);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.8, 6.4), glassCarMat);
        cabin.position.set(0, 3.2, -0.4);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.2, 5.6), bodyMat);
        roof.position.set(0, 4.2, -0.4);
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.15, 0.8), trimDarkMat);
        spoiler.position.set(0, 2.6, -6.1);
        car.add(chassis, hoodSlope, cabin, roof, spoiler);
      }

      // Espejos retrovisores aerodinámicos
      for (let mx of [-3.3, 3.3]) {
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), trimDarkMat);
        mirror.position.set(mx, 3.1, 1.6);
        car.add(mirror);
      }

      // 4 Ruedas deportivas con llantas de aleación, discos de freno y pinzas rojas
      for (let wx of [-3.25, 3.25]) {
        for (let wz of [-4.0, 4.0]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.9, 16), tireMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 1.25, wz);
          const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.94, 12), chromeMat);
          rim.rotation.z = Math.PI / 2;
          rim.position.set(wx, 1.25, wz);
          const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.4), brakeCaliperMat);
          caliper.position.set(wx > 0 ? wx - 0.25 : wx + 0.25, 1.5, wz + 0.2);
          car.add(wheel, rim, caliper);
        }
      }

      // Ópticas LED frontales y traseras con material autoluminoso
      const fLightL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      fLightL.position.set(-2.0, 2.0, 6.42);
      const fLightR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      fLightR.position.set(2.0, 2.0, 6.42);
      const grille = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.15), trimDarkMat);
      grille.position.set(0, 1.8, 6.42);

      const rLight = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.3, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      rLight.position.set(0, 2.3, -6.42);
      car.add(fLightL, fLightR, grille, rLight);

      car.position.set(x, -0.50, z); // Neumáticos asentados al ras de la rasante de rodadura Y = -0.50
      outdoor.add(car);
      addCollisionBox(x - 3.8, x + 3.8, z - 7.0, z + 7.0, 0, 10, "ParkedCar");
    }

    createCar(-151, 126, 0x0ea5e9, true);  // Van Eléctrica OTech
    createCar(-135, 126, 0x3b82f6, false); // SUV Ejecutivo Azul
    createCar(-127, 126, 0xf8fafc, false); // Sedán Blanco Perla
    createCar(-119, 126, 0x475569, false); // Sedán Gris Grafito
    createCar(-103, 126, 0xdc2626, false); // Crossover Rojo
    createCar(-95, 126, 0x0284c7, true);   // Van Soporte Técnico

    // Helper: Montacargas Industrial de Almacén (Forklift)
    function createForklift(x, z, ry = 0) {
      const fl = new THREE.Group();
      const flYellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.35 });
      const flDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
      const flForkMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });

      // Chasis principal y contrapeso posterior
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 6.0), flYellowMat);
      body.position.set(0, 1.8, 0);
      const cweight = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 2.4, 12, 1, false, 0, Math.PI), flDarkMat);
      cweight.rotation.y = Math.PI / 2;
      cweight.position.set(0, 1.8, -3.0);

      // Jaula de protección antivuelco (FOPS/ROPS)
      const cageTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 4.0), flDarkMat);
      cageTop.position.set(0, 5.8, -0.2);
      for (let px of [-1.7, 1.7]) {
        for (let pz of [-1.9, 1.9]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.8, 8), flDarkMat);
          post.position.set(px, 4.4, pz);
          fl.add(post);
        }
      }
      // Asiento y volante
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), flDarkMat);
      seat.position.set(0, 3.4, -0.6);
      const steering = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 12), flDarkMat);
      steering.rotation.x = Math.PI / 3;
      steering.position.set(0, 4.2, 1.0);

      // Mástil vertical de elevación doble etapa
      const mastL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.5, 0.4), flDarkMat);
      mastL.position.set(-1.6, 4.5, 3.4);
      const mastR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.5, 0.4), flDarkMat);
      mastR.position.set(1.6, 4.5, 3.4);
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.2, 0.3), flDarkMat);
      carriage.position.set(0, 2.0, 3.6);

      // Horquillas / Uñas de carga de acero
      for (let fx of [-1.0, 1.0]) {
        const forkV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.0, 0.2), flForkMat);
        forkV.position.set(fx, 1.5, 3.8);
        const forkH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 3.2), flForkMat);
        forkH.position.set(fx, 0.5, 5.4);
        fl.add(forkV, forkH);
      }

      // Palé de madera con cajas de logística
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 3.2), new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 }));
      pallet.position.set(0, 0.7, 5.4);
      const box1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.4), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
      box1.position.set(-0.8, 1.5, 5.4);
      const box2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.4), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
      box2.position.set(0.8, 1.5, 5.4);

      // Ruedas industriales macizas
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
      for (let wx of [-1.9, 1.9]) {
        const wFront = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.7, 16), tireMat);
        wFront.rotation.z = Math.PI / 2;
        wFront.position.set(wx, 1.0, 1.8);
        const wRear = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.6, 16), tireMat);
        wRear.rotation.z = Math.PI / 2;
        wRear.position.set(wx, 0.8, -2.2);
        fl.add(wFront, wRear);
      }

      // Faro de destello estroboscópico de seguridad (Beacon)
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 12), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      beacon.position.set(0, 6.1, -1.8);

      fl.add(body, cweight, cageTop, seat, steering, mastL, mastR, carriage, pallet, box1, box2, beacon);
      fl.rotation.y = ry;
      fl.position.set(x, -0.50, z);
      outdoor.add(fl);
      addCollisionBox(x - 3.0, x + 3.0, z - 4.5, z + 7.0, 0, 8, "Forklift");
    }

    // Ubicar Montacargas activo frente al Muelle 1
    createForklift(-36, 114, Math.PI / 4);

    // Garita de Vigilancia, Isla de Acceso y Control Vial Profesional
    // Ubicada en la isla central de acceso (X: -60, Z: 150)
    // Carril de Ingreso (Derecha): X: -54 a -40 con flecha verde de entrada
    // Carril de Salida (Izquierda): X: -80 a -66 con flecha blanca de salida
    const boothGroup = new THREE.Group();

    // Isla de concreto con bordillos de seguridad biselados
    const islandBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const islandCurbMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
    const boothIsland = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 22), islandBaseMat);
    boothIsland.position.set(0, 0.3, 0);
    const boothIslandCurb = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.4, 22.6), islandCurbMat);
    boothIslandCurb.position.set(0, 0.15, 0);
    boothGroup.add(boothIsland, boothIslandCurb);

    // Muro base antepecho (solo 2.6m de alto para permitir visibilidad completa)
    const boothBaseWallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.2 });
    const boothLowerWalls = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.6, 10.0), boothBaseWallMat);
    boothLowerWalls.position.set(0, 1.6, 0);

    // Ventanales panorámicos de 360 grados de vidrio de seguridad templado
    const boothGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.4,
      depthWrite: false
    });
    const boothGlass = new THREE.Mesh(new THREE.BoxGeometry(7.8, 4.4, 10.2), boothGlassMat);
    boothGlass.position.set(0, 5.1, 0);

    // 4 Pilares esquineros de aluminio grafito
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    for (let px of [-3.8, 3.8]) {
      for (let pz of [-5.0, 5.0]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.2, 0.5), pillarMat);
        pillar.position.set(px, 3.9, pz);
        boothGroup.add(pillar);
      }
    }

    // Cubierta arquitectónica voladiza con plafón LED perimetral
    const boothRoof = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.8, 13.5), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 }));
    boothRoof.position.set(0, 7.6, 0);
    const soffitLight = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.1, 12.0), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
    soffitLight.position.set(0, 7.15, 0);

    // Mostrador interior y pantallas de CCTV con mapa de seguridad
    const counterDesk = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.4, 2.0), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    counterDesk.position.set(0, 1.5, 2.0);
    const monitor1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.15), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    monitor1.position.set(-1.2, 3.3, 2.2);
    const monitor2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.15), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    monitor2.position.set(1.2, 3.3, 2.2);
    boothGroup.add(boothLowerWalls, boothGlass, boothRoof, soffitLight, counterDesk, monitor1, monitor2);

    // Letrero Luminoso de Control de Acceso
    const boothSignTex = createSignBadgeTexture("CONTROL DE ACCESO & SEGURIDAD", "VIGILANCIA 24/7 • BARRERA AUTOMÁTICA", "#0284c7");
    const boothSign = createSignPanel(7.8, 1.8, boothSignTex, 1);
    boothSign.position.set(0, 8.8, 0);
    boothGroup.add(boothSign);

    // Guardia oficial visible detrás del mostrador mirando al sur hacia los carros que ingresan
    const guard = createHuman3D(0, 0.3, 0.5, 0, false, false, 'guard');
    boothGroup.add(guard);
    boothGroup.position.set(-60, -0.50, 150);

    boothGroup.userData = {
      id: 'guardhouse',
      name: "Garita de Vigilancia & Control de Acceso",
      badge: "SEGURIDAD PERIMETRAL",
      desc: "Puesto de control de acceso vehicular y peatonal 24/7 con barreras RFID y cámaras LPR.",
      extra: "Oficial: Seguridad Privada • OTech Campus Seguro",
      isInteractive: true
    };
    if (!window.fpsInteractiveTargets) window.fpsInteractiveTargets = [];
    window.fpsInteractiveTargets.push(boothGroup);
    outdoor.add(boothGroup);
    addCollisionBox(-66, -54, 138, 162, 0, 15, "GuardHouse");

    // Pluma / Barrera Vehicular Automatizada (Controla el Carril de Entrada a la derecha del guarda)
    const barrierGroup = new THREE.Group();
    const barrierPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.0, 1.8), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.3 }));
    barrierPedestal.position.set(0, 2.0, 0);
    const barrierArm = new THREE.Mesh(new THREE.BoxGeometry(15, 0.5, 0.25), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    barrierArm.position.set(7.5, 3.5, 0);
    for (let bStr = 2; bStr < 15; bStr += 2.5) {
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.52, 0.27), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      bMesh.position.set(bStr, 3.5, 0);
      barrierGroup.add(bMesh);
    }
    const stopSign = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 8), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    stopSign.rotation.x = Math.PI / 2;
    stopSign.position.set(7.5, 3.5, 0.18);
    barrierGroup.add(barrierPedestal, barrierArm, stopSign);
    barrierGroup.position.set(-54, -0.50, 150);
    outdoor.add(barrierGroup);

    // Pintura vial en el pavimento de los carriles:
    // Carril Entrada (X: -47): flecha verde apuntando al Norte
    const laneGreenMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0
    });
    const arrowEntry = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 8.0), laneGreenMat);
    arrowEntry.position.set(-47, -0.465, 155);
    const arrowEntryHead = new THREE.Mesh(new THREE.ConeGeometry(2.0, 3.5, 3), laneGreenMat);
    arrowEntryHead.rotation.x = -Math.PI / 2;
    arrowEntryHead.position.set(-47, -0.465, 149);
    outdoor.add(arrowEntry, arrowEntryHead);

    // Carril Salida (X: -73): flecha blanca apuntando al Sur
    const laneWhiteMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0
    });
    const arrowExit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 8.0), laneWhiteMat);
    arrowExit.position.set(-73, -0.465, 148);
    const arrowExitHead = new THREE.Mesh(new THREE.ConeGeometry(2.0, 3.5, 3), laneWhiteMat);
    arrowExitHead.rotation.x = Math.PI / 2;
    arrowExitHead.position.set(-73, -0.465, 154);
    outdoor.add(arrowExit, arrowExitHead);

    // Tótem Monumental de Entrada Corporativa OTech S.A.S. (Sobre la berma ajardinada Z: 178)
    const totemGroup = new THREE.Group();
    const totemBase = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 4.5), curbMat);
    totemBase.position.set(0, 0.6, 0);
    const totemPylon = new THREE.Mesh(new THREE.BoxGeometry(14, 20, 2.6), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.2 }));
    totemPylon.position.set(0, 10.6, 0);

    const totemTex = createSignBadgeTexture("BIENVENIDOS A OTech AirNet", "PARQUE INDUSTRIAL & SEDE CORPORATIVA • ISO 9001", "#0284c7");
    const totemDisplay = createSignPanel(13.2, 7.5, totemTex, 1);
    totemDisplay.position.set(0, 13.5, 1.35); // En la cara frontal del pilón para evitar solapamiento

    totemGroup.add(totemBase, totemPylon, totemDisplay);
    totemGroup.position.set(-90, -0.50, 178);
    outdoor.add(totemGroup);
    addCollisionBox(-98, -82, 175, 181, 0, 22, "TotemSign");

    // Camiones de Carga y Logística Industrial PBR con Aerodinámica
    function createFreightTruck(x, z, trailerColor, isReceiving = true) {
      const truck = new THREE.Group();
      const cabMat = new THREE.MeshStandardMaterial({ color: isReceiving ? 0xdc2626 : 0x0284c7, metalness: 0.75, roughness: 0.28 });
      const trailerMat = new THREE.MeshStandardMaterial({
        map: texCorrugated,
        color: trailerColor,
        metalness: 0.45,
        roughness: 0.45
      });
      const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });

      // Cabina Tractora con deflector de viento aerodinámico
      const cab = new THREE.Mesh(new THREE.BoxGeometry(10.5, 11, 10), cabMat);
      cab.position.set(0, 6.5, 15);
      const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(10.6, 4.5, 4.0), new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7, roughness: 0.1 }));
      cabGlass.position.set(0, 8.5, 16.5);
      const cabDeflector = new THREE.Mesh(new THREE.BoxGeometry(9.8, 3.2, 7.5), cabMat);
      cabDeflector.rotation.x = -0.28;
      cabDeflector.position.set(0, 12.8, 14.2);
      const grill = new THREE.Mesh(new THREE.BoxGeometry(8.0, 4.0, 0.4), chromeMat);
      grill.position.set(0, 4.5, 20.1);
      truck.add(cab, cabGlass, cabDeflector, grill);

      // Chimenea de escape vertical cromada
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 12, 12), chromeMat);
      exhaust.position.set(-5.1, 11.0, 9.8);
      truck.add(exhaust);

      // Depósitos laterales de combustible de aluminio
      for (let tx of [-5.2, 5.2]) {
        const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.8, 12), chromeMat);
        fuelTank.rotation.x = Math.PI / 2;
        fuelTank.position.set(tx, 2.4, 5.0);
        truck.add(fuelTank);
      }

      // Furgón de Carga (Trailer acoplado)
      const trailer = new THREE.Mesh(new THREE.BoxGeometry(11, 13.5, 26), trailerMat);
      trailer.position.set(0, 8.5, -2);
      truck.add(trailer);

      // Si es recepción, mostrar pallets interiores
      if (isReceiving) {
        const insideCargo = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 8), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 }));
        insideCargo.position.set(0, 5.5, -12);
        truck.add(insideCargo);
      }

      // Ruedas (6 ruedas grandes apoyadas exactamente sobre el pavimento Y = -0.50)
      for (let wx of [-5.4, 5.4]) {
        for (let wz of [-10, -5, 14]) {
          const tire = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1.4, 16), blackMat);
          tire.rotation.z = Math.PI / 2;
          tire.position.set(wx, 2.2, wz);
          const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.45, 10), chromeMat);
          rim.rotation.z = Math.PI / 2;
          rim.position.set(wx, 2.2, wz);
          truck.add(tire, rim);
        }
      }

      truck.position.set(x, -0.50, z); // Neumáticos al ras de la cota Y = -0.50
      outdoor.add(truck);
      addCollisionBox(x - 7, x + 7, z - 16, z + 22, 0, 18, isReceiving ? "ReceivingTruck" : "ShippingTruck");
    }

    createFreightTruck(-50, 122, 0xf1f5f9, true);  // Camión Materias Primas BOM (Muelle 1)
    createFreightTruck(50, 122, 0x0f172a, false);  // Camión Despacho FGS (Muelle 2)

    // Conos de tráfico de seguridad asentados al ras
    function createTrafficCone(cx, cz) {
      const cGroup = new THREE.Group();
      const coneBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 1.6), new THREE.MeshStandardMaterial({ color: 0xea580c }));
      const coneBody = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.4, 12), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
      coneBody.position.set(0, 1.2, 0);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 0.6, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      stripe.position.set(0, 1.2, 0);
      cGroup.add(coneBase, coneBody, stripe);
      cGroup.position.set(cx, -0.50, cz);
      outdoor.add(cGroup);
    }
    createTrafficCone(-38, 108);
    createTrafficCone(-38, 120);
    createTrafficCone(38, 108);
    createTrafficCone(38, 120);

    // Postes de Alumbrado Solar LED Exterior (THREE.InstancedMesh: 10 unidades consolidadas)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.25 });
    const lightHeadMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const polePositions = [
      [-170, 155], [-110, 155], [-50, 155], [50, 155], [110, 155], [170, 155],
      [-110, 102], [110, 102],
      [100, 143], [140, 143]
    ];
    const mastGeo = new THREE.CylinderGeometry(0.4, 0.6, 24, 12);
    const armGeo = new THREE.BoxGeometry(0.3, 0.3, 4.0);
    const lampGeo = new THREE.BoxGeometry(1.2, 0.4, 2.5);

    const mastInst = new THREE.InstancedMesh(mastGeo, poleMat, polePositions.length);
    const armInst = new THREE.InstancedMesh(armGeo, poleMat, polePositions.length);
    const lampInst = new THREE.InstancedMesh(lampGeo, lightHeadMat, polePositions.length);

    polePositions.forEach(([px, pz], idx) => {
      // Mastil apoyado en Y = -0.50 (altura 24 -> centro en Y = 11.50)
      instDummy.position.set(px, 11.5, pz);
      instDummy.rotation.set(0, 0, 0);
      instDummy.scale.set(1, 1, 1);
      instDummy.updateMatrix();
      mastInst.setMatrixAt(idx, instDummy.matrix);

      // Brazo voladizo
      instDummy.position.set(px, 23.0, pz + 1.8);
      instDummy.updateMatrix();
      armInst.setMatrixAt(idx, instDummy.matrix);

      // Cabezal luminario LED
      instDummy.position.set(px, 22.8, pz + 3.2);
      instDummy.updateMatrix();
      lampInst.setMatrixAt(idx, instDummy.matrix);

      addCollisionBox(px - 1.2, px + 1.2, pz - 1.2, pz + 1.2, 0, 25, "LightPole");
    });
    mastInst.instanceMatrix.needsUpdate = true;
    armInst.instanceMatrix.needsUpdate = true;
    lampInst.instanceMatrix.needsUpdate = true;
    outdoor.add(mastInst, armInst, lampInst);

    // Árboles y Vegetación Ornamental Perimetral (THREE.InstancedMesh: 33 árboles en 3 Draw Calls)
    const treePositions = [];
    for (let tz = 20; tz <= 180; tz += 28) {
      treePositions.push([-180, tz], [180, tz]);
    }
    for (let tx = -70; tx <= 70; tx += 28) {
      if (Math.abs(tx) > 20) treePositions.push([tx, 192]);
    }
    for (let ax = -150; ax <= 150; ax += 30) {
      treePositions.push([ax, -118]);
    }
    for (let az = 40; az <= 90; az += 25) {
      treePositions.push([170, az], [-170, az]);
    }

    // Árboles Arquitectónicos Estilizados PBR (THREE.InstancedMesh con Copas Poliédricas Suaves)
    const trunkGeo = new THREE.CylinderGeometry(0.65, 1.15, 8.5, 10);
    const leaves1Geo = new THREE.DodecahedronGeometry(5.4, 1);
    const leaves2Geo = new THREE.DodecahedronGeometry(3.9, 1);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3419, roughness: 0.95 });
    const leaves1Mat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.82, metalness: 0.05 });
    const leaves2Mat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.80, metalness: 0.05 });

    const trunksInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const leaves1Inst = new THREE.InstancedMesh(leaves1Geo, leaves1Mat, treePositions.length);
    const leaves2Inst = new THREE.InstancedMesh(leaves2Geo, leaves2Mat, treePositions.length);

    treePositions.forEach(([tx, tz], idx) => {
      // Tronco asentado exactamente en Y = -0.50 (altura 8.5 -> centro en Y = 3.75)
      instDummy.position.set(tx, 3.75, tz);
      instDummy.rotation.set(0, 0, 0);
      instDummy.scale.set(1, 1, 1);
      instDummy.updateMatrix();
      trunksInst.setMatrixAt(idx, instDummy.matrix);

      // Follaje arquitectónico inferior
      instDummy.position.set(tx, 9.2, tz);
      instDummy.rotation.set(0.1, idx * 0.5, 0.05);
      instDummy.updateMatrix();
      leaves1Inst.setMatrixAt(idx, instDummy.matrix);

      // Follaje arquitectónico superior
      instDummy.position.set(tx, 13.8, tz);
      instDummy.rotation.set(-0.05, -idx * 0.3, 0.1);
      instDummy.updateMatrix();
      leaves2Inst.setMatrixAt(idx, instDummy.matrix);

      addCollisionBox(tx - 2.5, tx + 2.5, tz - 2.5, tz + 2.5, 0, 18, "Tree");
    });
    trunksInst.instanceMatrix.needsUpdate = true;
    leaves1Inst.instanceMatrix.needsUpdate = true;
    leaves2Inst.instanceMatrix.needsUpdate = true;
    outdoor.add(trunksInst, leaves1Inst, leaves2Inst);

    // Cerramiento Perimetral de Seguridad (Valla metálica con zócalo)
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const fenceN = new THREE.Mesh(new THREE.BoxGeometry(370, 7.0, 0.4), fenceMat);
    fenceN.position.set(0, 3.5, -135);
    const fenceW = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.0, 340), fenceMat);
    fenceW.position.set(-185, 3.5, 35);
    const fenceE = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.0, 340), fenceMat);
    fenceE.position.set(185, 3.5, 35);
    outdoor.add(fenceN, fenceW, fenceE);
    addCollisionBox(-186, 186, -136, -134, 0, 15, "FenceNorth");
    addCollisionBox(-186, -184, -135, 205, 0, 15, "FenceWest");
    addCollisionBox(184, 186, -135, 205, 0, 15, "FenceEast");

    
    // =========================================================================
    // 1. ZONA TÉCNICA: TANQUES DE AGUA Y PLANTA DE TRATAMIENTO DE AGUAS (PTAR)
    // =========================================================================
    const ptarGroup = new THREE.Group();
    ptarGroup.name = "WaterTreatmentPlant";

    // Losa de Hormigón Armado con Dique de Retención (Bund Wall anti-derrames)
    const ptarSlabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const ptarSlab = new THREE.Mesh(new THREE.BoxGeometry(46, 1.2, 58), ptarSlabMat);
    ptarSlab.position.set(145, -0.6, -20);
    ptarSlab.receiveShadow = true;
    ptarGroup.add(ptarSlab);

    // Muros perimetrales del dique de contención (1.8m de altura)
    const bundWallMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 }); // Pintura amarilla de seguridad epóxica
    const bundNorth = new THREE.Mesh(new THREE.BoxGeometry(46, 1.8, 1.2), bundWallMat);
    bundNorth.position.set(145, 0.9, -49);
    const bundSouth = new THREE.Mesh(new THREE.BoxGeometry(46, 1.8, 1.2), bundWallMat);
    bundSouth.position.set(145, 0.9, 9);
    const bundEast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 58), bundWallMat);
    bundEast.position.set(168, 0.9, -20);
    const bundWest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 58), bundWallMat);
    bundWest.position.set(122, 0.9, -20);
    ptarGroup.add(bundNorth, bundSouth, bundEast, bundWest);
    addCollisionBox(121, 169, -50, 10, 0, 12, "PTAR_Dike");

    // TANQUE 1: Tanque de Reserva de Agua Potable y Red Contra Incendios (14m diametro, 18m altura)
    const tank1Mat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.5, roughness: 0.3 }); // Acero vitrificado azul
    const tank1 = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.0, 18, 32), tank1Mat);
    tank1.position.set(134, 9.0, -36);
    tank1.castShadow = true;
    tank1.receiveShadow = true;
    const dome1 = new THREE.Mesh(new THREE.SphereGeometry(7.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), tank1Mat);
    dome1.position.set(134, 18.0, -36);
    const ladderMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 }); // Amarillo seguridad
    const ladder = new THREE.Mesh(new THREE.BoxGeometry(1.2, 18, 0.6), ladderMat);
    ladder.position.set(141.4, 9.0, -36);
    const gauge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 15, 0.3), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    gauge.position.set(127, 9.0, -36);
    ptarGroup.add(tank1, dome1, ladder, gauge);

    // TANQUE 2: Tanque Clarificador / Decantador de Aguas Residuales Industriales (12m diametro, 15m altura)
    const tank2Mat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 }); // Acero gris industrial
    const tank2 = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 6.0, 15, 32), tank2Mat);
    tank2.position.set(156, 7.5, -36);
    tank2.castShadow = true;
    const dome2 = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 1.0, 32), tank2Mat);
    dome2.position.set(156, 15.5, -36);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7 });
    const railing = new THREE.Mesh(new THREE.TorusGeometry(6.1, 0.15, 8, 32), railMat);
    railing.rotation.x = Math.PI / 2;
    railing.position.set(156, 16.5, -36);
    ptarGroup.add(tank2, dome2, railing);

    // TANQUE 3: Tanque Reactor Biológico / Ecualizador PTAR (10m diametro, 13m altura)
    const tank3Mat = new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.5, roughness: 0.35 }); // Cian oscuro OTech
    const tank3 = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.0, 13, 32), tank3Mat);
    tank3.position.set(145, 6.5, -12);
    tank3.castShadow = true;
    const dome3 = new THREE.Mesh(new THREE.SphereGeometry(5.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), tank3Mat);
    dome3.position.set(145, 13.0, -12);
    ptarGroup.add(tank3, dome3);

    // Red de Tuberías Aéreas Industriales Interconectadas (Manifold / Pipe Rack)
    const pipeBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.2 });
    const pipeGreenMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.7, roughness: 0.2 });
    const pipeSteelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });

    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 22, 16), pipeBlueMat);
    p1.rotation.z = Math.PI / 2;
    p1.position.set(145, 16, -36);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 24, 16), pipeGreenMat);
    p2.rotation.x = Math.PI / 2;
    p2.position.set(145, 12, -24);
    const pFactory = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 24, 16), pipeSteelMat);
    pFactory.rotation.z = Math.PI / 2;
    pFactory.position.set(111, 14, -20);

    for (let px of [105, 118]) {
      const gPost = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14, 0.8), ladderMat);
      gPost.position.set(px, 7, -20);
      ptarGroup.add(gPost);
    }
    ptarGroup.add(p1, p2, pFactory);

    // Caseta Técnica de Bombas de Recirculación y Filtros
    const pumpHouse = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }));
    pumpHouse.position.set(134, 2.5, 2);
    for (let bi = 0; bi < 2; bi++) {
      const bMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.5, 16), pipeBlueMat);
      bMotor.rotation.z = Math.PI / 2;
      bMotor.position.set(143 + bi * 4, 1.2, 2);
      const bVolute = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.8, 16), pipeSteelMat);
      bVolute.position.set(141.5 + bi * 4, 1.2, 2);
      ptarGroup.add(bMotor, bVolute);
    }
    // Cartel Monumental PTAR con Estructura de Acero Físico y Doble Cara
    const ptarTex = createPTARBannerTexture();
    const ptarSignGroup = new THREE.Group();
    ptarSignGroup.position.set(145, 8.0, 9.4);

    // Marco estructural de viga H de acero
    const ptarFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
    const ptarFrame = new THREE.Mesh(new THREE.BoxGeometry(28.4, 7.4, 0.6), ptarFrameMat);
    ptarSignGroup.add(ptarFrame);

    // Material autoluminoso nítido
    const ptarSignMat = new THREE.MeshStandardMaterial({
      map: ptarTex,
      emissive: 0xffffff,
      emissiveMap: ptarTex,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.15
    });

    // Cara Frontal (Hacia la vía y patio exterior) - Offset frontal para máxima nitidez y cero solapamiento
    const ptarFront = new THREE.Mesh(new THREE.PlaneGeometry(28, 7), ptarSignMat);
    ptarFront.position.set(0, 0, 0.38);
    ptarSignGroup.add(ptarFront);

    // Cara Posterior (Hacia los tanques)
    const ptarBack = new THREE.Mesh(new THREE.PlaneGeometry(28, 7), ptarSignMat);
    ptarBack.rotation.y = Math.PI;
    ptarBack.position.set(0, 0, -0.38);
    ptarSignGroup.add(ptarBack);

    // 2 Columnas de Acero IPN con zócalos de concreto fijadas al suelo y soportando la estructura por DEBAJO y DETRÁS
    for (let px of [-10, 10]) {
      // Pedestal de concreto armado nivelado con el suelo
      const concretePad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 }));
      concretePad.position.set(px, -7.4, -0.45);

      // Placa base de acero apernada al dado de concreto
      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.8), ptarFrameMat);
      basePlate.position.set(px, -6.7, -0.45);

      // Columna de acero estructural IPN (termina en la base inferior del cartel en Y = -3.7 y está retirada a Z = -0.45)
      const postMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.1, 16), ptarFrameMat);
      postMesh.position.set(px, -5.2, -0.45);

      // Brida / cartela superior de fijación soldada bajo el marco inferior
      const topFlange = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 1.4), ptarFrameMat);
      topFlange.position.set(px, -3.7, -0.2);

      // Refuerzo estructural posterior (Tirante hacia la viga trasera)
      const rearBrace = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), ptarFrameMat);
      rearBrace.rotation.x = 0.35;
      rearBrace.position.set(px, -4.8, -0.8);

      ptarSignGroup.add(concretePad, basePlate, postMesh, topFlange, rearBrace);
    }
    ptarGroup.add(pumpHouse, ptarSignGroup);

    // Rótulos Técnicos Nítidos en cada Tanque Cilíndrico (Doble cara luminosa)
    const tk1SignTex = createTankLabelTexture("TK-01: AGUA POTABLE", "RESERVA CONTRA INCENDIOS 18.000 L");
    const tk1Sign = createSignPanel(7.5, 2.0, tk1SignTex, 1);
    tk1Sign.position.set(134, 11, -28.8);
    ptarGroup.add(tk1Sign);

    const tk2SignTex = createTankLabelTexture("TK-02: CLARIFICADOR", "AGUAS RESIDUALES DE PROCESO");
    const tk2Sign = createSignPanel(7.5, 2.0, tk2SignTex, 1);
    tk2Sign.position.set(156, 11, -29.8);
    ptarGroup.add(tk2Sign);

    const tk3SignTex = createTankLabelTexture("TK-03: REACTOR BIOLÓGICO", "SISTEMA PTAR NEUTRALIZACIÓN");
    const tk3Sign = createSignPanel(7.0, 1.8, tk3SignTex, 1);
    tk3Sign.position.set(145, 9, -6.8);
    ptarGroup.add(tk3Sign);

    // Registrar en objetivos interactivos para el Raycaster de la Mira en FPS
    ptarGroup.userData = {
      id: 'ptar',
      name: "Planta de Tratamiento de Aguas Residuales (PTAR) & Red de Extinción",
      badge: "SISTEMA HIDRÁULICO & AMBIENTAL",
      desc: "Tratamiento de efluentes industriales, decantación y recirculación con reserva de 18.000L para bomberos.",
      extra: "Capacidad: 45.000L totales • Monitoreo pH/Turbidez en vivo",
      isInteractive: true
    };
    if (!window.fpsInteractiveTargets) window.fpsInteractiveTargets = [];
    window.fpsInteractiveTargets.push(ptarGroup);

    outdoor.add(ptarGroup);

    // =========================================================================
    // 2. CANALES DE RECOLECCIÓN DE AGUAS RESIDUALES Y PLUVIALES (DRAINAGE TRENCHES)
    // =========================================================================
    const drainageGroup = new THREE.Group();
    drainageGroup.name = "IndustrialDrainageSystem";

    const trenchBaseMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 });
    const gratingMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });

    // Canal Longitudinal Este (X = 103)
    const trenchEastBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 170), trenchBaseMat);
    trenchEastBase.position.set(103, -0.65, 0);
    const trenchEastGrate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 170), gratingMat);
    trenchEastGrate.position.set(103, -0.45, 0);
    drainageGroup.add(trenchEastBase, trenchEastGrate);

    // Canal Longitudinal Oeste (X = -103)
    const trenchWestBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 170), trenchBaseMat);
    trenchWestBase.position.set(-103, -0.65, 0);
    const trenchWestGrate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 170), gratingMat);
    trenchWestGrate.position.set(-103, -0.45, 0);
    drainageGroup.add(trenchWestBase, trenchWestGrate);

    // Canal Frontal Conector (borde norte del patio de maniobras, Z = 99)
    const trenchFrontBase = new THREE.Mesh(new THREE.BoxGeometry(180, 0.4, 2.2), trenchBaseMat);
    trenchFrontBase.position.set(0, -0.65, 99);
    const trenchFrontGrate = new THREE.Mesh(new THREE.BoxGeometry(180, 0.2, 1.8), gratingMat);
    trenchFrontGrate.position.set(0, -0.45, 99);
    drainageGroup.add(trenchFrontBase, trenchFrontGrate);

    // Canal conector hacia la PTAR (X: 104 a 122, Z: -20)
    const trenchToPTAR = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 2.2), gratingMat);
    trenchToPTAR.position.set(113, -0.45, -20);
    drainageGroup.add(trenchToPTAR);

    // Arquetas / Pozos de Registro con Tapa Circular de Hierro Fundido
    const manholeRingMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.3 });
    const manholePositions = [
      { x: 103, z: -80 }, { x: 103, z: -20 }, { x: 103, z: 40 }, { x: 103, z: 99 },
      { x: -103, z: -80 }, { x: -103, z: 0 }, { x: -103, z: 99 },
      { x: 0, z: 99 }, { x: 122, z: -20 }
    ];
    manholePositions.forEach(m => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 3.2), trenchBaseMat);
      box.position.set(m.x, -0.55, m.z);
      const cover = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.32, 16), manholeRingMat);
      cover.position.set(m.x, -0.45, m.z);
      drainageGroup.add(box, cover);
    });

    // Bajantes Pluviales Verticales de la Cubierta (Acero Galvanizado)
    const downpipeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 });
    const downpipeCoords = [
      { x: 101.5, z: -80 }, { x: 101.5, z: -20 }, { x: 101.5, z: 40 },
      { x: -101.5, z: -80 }, { x: -101.5, z: 0 }, { x: -101.5, z: 60 }
    ];
    downpipeCoords.forEach(dp => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 28, 12), downpipeMat);
      pipe.position.set(dp.x, 14, dp.z);
      const shoe = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 2.5, 12), downpipeMat);
      shoe.rotation.x = Math.PI / 4;
      shoe.position.set(dp.x + (dp.x > 0 ? 0.6 : -0.6), 1.0, dp.z);
      drainageGroup.add(pipe, shoe);
    });

    outdoor.add(drainageGroup);

    // =========================================================================
    // 3. SEGUNDO SECTOR DE PARQUEADEROS (ESTE) & ÁREA DE BICIS Y MOTOS
    // =========================================================================
    const eastParkingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.12 });
    const eastParkingSlab = new THREE.Mesh(new THREE.BoxGeometry(75, 0.25, 42), eastParkingMat);
    eastParkingSlab.position.set(122, -0.625, 125);
    eastParkingSlab.receiveShadow = true;
    outdoor.add(eastParkingSlab);

    // Bahía Accesible para Personas con Movilidad Reducida (PMR) en Azul
    const pmrBlueMat = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0
    });
    const pmrBay = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.05, 15.5), pmrBlueMat);
    pmrBay.position.set(92, -0.470, 125);
    outdoor.add(pmrBay);

    // 4 Vehículos en el Parqueadero Este (Ubicados en bahías pk=1, 2, 3, 4 sin colisión con postes)
    createCar(96, 126, 0xdc2626, false);  // Bahía 1: Sedán Deportivo Rojo
    createCar(104, 126, 0x0284c7, false); // Bahía 2: SUV Azul Eléctrico
    createCar(112, 126, 0x475569, false); // Bahía 3: Sedán Grafito Ejecutivo
    createCar(120, 126, 0xf1f5f9, false); // Bahía 4: Sedán Blanco Perla

    // Zona Techada de Motocicletas y Bicicletas para Empleados (En bahías Este X = 140 a 156, Z = 125)
    const bikeShelter = new THREE.Group();
    bikeShelter.position.set(0, -0.50, 0); // Asentado exactamente a nivel de pavimento Y = -0.50
    const shelterRoof = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.85 })
    );
    shelterRoof.position.set(148, 6.5, 125);
    for (let cx of [140, 156]) {
      for (let cz of [121.5, 128.5]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6.5, 12), curbMat);
        post.position.set(cx, 3.25, cz);
        bikeShelter.add(post);
      }
    }
    const bikeRack = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 }));
    bikeRack.position.set(148, 0.5, 125);
    bikeShelter.add(shelterRoof, bikeRack);

    // Motocicletas eléctricas estilizadas de empleados en el cobertizo
    const motoMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.7, roughness: 0.3 });
    const motoTireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    [144, 148, 152].forEach(mx => {
      const moto = new THREE.Group();
      const mBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 3.2), motoMat);
      mBody.position.set(0, 1.2, 0);
      const mWheelF = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.35, 12), motoTireMat);
      mWheelF.rotation.z = Math.PI / 2;
      mWheelF.position.set(0, 0.7, 1.4);
      const mWheelR = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.35, 12), motoTireMat);
      mWheelR.rotation.z = Math.PI / 2;
      mWheelR.position.set(0, 0.7, -1.4);
      moto.add(mBody, mWheelF, mWheelR);
      moto.position.set(mx, 0, 125);
      bikeShelter.add(moto);
    });
    outdoor.add(bikeShelter);
    addCollisionBox(139, 157, 120, 130, 0, 8, "BikeShelter");

    // =========================================================================
    // 4. ZONAS VERDES AMPLIADAS, PAISAJISMO Y SENDEROS PEATONALES
    // =========================================================================
    const lawnMatLush = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.88, metalness: 0.0 });
    // Franja Verde Norte (detrás del edificio industrial: Z: -130 a -102, X: -160 a 160)
    const lawnNorth = new THREE.Mesh(new THREE.BoxGeometry(320, 0.35, 26), lawnMatLush);
    lawnNorth.position.set(0, -0.625, -116);
    outdoor.add(lawnNorth);

    // Senderos Peatonales Adoquinados
    const walkwayMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75, metalness: 0.05 });
    const pathWest = new THREE.Mesh(new THREE.BoxGeometry(6, 0.30, 75), walkwayMat);
    pathWest.position.set(-68, -0.50, 138);
    const pathEast = new THREE.Mesh(new THREE.BoxGeometry(6, 0.30, 75), walkwayMat);
    pathEast.position.set(68, -0.50, 138);
    const frontWalkway = new THREE.Mesh(new THREE.BoxGeometry(204, 0.30, 6), walkwayMat);
    frontWalkway.position.set(0, -0.50, 102);
    outdoor.add(pathWest, pathEast, frontWalkway);

    // Hileras de Setos Arbustivos Bajos Decorativos
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 });
    for (let hx = -64; hx <= -20; hx += 8) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(7, 1.8, 2.5), hedgeMat);
      hedge.position.set(hx, 0.9, 106);
      outdoor.add(hedge);
    }
    for (let hx = 20; hx <= 64; hx += 8) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(7, 1.8, 2.5), hedgeMat);
      hedge.position.set(hx, 0.9, 106);
      outdoor.add(hedge);
    }

    // Plaza de Descanso Ajardinada con Bancos Exteriores para Empleados
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.30, 24), walkwayMat);
    plaza.position.set(-70, -0.50, 108);
    outdoor.add(plaza);

    const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });
    for (let bi = 0; bi < 3; bi++) {
      const bAngle = (bi * Math.PI * 2) / 3;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.6, 1.5), benchWoodMat);
      bench.position.set(-70 + Math.cos(bAngle) * 5.2, 0.6, 108 + Math.sin(bAngle) * 5.2);
      bench.rotation.y = -bAngle;
      outdoor.add(bench);
    }

    window.plantOutdoorGroup.add(outdoor);
  }

  buildOutdoorCampus();

  // -------------------------------------------------------------------------
  // 1. PISO 1 (NIVEL Y = 0): PLANTA INDUSTRIAL Y LOGÍSTICA
  // -------------------------------------------------------------------------
  // Losa de Cimentación General Piso 1 (200 x 200) con textura de Concreto Epóxico PBR
  const floorFabrica = new THREE.Mesh(
    new THREE.BoxGeometry(200, 2, 200),
    new THREE.MeshStandardMaterial({
      map: texConcrete,
      color: 0x1e2530,
      roughness: 0.65,
      metalness: 0.18
    })
  );
  floorFabrica.position.set(0, -1, 0);
  floorFabrica.receiveShadow = true;
  window.plantFloor1Group.add(floorFabrica);

  // Zona EPA / ESD Azul (Piso Antiestático con brillo epóxico PBR)
  const epaMesh = new THREE.Mesh(
    new THREE.BoxGeometry(140, 0.2, 120),
    new THREE.MeshStandardMaterial({
      map: texConcrete,
      color: 0x0284c7,
      roughness: 0.38,
      metalness: 0.22
    })
  );
  epaMesh.position.set(0, 0.1, -10);
  epaMesh.receiveShadow = true;
  window.plantFloor1Group.add(epaMesh);

  // Franjas de seguridad amarillas Piso 1
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const yellowBorders = [
    { x: 0, z: -71, w: 140, l: 2 },
    { x: 2, z: 51, w: 136, l: 2 }, // Termina en X = -66, dejando libre el acceso a la escalera
    { x: -68, z: -10, w: 2, l: 122 }, // Ubicada a X = -68, pasillo despejado hacia la escalera
    { x: 71, z: -10, w: 2, l: 124 }
  ];
  yellowBorders.forEach(b => {
    const lMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.3, b.l), yellowLineMat);
    lMesh.position.set(b.x, 0.25, b.z);
    window.plantFloor1Group.add(lMesh);
  });

  // Muros Perimetrales Piso 1 (Chapa arquitectónica acanalada PBR 200 x 200)
  const wallMat = new THREE.MeshStandardMaterial({
    map: texCorrugated,
    color: 0x334155,
    roughness: 0.62,
    metalness: 0.38
  });
  const wallP1Back = new THREE.Mesh(new THREE.BoxGeometry(200, 36, 3), wallMat);
  wallP1Back.position.set(0, 18, -100);
  const wallP1West = new THREE.Mesh(new THREE.BoxGeometry(3, 36, 200), wallMat);
  wallP1West.position.set(-100, 18, 0);
  const wallP1East = new THREE.Mesh(new THREE.BoxGeometry(3, 36, 200), wallMat);
  wallP1East.position.set(100, 18, 0);

  // Muro Frontal con Portones y Entrada:
  // Portón 1 (Muelle BOM): Apertura entre X = -62 y X = -38
  // Acceso Principal Vidriado: Apertura entre X = -15 y X = 15
  // Portón 2 (Muelle FGS): Apertura entre X = 38 y X = 62
  const wallFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(38, 36, 3), wallMat); // X: -100 a -62
  wallFrontLeft.position.set(-81, 18, 100);
  const wallFrontMid1 = new THREE.Mesh(new THREE.BoxGeometry(23, 36, 3), wallMat); // X: -38 a -15
  wallFrontMid1.position.set(-26.5, 18, 100);
  const wallFrontMid2 = new THREE.Mesh(new THREE.BoxGeometry(23, 36, 3), wallMat); // X: 15 a 38
  wallFrontMid2.position.set(26.5, 18, 100);
  const wallFrontRight = new THREE.Mesh(new THREE.BoxGeometry(38, 36, 3), wallMat); // X: 62 a 100
  wallFrontRight.position.set(81, 18, 100);

  // Dinteles superiores sobre los portones (Y: 24 a 38)
  const lintelD1 = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 3), wallMat);
  lintelD1.position.set(-50, 31, 100);
  const lintelEnt = new THREE.Mesh(new THREE.BoxGeometry(30, 14, 3), wallMat);
  lintelEnt.position.set(0, 31, 100);
  const lintelD2 = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 3), wallMat);
  lintelD2.position.set(50, 31, 100);

  // Puertas Enrollables Seccionales en Muelles de Carga
  const rollupMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });
  const rollup1 = new THREE.Mesh(new THREE.BoxGeometry(23.6, 12, 1.2), rollupMat); // Muelle 1 abierto
  rollup1.position.set(-50, 18, 100);
  const rollup2 = new THREE.Mesh(new THREE.BoxGeometry(23.6, 23.5, 1.2), rollupMat); // Muelle 2 cerrado
  rollup2.position.set(50, 12, 100);

  // Acceso Principal: Fachada Vidriada de Muro Cortina
  const glassFacadeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5, roughness: 0.1 });
  const entranceGlass = new THREE.Mesh(new THREE.BoxGeometry(29.6, 23.5, 0.4), glassFacadeMat);
  entranceGlass.position.set(0, 12, 100);

  // Gran Marquesina / Pórtico Voladizo de Entrada Corporativa
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(38, 1.4, 22), canopyMat);
  canopy.position.set(0, 24, 109);

  // Rótulo Monumental Iluminado con Nombre Corporativo en la Marquesina del Piso 1
  const p1SignTex = createSignBadgeTexture("OTech AirNet S.A.S.", "PLANTA INDUSTRIAL & CENTRO LOGÍSTICO", "#0284c7");
  const facadeSign = createSignPanel(28, 4.4, p1SignTex, 1);
  facadeSign.position.set(0, 26.8, 119.8);

  window.plantFloor1Group.add(
    wallP1Back, wallP1West, wallP1East,
    wallFrontLeft, wallFrontMid1, wallFrontMid2, wallFrontRight,
    lintelD1, lintelEnt, lintelD2,
    rollup1, rollup2, entranceGlass, canopy, facadeSign
  );

  // Registro de colisiones perimetrales de la nave industrial
  addCollisionBox(-102, 102, -102, -98, 0, 40, "WallBack");
  addCollisionBox(-102, -98, -100, 100, 0, 40, "WallWest");
  addCollisionBox(98, 102, -100, 100, 0, 40, "WallEast");
  addCollisionBox(-102, -62, 98, 102, 0, 40, "WallFrontLeft");
  addCollisionBox(-38, -15, 98, 102, 0, 40, "WallFrontMid1");
  addCollisionBox(15, 38, 98, 102, 0, 40, "WallFrontMid2");
  addCollisionBox(62, 102, 98, 102, 0, 40, "WallFrontRight");
  addCollisionBox(38, 62, 98, 102, 0, 40, "Rollup2Closed"); // Muelle 2 cerrado

  // -------------------------------------------------------------------------
  // 1.0 PILARES Y VIGAS ESTRUCTURALES (CERO ELEMENTOS FLOTANDO)
  // -------------------------------------------------------------------------
  // 16 Columnas de hormigón armado con zapatas y capiteles que sustentan la losa del Piso 2
  const colBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const colShaftMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.2 });
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });

  const colXCoords = [-70, -25, 25, 70];
  const colZCoords = [-70, -25, 25, 70];

  colXCoords.forEach(cx => {
    colZCoords.forEach(cz => {
      // No colocar pilar en medio de la celda de ensamblaje interna
      if (cx === 25 && cz === -25) return;
      if (cx === -25 && cz === -25) return;
      // No colocar pilares que intersecten la escalera arquitectónica (X: -88 a -72, Z: 20 a 74)
      if (cx === -70 && (cz === 25 || cz === 70)) return;

      const pilarGroup = new THREE.Group();
      // Zapata de cimentación en el suelo
      const pad = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 4.2), colBaseMat);
      pad.position.set(0, 0.5, 0);
      // Fuste de la columna (Y de 1.0 a 37.0)
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.4, 36.0, 2.4), colShaftMat);
      shaft.position.set(0, 19.0, 0);
      // Capitel de anclaje superior que se funde con la losa del Piso 2
      const capitel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 4.2), colBaseMat);
      capitel.position.set(0, 37.5, 0);

      pilarGroup.add(pad, shaft, capitel);
      pilarGroup.position.set(cx, 0, cz);
      window.plantFloor1Group.add(pilarGroup);
    });
  });

  // Vigas maestras de acero estructural (IPE) bajo la losa de entrepiso (a Y = 36.8)
  for (let bz of [-70, -25, 25, 70]) {
    if (bz === 25 || bz === 70) {
      // Viga recortada para respetar la apertura y gálibo vertical de la escalera (X: -98 a -68)
      const beamLong = new THREE.Mesh(new THREE.BoxGeometry(164, 2.0, 1.4), beamMat);
      beamLong.position.set(16, 36.8, bz);
      window.plantFloor1Group.add(beamLong);
    } else {
      const beamLong = new THREE.Mesh(new THREE.BoxGeometry(192, 2.0, 1.4), beamMat);
      beamLong.position.set(0, 36.8, bz);
      window.plantFloor1Group.add(beamLong);
    }
  }
  for (let bx of [-70, -25, 25, 70]) {
    const beamTrans = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 192), beamMat);
    beamTrans.position.set(bx, 36.8, 0);
    window.plantFloor1Group.add(beamTrans);
  }

  // -------------------------------------------------------------------------
  // 1.0.1 SISTEMA DE TANQUES DE RECOLECCIÓN Y FILTRACIÓN PLUVIAL (10.000 L)
  // -------------------------------------------------------------------------
  const waterSysGroup = new THREE.Group();
  waterSysGroup.userData = { id: 'water_tanks', name: "Tanques de Recolección de Agua de Lluvia (10.000 L)" };

  // Base de hormigón para los tanques
  const tankPad = new THREE.Mesh(new THREE.BoxGeometry(26, 1.2, 34), colBaseMat);
  tankPad.position.set(0, 0.6, 0);
  waterSysGroup.add(tankPad);

  const tankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
  const tankBandMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.7, roughness: 0.2 }); // Verde industrial aguas tratadas
  const pipeInletMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.2 });

  // 2 Tanques Cilíndricos Verticales de Gran Capacidad
  for (let tz of [-8, 8]) {
    const tGroup = new THREE.Group();
    // Cuerpo del tanque
    const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 5.8, 24, 24), tankMat);
    tankBody.position.set(0, 13.2, 0);
    // Cúpula superior
    const tankDome = new THREE.Mesh(new THREE.SphereGeometry(5.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), tankMat);
    tankDome.position.set(0, 25.2, 0);
    tGroup.add(tankBody, tankDome);

    // Anillos de refuerzo estructural
    for (let ry of [5, 11, 17, 23]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.85, 0.25, 8, 24), tankBandMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, ry, 0);
      tGroup.add(ring);
    }

    // Tubo visualizador de nivel translúcido
    const sightGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 20, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    sightGlass.position.set(5.95, 13, 0);
    tGroup.add(sightGlass);

    tGroup.position.set(-3, 0, tz);
    waterSysGroup.add(tGroup);
  }

  // Tubería de bajante pluvial conectada desde la cubierta
  const downspoutPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 38, 16), pipeInletMat);
  downspoutPipe.position.set(8, 19, 0);
  // Distribuidor manifold a ambos tanques
  const manifold = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 18), pipeInletMat);
  manifold.position.set(5, 24, 0);
  waterSysGroup.add(downspoutPipe, manifold);

  // Módulo de Bombas Centrífugas y Filtro Multimedia
  const pumpSkid = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 10), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 }));
  pumpSkid.position.set(6, 2.6, -6);
  const pressureVessel = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6, 16), new THREE.MeshStandardMaterial({ color: 0x0ea5e9 }));
  pressureVessel.position.set(6, 6, -6);
  waterSysGroup.add(pumpSkid, pressureVessel);

  // Cartel identificador del sistema pluvial
  const waterSign = new THREE.Mesh(new THREE.BoxGeometry(16, 2.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  waterSign.position.set(0, 8, 17.2);
  waterSysGroup.add(waterSign);

  waterSysGroup.position.set(82, 0, -60);
  window.plantFloor1Group.add(waterSysGroup);
  plantStationsMap['water'] = waterSysGroup;

  // -------------------------------------------------------------------------
  // 1.1 ESCALERA ARQUITECTÓNICA ESTRUCTURAL PISO 1 -> PISO 2
  // -------------------------------------------------------------------------
  // Comienza en Piso 1 (X=-80, Z=20, Y=0) y asciende hacia el sur (X=-80, Z=74, Y=38)
  const stairGroup = new THREE.Group();
  const numSteps = 20;
  const stairRise = 38;
  const stairRun = 54;
  const stepH = stairRise / numSteps; // 1.9
  const stepL = stairRun / numSteps;  // 2.7
  const stairW = 16;
  const stairMtl = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.25 });
  const treadMtl = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.5 }); // Huella técnica antideslizante

  for (let i = 0; i < numSteps; i++) {
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stairW, stepH, stepL + 0.3), stairMtl);
    stepMesh.position.set(0, (i + 0.5) * stepH, (i + 0.5) * stepL);
    const tread = new THREE.Mesh(new THREE.BoxGeometry(stairW - 0.4, 0.1, stepL - 0.2), treadMtl);
    tread.position.set(0, (i + 1) * stepH + 0.05, (i + 0.5) * stepL);
    stairGroup.add(stepMesh, tread);
  }

  // Zancas estructurales laterales (Stringers de acero HEB)
  const strDiagLen = Math.sqrt(stairRise * stairRise + stairRun * stairRun);
  const strAngle = Math.atan2(stairRise, stairRun);
  const strGeom = new THREE.BoxGeometry(1.2, 3.0, strDiagLen);
  const strMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });

  const strL = new THREE.Mesh(strGeom, strMat);
  strL.position.set(-stairW / 2 - 0.6, stairRise / 2, stairRun / 2);
  strL.rotation.x = -strAngle;
  const strR = new THREE.Mesh(strGeom, strMat);
  strR.position.set(stairW / 2 + 0.6, stairRise / 2, stairRun / 2);
  strR.rotation.x = -strAngle;
  stairGroup.add(strL, strR);

  // Barandilla con pasamanos continuo de acero inox
  const railMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.95, roughness: 0.1 });
  const railMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, strDiagLen, 12), railMat);
  railMesh.position.set(stairW / 2 + 0.6, stairRise / 2 + 9, stairRun / 2);
  railMesh.rotation.x = Math.PI / 2 - strAngle;
  stairGroup.add(railMesh);

  // Balustres verticales
  for (let b = 2; b < numSteps; b += 3) {
    const baluster = new THREE.Mesh(new THREE.BoxGeometry(0.3, 9, 0.3), strMat);
    baluster.position.set(stairW / 2 + 0.6, b * stepH + 4.5, b * stepL);
    stairGroup.add(baluster);
  }

  stairGroup.position.set(-80, 0, 20);
  window.plantFloor1Group.add(stairGroup);

  // -------------------------------------------------------------------------
  // 2. LOSA DE ENTREPISO Y PISO 2 (NIVEL Y = 38): SEDE CORPORATIVA Y R&D
  // -------------------------------------------------------------------------
  const floor2Y = 38;
  window.plantFloor2Group.position.set(0, floor2Y, 0);

  // Losa de entrepiso estructurada en 3 secciones continuas (SIN sobreposición)
  // dejando un vano abierto exacto para la escalera (X: -98 a -68, Z: 18 a 74)
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

  // 1) Losa Norte (Z: -96 a 18)
  const losaNorth = new THREE.Mesh(new THREE.BoxGeometry(196, 2.5, 114), slabMat);
  losaNorth.position.set(0, -1.25, -39);

  // 2) Losa Este (Z: 18 a 74, X: -68 a 98)
  const losaEast = new THREE.Mesh(new THREE.BoxGeometry(166, 2.5, 56), slabMat);
  losaEast.position.set(15, -1.25, 46);

  // 3) Losa Sur / Descansillo de Desembarco (Z: 74 a 96, X: -98 a 98)
  // Conecta la llegada de la escalera directamente con el corredor corporativo
  const losaSouth = new THREE.Mesh(new THREE.BoxGeometry(196, 2.5, 22), slabMat);
  losaSouth.position.set(0, -1.25, 85);

  window.plantFloor2Group.add(losaNorth, losaEast, losaSouth);

  // Suelo técnico de pasillos Piso 2 (Vinilo arquitectónico mate PBR, grosor 0.1, Y = 0.05)
  const woodHallMat = new THREE.MeshStandardMaterial({
    map: texConcrete,
    color: 0x94a3b8,
    roughness: 0.65,
    metalness: 0.12
  });
  const floorNorth = new THREE.Mesh(new THREE.BoxGeometry(196, 0.1, 114), woodHallMat);
  floorNorth.position.set(0, 0.05, -39);
  const floorEast = new THREE.Mesh(new THREE.BoxGeometry(166, 0.1, 56), woodHallMat);
  floorEast.position.set(15, 0.05, 46);
  const floorSouth = new THREE.Mesh(new THREE.BoxGeometry(196, 0.1, 22), woodHallMat);
  floorSouth.position.set(0, 0.05, 85);
  window.plantFloor2Group.add(floorNorth, floorEast, floorSouth);

  // Barandilla de seguridad perimetral alrededor del vano de escalera en Piso 2
  const stairwellRailMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.4,
    roughness: 0.15,
    metalness: 0.1,
    depthWrite: false
  });
  // Lado Este del hueco (X=-68, Z: 18 a 74)
  const railEast = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.5, 56), stairwellRailMat);
  railEast.position.set(-68, 4.75, 46);
  const railEastTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 56), strMat);
  railEastTop.position.set(-68, 9.8, 46);

  // Lado Norte del hueco (Z=18, X: -98 a -68)
  const railNorth = new THREE.Mesh(new THREE.BoxGeometry(30, 9.5, 0.5), stairwellRailMat);
  railNorth.position.set(-83, 4.75, 18);
  const railNorthTop = new THREE.Mesh(new THREE.BoxGeometry(30, 0.6, 0.8), strMat);
  railNorthTop.position.set(-83, 9.8, 18);

  window.plantFloor2Group.add(railEast, railEastTop, railNorth, railNorthTop);

  // Fachada acristalada exterior Piso 2
  const glassFacadeP2Mat = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    transmission: 0.9,
    depthWrite: false
  });
  const wallP2Back = new THREE.Mesh(new THREE.BoxGeometry(196, 32, 2.5), wallMat);
  wallP2Back.position.set(0, 16, -96);
  const wallP2West = new THREE.Mesh(new THREE.BoxGeometry(2.5, 32, 192), wallMat);
  wallP2West.position.set(-98, 16, 0);
  const wallP2East = new THREE.Mesh(new THREE.BoxGeometry(2.5, 32, 192), wallMat);
  wallP2East.position.set(98, 16, 0);
  // Fachada Frontal Arquitectónica Completa del Piso 2 (Muro Cortina con Paneles y Ventanales)
  window.wallP2FrontGroup = new THREE.Group();
  window.wallP2FrontGroup.name = "P2FrontFacade";

  // Muro antepecho y dintel en panel arquitectónico gris titanio de alta definición
  const wallFrontMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.3 });
  const p2ParapetTop = new THREE.Mesh(new THREE.BoxGeometry(196, 5, 2.4), wallFrontMat);
  p2ParapetTop.position.set(0, 29.5, 96);
  const p2ParapetBtm = new THREE.Mesh(new THREE.BoxGeometry(196, 4, 2.4), wallFrontMat);
  p2ParapetBtm.position.set(0, 2, 96);

  // Muro cortina de vidrio templado reflectante azul corporativo de alta calidad
  const p2GlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.75,
    depthWrite: false,
    depthTest: true
  });
  const p2Glass = new THREE.Mesh(new THREE.BoxGeometry(195, 22, 0.8), p2GlassMat);
  p2Glass.position.set(0, 15, 96);
  p2Glass.renderOrder = 12;

  // Perfilería y montantes verticales de aluminio negro cada 16 metros (THREE.InstancedMesh)
  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
  const mullionGeo = new THREE.BoxGeometry(0.8, 24, 1.6);
  const mullionCoords = [];
  for (let mx = -96; mx <= 96; mx += 16) mullionCoords.push(mx);
  const mullionInst = new THREE.InstancedMesh(mullionGeo, mullionMat, mullionCoords.length);
  mullionCoords.forEach((mx, idx) => {
    instDummy.position.set(mx, 15, 96);
    instDummy.rotation.set(0, 0, 0);
    instDummy.scale.set(1, 1, 1);
    instDummy.updateMatrix();
    mullionInst.setMatrixAt(idx, instDummy.matrix);
  });
  mullionInst.instanceMatrix.needsUpdate = true;
  window.wallP2FrontGroup.add(mullionInst);

  // Emblema Corporativo Frontal Luminoso OTech AirNet en el pretil
  const facadeLogoTex = createSignBadgeTexture("OTech AirNet • GLOBAL HEADQUARTERS", "SEDE CORPORATIVA, I+D & DATA CENTER CLOUD", "#0284c7");
  const facadeLogo = createSignPanel(32, 4.2, facadeLogoTex, 1);
  facadeLogo.position.set(0, 29.5, 97.4);

  // Barandilla exterior de terraza / balcón corporativo
  const railP2 = new THREE.Mesh(new THREE.BoxGeometry(196, 1.2, 0.4), mullionMat);
  railP2.position.set(0, 5, 97.5);
  window.wallP2FrontGroup.add(p2ParapetTop, p2ParapetBtm, p2Glass, facadeLogo, railP2);

  // Por defecto encendida
  window.plantFloor2Group.add(wallP2Back, wallP2West, wallP2East, window.wallP2FrontGroup);
  state.showP2Facade = true;

  // -------------------------------------------------------------------------
  // 3. DIVISIONES ARQUITECTÓNICAS Y OFICINAS CORPORATIVAS EN PISO 2
  // -------------------------------------------------------------------------
  window.adminDeptsMap = {};

  const adminDeptsList = [
    { id: 'ceo', name: "Dirección General (CEO) & Sala de Juntas", x: -50, z: -55, w: 44, l: 36, color: 0x0ea5e9 },
    { id: 'cpo', name: "1. Producto & Innovación (CPO)", x: 0, z: -55, w: 44, l: 36, color: 0xa855f7 },
    { id: 'coo', name: "4. Operaciones NOC (COO)", x: 50, z: -55, w: 44, l: 36, color: 0xf59e0b },
    { id: 'cto', name: "2. Software, Datos y Nube (CTO)", x: -50, z: -5, w: 44, l: 36, color: 0x3b82f6 },
    { id: 'cfo', name: "5. Comercial & Corporativo (CFO)", x: 0, z: -5, w: 44, l: 36, color: 0x64748b },
    { id: 'hwd', name: "3. Hardware e IoT (Lab R&D)", x: 50, z: -5, w: 44, l: 36, color: 0x10b981 },
    { id: 'datacenter', name: "Infraestructura de Datos & Servidores Cloud", x: 20, z: 46, w: 56, l: 30, color: 0x06b6d4 }
  ];

  // Mamparas de cristal con depthWrite: false para eliminar franjas de z-fighting y sombras oscuras
  const glassPanelMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    roughness: 0.2,
    metalness: 0.05,
    depthWrite: false
  });
  const wallBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const frameDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });

  adminDeptsList.forEach(dept => {
    const dGroup = new THREE.Group();
    dGroup.userData = { id: dept.id, name: dept.name, isAdminDept: true };

    const roomFloor = new THREE.Mesh(
      new THREE.BoxGeometry(dept.w - 1.5, 0.06, dept.l - 1.5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95, metalness: 0.0 })
    );
    roomFloor.position.set(0, 0.13, 0);
    dGroup.add(roomFloor);

    function createOfficeWall(wx, wz, length, isRotated = false, hasDoor = false) {
      const wGroup = new THREE.Group();
      const wallLen = hasDoor ? length - 10 : length;
      const offsetX = hasDoor ? -5 : 0;

      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(wallLen, 3, 0.8), wallBaseMat);
      baseMesh.position.set(offsetX, 1.5, 0);
      wGroup.add(baseMesh);

      const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(wallLen, 6.5, 0.3), glassPanelMat);
      glassMesh.position.set(offsetX, 6.25, 0);
      wGroup.add(glassMesh);

      const topFrame = new THREE.Mesh(new THREE.BoxGeometry(length, 0.6, 0.9), frameDarkMat);
      topFrame.position.set(0, 9.8, 0);
      wGroup.add(topFrame);

      for (let px of [-length / 2, length / 2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 0.8), frameDarkMat);
        post.position.set(px, 5, 0);
        wGroup.add(post);
      }

      if (isRotated) wGroup.rotation.y = Math.PI / 2;
      wGroup.position.set(wx, 0, wz);
      return wGroup;
    }

    if (dept.id !== 'datacenter') {
      // Las oficinas del Norte (z = -55: CEO, CPO, COO) tienen su acceso y puerta hacia el pasillo sur (+dept.l / 2)
      // Las oficinas del Sur (z = -5: CTO, CFO, HWD) tienen su acceso y puerta hacia el pasillo norte (-dept.l / 2)
      const isNorthRow = (dept.z < -20);
      const hallwayZ = isNorthRow ? (dept.l / 2) : (-dept.l / 2);
      const backWallZ = isNorthRow ? (-dept.l / 2) : (dept.l / 2);

      // Muro hacia el pasillo central (CON PUERTA DE ACCESO)
      dGroup.add(createOfficeWall(0, hallwayZ, dept.w, false, true));
      // Muro posterior hacia el exterior (CERRADO)
      dGroup.add(createOfficeWall(0, backWallZ, dept.w, false, false));
      // Muros laterales divisores
      dGroup.add(createOfficeWall(-dept.w / 2, 0, dept.l, true, false));
      dGroup.add(createOfficeWall(dept.w / 2, 0, dept.l, true, false));

      // Placa / Gafete de Señalización Luminosa 3D Doble Cara Suspendida sobre la Entrada
      const hexColorStr = '#' + dept.color.toString(16).padStart(6, '0');
      const deptCode = dept.id.toUpperCase();
      const badgeTex = createSignBadgeTexture(dept.name, "MÓDULO DEPARTAMENTAL • " + deptCode, hexColorStr);
      
      // Orientar de frente al pasillo central (facingZ: 1 si está en fila norte mirando al sur; -1 si está en fila sur mirando al norte)
      const facingDir = isNorthRow ? 1 : -1;
      const officeSign = createSignPanel(22, 3.6, badgeTex, facingDir);
      officeSign.position.set(0, 11.2, hallwayZ);
      dGroup.add(officeSign);

      // Registrar datos detallados para el Raycaster de la Mira en Primera Persona
      dGroup.userData = {
        id: dept.id,
        name: dept.name,
        badge: "OFICINA CORPORATIVA PISO 2",
        desc: "Área administrativa, gestión estratégica y dirección técnica del Ecosistema OTech.",
        extra: "Responsable: " + dept.name.split('(')[0].trim() + " • OTech S.A.S.",
        isInteractive: true
      };
      if (!window.fpsInteractiveTargets) window.fpsInteractiveTargets = [];
      window.fpsInteractiveTargets.push(dGroup);
    } else {
      // SALA TI & DATA CENTER CLOUD (Entrada orientada hacia el vestíbulo norte: Z = -dept.l / 2)
      const dcSignTex = createSignBadgeTexture("SALA TI & DATA CENTER CLOUD", "INFRAESTRUCTURA DE SERVIDORES Y REDES IOT", "#06b6d4");
      const dcSign = createSignPanel(24, 3.8, dcSignTex, -1);
      dcSign.position.set(0, 11.2, -dept.l / 2);
      dGroup.add(dcSign);

      dGroup.userData = {
        id: dept.id,
        name: dept.name,
        badge: "SALA TI & NUBE IOT",
        desc: "Infraestructura de procesamiento perimetral, clúster TimescaleDB y telecomunicaciones LoRaWAN.",
        extra: "Responsable: Equipo de Infraestructura Cloud & NOC",
        isInteractive: true
      };
      if (!window.fpsInteractiveTargets) window.fpsInteractiveTargets = [];
      window.fpsInteractiveTargets.push(dGroup);
    }

    if (dept.id === 'ceo') {
      const bTable = new THREE.Mesh(new THREE.BoxGeometry(22, 1.0, 10), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }));
      bTable.position.set(0, 4.2, 0);
      dGroup.add(bTable);

      for (let px of [-7, 0, 7]) {
        dGroup.add(createHuman3D(px, 0, -6.5, 0, false, true, 'seated_office'));
        dGroup.add(createHuman3D(px, 0, 6.5, 180, false, true, 'seated_office'));
      }

      const screen4k = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 0.4), new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }));
      screen4k.position.set(0, 7.5, dept.l / 2 - 1);
      dGroup.add(screen4k);
    } else if (dept.id === 'coo') {
      const vWall = new THREE.Mesh(new THREE.BoxGeometry(28, 8, 0.5), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
      vWall.position.set(0, 8, dept.l / 2 - 1.5);
      dGroup.add(vWall);

      const nocDesk = new THREE.Mesh(new THREE.BoxGeometry(24, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      nocDesk.position.set(0, 4, 0);
      dGroup.add(nocDesk);
      dGroup.add(createHuman3D(-6, 0, -5.0, 0, false, true, 'seated_office'));
      dGroup.add(createHuman3D(6, 0, -5.0, 0, false, true, 'seated_office'));
    } else if (dept.id === 'cto' || dept.id === 'cpo' || dept.id === 'cfo') {
      for (let dz of [-4, 4]) {
        const desk = new THREE.Mesh(new THREE.BoxGeometry(26, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x334155 }));
        desk.position.set(0, 4, dz);
        dGroup.add(desk);
        for (let dx of [-8, 0, 8]) {
          const mon = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.8, 0.3), new THREE.MeshBasicMaterial({ color: dept.color }));
          mon.position.set(dx, 6.2, dz + (dz > 0 ? 2.2 : -2.2));
          dGroup.add(mon);
        }
      }
      dGroup.add(createHuman3D(-7, 0, -8.2, 0, false, true, 'seated_office'));
      dGroup.add(createHuman3D(5, 0, -8.2, 0, false, true, 'seated_office'));
      dGroup.add(createHuman3D(0, 0, 7.5, 180, false, true, 'seated_office'));
    } else if (dept.id === 'hwd') {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x475569 }));
      bench.position.set(0, 4.2, 0);
      dGroup.add(bench);
      const osc = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 3), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 }));
      osc.position.set(0, 6.5, 0);
      dGroup.add(osc);
      dGroup.add(createHuman3D(0, 0, -6.5, 0, true, false, 'tech_dc'));
    } else if (dept.id === 'datacenter') {
      // ---------------------------------------------------------------------
      // SALA BLINDADA DE SERVIDORES Y CENTRO DE DATOS CLOUD (AMBIENTE CLIMATIZADO)
      // ---------------------------------------------------------------------
      window.datacenterLeds = [];
      const dcWallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });
      const dcGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.8,
        depthWrite: false
      });
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
      const rackGridMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, wireframe: true });
      const hvacUnitMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });

      const roomW = dept.w; // 56
      const roomL = dept.l; // 30
      const wallH = 24.0; // Altura completa hasta el falso techo técnico

      // 1. Cielo Raso Técnico Hermético y Luminarias Empotradas LED (Y = 24)
      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.8, roomL), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }));
      ceiling.position.set(0, wallH, 0);
      dGroup.add(ceiling);

      // Paneles LED 60x60 emitiendo luz blanca/cian pura de centro de datos
      for (let ly of [-14, 0, 14]) {
        for (let lz of [-8, 0, 8]) {
          const ledPanel = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.2, 5.0), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
          ledPanel.position.set(ly, wallH - 0.3, lz);
          dGroup.add(ledPanel);
        }
      }

      // 4 Rociadores superiores para gas limpio de extinción Novec 1230
      for (let nx of [-10, 10]) {
        for (let nz of [-6, 6]) {
          const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 }));
          nozzle.position.set(nx, wallH - 0.8, nz);
          dGroup.add(nozzle);
        }
      }

      // 2. Paredes Acústicas Perimetrales Blindadas de Altura Completa (H = 24)
      // Pared Sur (Z = 15)
      const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 1.2), dcWallMat);
      wallSouth.position.set(0, wallH / 2, roomL / 2);
      // Pared Oeste (X = -28)
      const wallWest = new THREE.Mesh(new THREE.BoxGeometry(1.2, wallH, roomL), dcWallMat);
      wallWest.position.set(-roomW / 2, wallH / 2, 0);
      // Pared Este (X = +28)
      const wallEast = new THREE.Mesh(new THREE.BoxGeometry(1.2, wallH, roomL), dcWallMat);
      wallEast.position.set(roomW / 2, wallH / 2, 0);
      dGroup.add(wallSouth, wallWest, wallEast);

      // Pared Frontal Norte (Z = -15, cara hacia el pasillo de oficinas Piso 2):
      // Sección 1: Tramo cerrado izquierdo (X: -28 a -20, ancho 8)
      const wallFrontSolidL = new THREE.Mesh(new THREE.BoxGeometry(8, wallH, 1.2), dcWallMat);
      wallFrontSolidL.position.set(-24, wallH / 2, -roomL / 2);

      // Sección 2: Vano de Acceso y Esclusa de Seguridad (X: -20 a -12, ancho 8, altura 18 libre para entrar)
      const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(8.2, wallH - 18, 1.2), dcWallMat);
      doorLintel.position.set(-16, 18 + (wallH - 18) / 2, -roomL / 2);

      const doorFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 18, 1.6), frameDarkMat);
      doorFrameL.position.set(-20, 9, -roomL / 2);
      const doorFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 18, 1.6), frameDarkMat);
      doorFrameR.position.set(-12, 9, -roomL / 2);

      // Terminal de control de acceso biométrico / tarjeta RFID
      const badgeReader = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.4), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 }));
      badgeReader.position.set(-11.4, 8.5, -roomL / 2 - 0.7);
      const badgeLed = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      badgeLed.position.set(-11.4, 9.0, -roomL / 2 - 0.9);

      // Letrero iluminado sobre la entrada
      const dcSign = new THREE.Mesh(new THREE.BoxGeometry(18, 2.4, 0.5), new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.7 }));
      dcSign.position.set(-16, 19.5, -roomL / 2 - 0.4);

      // Sección 3: Ventanal Panorámico de Inspección Técnica (X: -12 a 28, ancho 40)
      const glassKickplate = new THREE.Mesh(new THREE.BoxGeometry(40, 3.2, 1.2), dcWallMat);
      glassKickplate.position.set(8, 1.6, -roomL / 2);
      const glassWindow = new THREE.Mesh(new THREE.BoxGeometry(39.6, 14.5, 0.4), dcGlassMat);
      glassWindow.position.set(8, 10.45, -roomL / 2);
      const glassHeader = new THREE.Mesh(new THREE.BoxGeometry(40, wallH - 17.7, 1.2), dcWallMat);
      glassHeader.position.set(8, 17.7 + (wallH - 17.7) / 2, -roomL / 2);

      dGroup.add(
        wallFrontSolidL, doorLintel, doorFrameL, doorFrameR, badgeReader, badgeLed, dcSign,
        glassKickplate, glassWindow, glassHeader
      );

      // Registro de colisiones perimetrales de la sala de servidores (Piso 2: Y de 38 a 62)
      // Pared Sur
      addCollisionBox(dept.x - roomW / 2, dept.x + roomW / 2, dept.z + roomL / 2 - 1, dept.z + roomL / 2 + 1, 38, 62, "DC_WallSouth");
      // Pared Oeste
      addCollisionBox(dept.x - roomW / 2 - 1, dept.x - roomW / 2 + 1, dept.z - roomL / 2, dept.z + roomL / 2, 38, 62, "DC_WallWest");
      // Pared Este
      addCollisionBox(dept.x + roomW / 2 - 1, dept.x + roomW / 2 + 1, dept.z - roomL / 2, dept.z + roomL / 2, 38, 62, "DC_WallEast");
      // Pared Frontal Izquierda
      addCollisionBox(dept.x - roomW / 2, dept.x - 20, dept.z - roomL / 2 - 1, dept.z - roomL / 2 + 1, 38, 62, "DC_WallFrontL");
      // Pared Frontal Derecha (Ventanal)
      addCollisionBox(dept.x - 12, dept.x + roomW / 2, dept.z - roomL / 2 - 1, dept.z - roomL / 2 + 1, 38, 62, "DC_WallFrontR");
      // La puerta entre X = dept.x - 20 y dept.x - 12 queda ABIERTA para caminar!

      // 3. Suelo Técnico Elevado y Rejillas Perforadas para Inyección de Aire Frío
      const raisedFloor = new THREE.Mesh(new THREE.BoxGeometry(roomW - 1.5, 0.4, roomL - 1.5), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }));
      raisedFloor.position.set(0, 0.2, 0);
      const coldTileGrid = new THREE.Mesh(new THREE.BoxGeometry(38, 0.42, 6.0), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 }));
      coldTileGrid.position.set(0, 0.22, 0);
      dGroup.add(raisedFloor, coldTileGrid);

      // 4. Cerramiento de Pasillo Frío (Cold-Aisle Containment)
      const coldCeiling = new THREE.Mesh(
        new THREE.BoxGeometry(37, 0.3, 6.5),
        new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, depthWrite: false })
      );
      coldCeiling.position.set(0, 18.2, 0);
      dGroup.add(coldCeiling);

      // Puertas corredizas acristaladas en los extremos del pasillo de racks
      for (let px of [-18.5, 18.5]) {
        const aisleDoor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 18, 6.5), dcGlassMat);
        aisleDoor.position.set(px, 9.0, 0);
        dGroup.add(aisleDoor);
      }

      // 5. 6x Racks 42U de Servidores en dos filas (Z = -6 y Z = +6)
      for (let rx of [-13, 0, 13]) {
        for (let rz of [-6.2, 6.2]) {
          const rack = new THREE.Mesh(new THREE.BoxGeometry(8.5, 18, 6.0), rackMat);
          rack.position.set(rx, 9, rz);
          dGroup.add(rack);

          // Frontal microperforado
          const frontGrid = new THREE.Mesh(new THREE.BoxGeometry(7.8, 17, 0.2), rackGridMat);
          frontGrid.position.set(rx, 9, rz + (rz > 0 ? -3.05 : 3.05));
          dGroup.add(frontGrid);

          // Bahías de servidores con LEDs luminosos parpadeantes
          for (let ly = 2.5; ly <= 16; ly += 2.2) {
            for (let lx of [-2.6, -0.8, 0.8, 2.6]) {
              const led = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
              led.position.set(rx + lx, ly, rz + (rz > 0 ? -3.15 : 3.15));
              dGroup.add(led);
              window.datacenterLeds.push(led);
            }
          }
          // Colisión de cada rack en Piso 2
          addCollisionBox(dept.x + rx - 4.5, dept.x + rx + 4.5, dept.z + rz - 3.2, dept.z + rz + 3.2, 38, 58, "ServerRack");
        }
      }

      // 6. 4x Unidades de Climatización de Precisión In-Row (CRAC)
      for (let cx of [-22, 22]) {
        for (let cz of [-6.2, 6.2]) {
          const crac = new THREE.Mesh(new THREE.BoxGeometry(4.2, 18, 6.0), hvacUnitMat);
          crac.position.set(cx, 9, cz);
          const cracDisplay = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
          cracDisplay.position.set(cx, 13, cz + (cz > 0 ? -3.06 : 3.06));
          dGroup.add(crac, cracDisplay);
        }
      }

      // 7. Sistemas de Respaldo Energético: 2x Gabinetes UPS Industriales (SAI Online)
      for (let uz of [-5, 5]) {
        const ups = new THREE.Mesh(new THREE.BoxGeometry(1.6, 17, 4.5), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 }));
        ups.position.set(26.8, 8.5, uz);
        const upsScreen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 2.0), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
        upsScreen.position.set(25.9, 13, uz);
        dGroup.add(ups, upsScreen);
      }

      // 8. Cilindros de Extinción de Incendios por Gas Novec 1230 (Rojos con manómetros)
      for (let gz of [-6, 6]) {
        const gasCyl = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 12, 16), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }));
        gasCyl.position.set(-26.5, 6, gz);
        const valve = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 }));
        valve.position.set(-26.5, 12.6, gz);
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 11, 8), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 }));
        pipe.position.set(-26.5, 18.5, gz);
        dGroup.add(gasCyl, valve, pipe);
      }

      // 9. Bandejas Portacables Aéreas Amarillas de Alta Densidad (Fibra Óptica & Cobre Cat6A)
      for (let bx of [-13, 0, 13]) {
        const tray = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 26), new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.7 }));
        tray.position.set(bx, 19.5, 0);
        dGroup.add(tray);
      }
    }

    dGroup.position.set(dept.x, 0, dept.z);
    window.adminDeptsMap[dept.id] = dGroup;
    window.plantFloor2Group.add(dGroup);
  });

  // -------------------------------------------------------------------------
  // 3.1 CUBIERTA Y TECHO INDUSTRIAL ESTRUCTURAL (200m x 200m, Y = 70)
  // Cerchas metálicas de celosía, lucernarios translúcidos, climatización HVAC y planta solar
  // -------------------------------------------------------------------------
  function buildPlantRoof() {
    const roof = new THREE.Group();
    roof.name = "plantRoofStructure";

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const roofDeckMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide });
    const skylightMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.55,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });

    // 1. Cerchas Metálicas de Celosía Espacial (5 Cerchas transversales a dos aguas cada 40m)
    for (let tz of [-80, -40, 0, 40, 80]) {
      const truss = new THREE.Group();
      // Cordón inferior horizontal a Y = 70
      const lowerChord = new THREE.Mesh(new THREE.BoxGeometry(196, 1.2, 1.2), trussMat);
      lowerChord.position.set(0, 70, 0);
      // Cordón superior a dos aguas (inclinado de X=-98 a X=0 a Y=75.5, y de X=0 a X=98)
      const slopeAngle = Math.atan2(5.5, 98);
      const upperChordL = new THREE.Mesh(new THREE.BoxGeometry(100, 1.2, 1.2), trussMat);
      upperChordL.position.set(-49, 73.0, 0);
      upperChordL.rotation.z = slopeAngle;
      const upperChordR = new THREE.Mesh(new THREE.BoxGeometry(100, 1.2, 1.2), trussMat);
      upperChordR.position.set(49, 73.0, 0);
      upperChordR.rotation.z = -slopeAngle;
      truss.add(lowerChord, upperChordL, upperChordR);

      // Montantes y diagonales de celosía
      for (let vx = -80; vx <= 80; vx += 20) {
        const hAtX = 70 + (1 - Math.abs(vx) / 98) * 5.5;
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.8, hAtX - 70, 0.8), trussMat);
        strut.position.set(vx, (70 + hAtX) / 2, 0);
        truss.add(strut);
      }
      truss.position.set(0, 0, tz);
      roof.add(truss);
    }

    // 2. Faldones de Cubierta Metálica Sándwich
    const slopeAngle = Math.atan2(5.5, 98);
    // Cubierta Oeste: X de -98 a -15
    const deckWest = new THREE.Mesh(new THREE.BoxGeometry(84, 1.0, 196), roofDeckMat);
    deckWest.position.set(-56.5, 73.0, 0);
    deckWest.rotation.z = slopeAngle;
    // Cubierta Este: X de 15 a 98
    const deckEast = new THREE.Mesh(new THREE.BoxGeometry(84, 1.0, 196), roofDeckMat);
    deckEast.position.set(56.5, 73.0, 0);
    deckEast.rotation.z = -slopeAngle;
    roof.add(deckWest, deckEast);

    // 3. Lucernarios Cenitales de Policarbonato (Skylights que dejan pasar la luz natural cenital)
    const skylightL = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 192), skylightMat);
    skylightL.position.set(-7.5, 75.5, 0);
    skylightL.rotation.z = slopeAngle;
    const skylightR = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 192), skylightMat);
    skylightR.position.set(7.5, 75.5, 0);
    skylightR.rotation.z = -slopeAngle;
    roof.add(skylightL, skylightR);

    // 4. Peto Perimetral de Coronación y Remates
    const parapetN = new THREE.Mesh(new THREE.BoxGeometry(200, 4.0, 2.5), roofDeckMat);
    parapetN.position.set(0, 74.0, -99);
    const parapetS = new THREE.Mesh(new THREE.BoxGeometry(200, 4.0, 2.5), roofDeckMat);
    parapetS.position.set(0, 74.0, 99);
    const parapetW = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.0, 196), roofDeckMat);
    parapetW.position.set(-99, 74.0, 0);
    const parapetE = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.0, 196), roofDeckMat);
    parapetE.position.set(99, 74.0, 0);
    roof.add(parapetN, parapetS, parapetW, parapetE);

    // 5. Unidades de Climatización Industrial de Cubierta (HVAC Rooftop Chillers)
    for (let hz of [-50, 30]) {
      for (let hx of [-60, 60]) {
        const hvacUnit = new THREE.Group();
        const mainBox = new THREE.Mesh(new THREE.BoxGeometry(14, 5.5, 8), hvacMat);
        mainBox.position.set(0, 2.75, 0);
        for (let fx of [-3.5, 3.5]) {
          const fanCyl = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 }));
          fanCyl.position.set(fx, 5.7, 0);
          hvacUnit.add(fanCyl);
        }
        const duct = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 3), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 }));
        duct.position.set(5.5, 2, -4.5);
        hvacUnit.add(mainBox, duct);
        hvacUnit.position.set(hx, 74.5, hz);
        roof.add(hvacUnit);
      }
    }

    // 6. Extractores Eólicos Giratorios de Cubierta
    for (let vz of [-70, -30, 10, 50]) {
      for (let vx of [-30, 30]) {
        const ventGroup = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 1.5, 12), hvacMat);
        base.position.set(0, 0.75, 0);
        const turbine = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 12), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 }));
        turbine.position.set(0, 2.2, 0);
        turbine.scale.set(1.0, 1.3, 1.0);
        ventGroup.add(base, turbine);
        ventGroup.position.set(vx, 75.5, vz);
        roof.add(ventGroup);
      }
    }

    // 7. PLANTA SOLAR FOTOVOLTAICA (24 PANELES INTEGRADOS DIRECTAMENTE EN CUBIERTA)
    const solarFarmGroup = new THREE.Group();
    solarFarmGroup.userData = { id: 'solar_farm', name: "Planta Solar Fotovoltaica en Cubierta (24 Paneles Monocristalinos)" };
    const pvFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const pvCellMat = new THREE.MeshPhysicalMaterial({
      color: 0x08152e,
      roughness: 0.15,
      metalness: 0.85,
      clearcoat: 0.9,
      reflectivity: 0.8
    });
    const pvGridMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true });

    const tiltRad = THREE.MathUtils.degToRad(15);
    for (let row = 0; row < 4; row++) {
      const rowZ = -60 + row * 26;
      for (let col = 0; col < 6; col++) {
        const colX = -65 + col * 26;
        const pGroup = new THREE.Group();
        const postB = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.5, 8), pvFrameMat);
        postB.position.set(0, 1.75, -5);
        const postF = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 8), pvFrameMat);
        postF.position.set(0, 0.6, 5);
        const pMesh = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 12), pvCellMat);
        pMesh.rotation.x = -tiltRad;
        pMesh.position.set(0, 2.5, 0);
        const grid = new THREE.Mesh(new THREE.PlaneGeometry(19, 11, 4, 6), pvGridMat);
        grid.rotation.x = -Math.PI / 2 - tiltRad;
        grid.position.set(0, 2.85, 0);
        pGroup.add(postB, postF, pMesh, grid);
        pGroup.position.set(colX, 74.0, rowZ);
        solarFarmGroup.add(pGroup);
      }
    }

    const invBox = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 3), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7 }));
    invBox.position.set(85, 75, 0);
    const invDisp = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.2), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    invDisp.position.set(85, 76, 1.6);
    solarFarmGroup.add(invBox, invDisp);

    roof.add(solarFarmGroup);
    // Luminarias industriales de celosía que iluminan el techo y la planta hacia abajo
    for (let tz of [-60, -20, 20, 60]) {
      for (let tx of [-50, 0, 50]) {
        const fixture = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 }));
        fixture.position.set(tx, 69.5, tz);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(2.2, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        lens.rotation.x = Math.PI / 2;
        lens.position.set(tx, 68.8, tz);
        roof.add(fixture, lens);
      }
    }

    // El objeto interno 'roof' SIEMPRE debe ser visible: la visibilidad es gobernada por window.plantRoofGroup
    roof.visible = true;
    window.plantRoofGroup.add(roof);
    window.plantRoofGroup.visible = state.showPlantRoof;
  }

  buildPlantRoof();

  // -------------------------------------------------------------------------
  // 4. PLANTA INDUSTRIAL, BODEGAS LOGÍSTICAS Y CELDA DE ENSAMBLE EN 'U' (PISO 1)
  // -------------------------------------------------------------------------
  // Muro de Cristal Divisorio ESD a Z = 45 (Separa bodegas de la celda de manufactura estéril)
  // El tramo izquierdo cubre desde X = -68 hasta X = -20 para dejar libre la escalera (X: -88 a -72)
  const esdDividerMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, roughness: 0.1 });
  const dividerLeft = new THREE.Mesh(new THREE.BoxGeometry(48, 36, 1.0), esdDividerMat);
  dividerLeft.position.set(-44, 18, 45); // X: -68 a -20 (La escalera queda totalmente despejada)
  const dividerRight = new THREE.Mesh(new THREE.BoxGeometry(75, 36, 1.0), esdDividerMat);
  dividerRight.position.set(60, 18, 45);  // X: 22.5 a 97.5

  // Esclusa de paso con marco de aluminio y señalética verde
  const airlockSign = new THREE.Mesh(new THREE.BoxGeometry(22, 3.5, 1.4), new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0ea5e9, emissiveIntensity: 0.6 }));
  airlockSign.position.set(0, 24, 45);
  window.plantFloor1Group.add(dividerLeft, dividerRight, airlockSign);

  addCollisionBox(-68, -20, 44, 46, 0, 38, "ESDDividerLeft");
  addCollisionBox(20, 100, 44, 46, 0, 38, "ESDDividerRight");
  // La puerta central entre X = -20 y 20 a Z = 45 queda ABIERTA para caminar!

  // Helper: Crear Racks Industriales de Gran Altura con Pallets y Cajas Rotuladas
  function createIndustrialPalletRack(x, z, label, binColor) {
    const rGroup = new THREE.Group();
    const uprightMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.8 }); // Azul industrial
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xea580c, metalness: 0.8 }); // Naranja seguridad
    const palletWoodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 }); // Madera pino estiba
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }); // Cartón kraft corrugado
    const binMat = new THREE.MeshStandardMaterial({ color: binColor, roughness: 0.4 });

    // 4 Postes verticales perforados
    for (let px of [-9, 9]) {
      for (let pz of [-4, 4]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(1.2, 28, 1.2), uprightMat);
        post.position.set(px, 14, pz);
        rGroup.add(post);
      }
    }

    // 3 Niveles de vigas horizontales portantes con pallets y cajas
    for (let ly of [4, 12, 20]) {
      const beamF = new THREE.Mesh(new THREE.BoxGeometry(19.2, 1.2, 0.6), beamMat);
      beamF.position.set(0, ly, 4);
      const beamB = new THREE.Mesh(new THREE.BoxGeometry(19.2, 1.2, 0.6), beamMat);
      beamB.position.set(0, ly, -4);
      rGroup.add(beamF, beamB);

      // 2 Pallets por nivel con carga
      for (let plX of [-5, 5]) {
        const pallet = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.8, 7.5), palletWoodMat);
        pallet.position.set(plX, ly + 0.8, 0);
        const box1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.2, 3.4), boxMat);
        box1.position.set(plX - 1.7, ly + 2.8, -1.7);
        const box2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.2, 3.4), boxMat);
        box2.position.set(plX + 1.7, ly + 2.8, -1.7);
        const box3 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.2, 3.4), binMat);
        box3.position.set(plX, ly + 2.8, 1.7);
        rGroup.add(pallet, box1, box2, box3);
      }
    }

    rGroup.position.set(x, 0, z);
    window.plantFloor1Group.add(rGroup);
    addCollisionBox(x - 11, x + 11, z - 6, z + 6, 0, 30, label);
  }

  // Transpaleta hidráulica manual industrial con timón articulado y pallet cargado (Cero piezas flotando)
  function createPalletJack(x, z, rotDeg = 0) {
    const pjGroup = new THREE.Group();
    const pjYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.35 });
    const pjBlackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.95, roughness: 0.15 });

    // 1. Horquillas estructurales portapallet
    const forkL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 7.0), pjYellowMat);
    forkL.position.set(-1.8, 0.4, 0);
    const forkR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 7.0), pjYellowMat);
    forkR.position.set(1.8, 0.4, 0);
    const forkChassis = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.2, 1.6), pjYellowMat);
    forkChassis.position.set(0, 0.8, 3.2);

    // Rodillos delanteros bajo horquillas
    for (let rx of [-1.8, 1.8]) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), pjBlackMat);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(rx, 0.3, -3.0);
      pjGroup.add(roller);
    }

    // Ruedas directrices dobles bajo la bomba
    for (let wx of [-1.1, 1.1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.55, 16), pjBlackMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.7, 3.8);
      pjGroup.add(wheel);
    }

    // 2. Bloque hidráulico de bombeo y pistón de elevación
    const pumpBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 1.8), pjYellowMat);
    pumpBase.position.set(0, 1.6, 3.8);
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 12), chromeMat);
    piston.position.set(0, 3.0, 3.8);
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 1.0), pjBlackMat);
    pedal.position.set(0, 0.9, 4.6);

    // 3. Timón de tracción y tiro articulado (Sólidamente anclado a la bomba, sin piezas flotando)
    const tiller = new THREE.Group();
    tiller.position.set(0, 2.2, 3.8);
    tiller.rotation.x = -Math.PI / 5.5; // Inclinación ergonómica hacia arriba

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.2, 12), pjBlackMat);
    shaft.position.set(0, 2.6, 0);

    // Asa ergonómica en bucle D con gatillo de descenso
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.22), pjBlackMat);
    topBar.position.set(0, 5.2, 0);
    const loopL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), pjBlackMat);
    loopL.position.set(-1.1, 4.75, 0);
    const loopR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), pjBlackMat);
    loopR.position.set(1.1, 4.75, 0);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.2), pjYellowMat);
    lever.position.set(0.2, 4.9, 0);

    tiller.add(shaft, topBar, loopL, loopR, lever);
    pjGroup.add(forkL, forkR, forkChassis, pumpBase, piston, pedal, tiller);

    // 4. Pallet de madera y cajas de componentes
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.8, 6.5), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
    pallet.position.set(0, 1.1, -0.2);
    const loadBox = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.6, 5.0), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }));
    loadBox.position.set(0, 3.3, -0.2);
    pjGroup.add(pallet, loadBox);

    pjGroup.rotation.y = THREE.MathUtils.degToRad(rotDeg);
    pjGroup.position.set(x, 0, z);
    addCollisionBox(x - 3.5, x + 3.5, z - 3.5, z + 3.5, 0, 12, "PalletJack");
    return pjGroup;
  }

  // Workstation IQC (Inspección de Entrada de Materias Primas)
  function createIQCStation(x, z) {
    const iqcGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.2 });
    const topMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

    // Mesa técnica industrial con marco de aluminio y bandeja inferior
    const table = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 5.0), topMat);
    table.position.set(0, 4.4, 0);
    const shelfLower = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.4, 4.2), frameMat);
    shelfLower.position.set(0, 1.2, 0);
    iqcGroup.add(table, shelfLower);

    for (let px of [-5.2, 5.2]) {
      for (let pz of [-2.0, 2.0]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.4, 0.7), frameMat);
        leg.position.set(px, 2.2, pz);
        iqcGroup.add(leg);
      }
    }

    // Soporte VESA articulado con doble monitor de control de calidad
    const armPole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.8, 8), frameMat);
    armPole.position.set(0, 6.4, 1.8);
    const monL = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.4, 0.25), screenMat);
    monL.position.set(-2.2, 6.6, 1.6);
    monL.rotation.y = 0.15;
    const monR = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.4, 0.25), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    monR.position.set(2.2, 6.6, 1.6);
    monR.rotation.y = -0.15;

    // Teclado, ratón y escáner de códigos de barras / QR
    const kbd = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    kbd.position.set(0, 4.9, 0.5);
    const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.7), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    scanner.position.set(3.2, 5.2, 0.5);

    // Gaveta de componentes en inspección
    const sampleBin = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 2.2), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    sampleBin.position.set(-3.2, 5.0, 0.5);

    iqcGroup.add(armPole, monL, monR, kbd, scanner, sampleBin);

    // Inspector de calidad sentado ergonómicamente frente a la pantalla (a Z = -4.5 relativo, mirando hacia +Z a 0°)
    const inspector = createHuman3D(0, 0, -4.5, 0, true, true, 'seated_iqc');
    iqcGroup.add(inspector);

    iqcGroup.position.set(x, 0, z);
    addCollisionBox(x - 6.5, x + 6.5, z - 6.0, z + 3.5, 0, 16, "IQCStation");
    return iqcGroup;
  }

  // Envolvedora de Pallets con Film Estirable (Turntable)
  function createStretchWrapper(x, z) {
    const swGroup = new THREE.Group();
    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.0, 0.4, 24), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 }));
    turntable.position.set(0, 0.2, 0);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 16, 1.2), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7 }));
    mast.position.set(-4.5, 8.0, 0);
    const filmRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 4.0, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    filmRoll.position.set(-3.5, 8.0, 0);
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.8, 6.5), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
    pallet.position.set(0, 0.8, 0);
    const wrappedBox = new THREE.Mesh(new THREE.BoxGeometry(5.5, 7.5, 5.5), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, transparent: true, opacity: 0.9 }));
    wrappedBox.position.set(0, 4.8, 0);

    swGroup.add(turntable, mast, filmRoll, pallet, wrappedBox);
    swGroup.position.set(x, 0, z);
    addCollisionBox(x - 5.5, x + 5.5, z - 5.5, z + 5.5, 0, 18, "StretchWrapper");
    return swGroup;
  }

  // Bodega de Recepción BOM (Suroeste: X entre -55 y -15, Z entre 50 y 85)
  // Ubicados a X = -40 para dejar totalmente libre y despejado el corredor de la escalera (X: -88 a -68)
  createIndustrialPalletRack(-40, 76, "Racks BOM IQC A", 0xea580c);
  createIndustrialPalletRack(-40, 54, "Racks BOM IQC B", 0x0369a1);
  const palletJack = createPalletJack(-18, 54);
  window.plantFloor1Group.add(palletJack);
  const iqcDesk = createIQCStation(-18, 72);
  window.plantFloor1Group.add(iqcDesk);

  // Bodega de Despacho FGS (Sureste: X entre 35 y 85, Z entre 55 y 85)
  createIndustrialPalletRack(75, 76, "Racks Despacho FGS A", 0x16a34a);
  createIndustrialPalletRack(75, 54, "Racks Despacho FGS B", 0x0284c7);
  const stretchWrapper = createStretchWrapper(45, 54);
  window.plantFloor1Group.add(stretchWrapper);
  const floorScale = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 7), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }));
  floorScale.position.set(36, 0.15, 68);
  window.plantFloor1Group.add(floorScale);

  // Iluminación LED suspendida de alta potencia (High-Bay) en Piso 1 (ilumina todo el interior)
  for (let lx of [-60, 0, 60]) {
    for (let lz of [-50, 0, 65]) {
      const bayLight = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.5, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 }));
      bayLight.position.set(lx, 34, lz);
      const emitter = new THREE.Mesh(new THREE.CircleGeometry(3.2, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      emitter.rotation.x = Math.PI / 2;
      emitter.position.set(lx, 33.3, lz);
      window.plantFloor1Group.add(bayLight, emitter);
    }
  }

  // Estaciones de Trabajo en Celda en 'U' (7 Estaciones)
  const stationsConfig = [
    { id: 'st1', name: "1. Pre-ensamble Chasis", x: -45, z: -40, color: 0x0284c7, hasWorker: true, role: 'assembly' },
    { id: 'st2', name: "2. Flasheo ICT Pogo-Pin", x: -15, z: -40, color: 0x0ea5e9, hasWorker: true, role: 'flashing' },
    { id: 'st3', name: "3. Integración IP65", x: 15, z: -40, color: 0x38bdf8, hasWorker: true, role: 'sealing' },
    { id: 'st4', name: "4. Banco Hermeticidad IP65", x: 45, z: -40, color: 0x10b981, hasWorker: false },
    { id: 'st5', name: "5. Calibración Metrológica", x: 45, z: -7, color: 0xa855f7, hasWorker: false },
    { id: 'st6', name: "6. Rack Burn-In 48h", x: 15, z: 26, color: 0xef4444, hasWorker: false },
    { id: 'st7', name: "7. OQC & Empaque", x: -25, z: 26, color: 0x10b981, hasWorker: true, role: 'oqc' }
  ];

  stationsConfig.forEach(cfg => {
    const stGroup = new THREE.Group();
    stGroup.userData = { id: cfg.id, name: cfg.name, isPlantStation: true };

    const strutMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.25 });
    const topMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35 });
    const esdMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });

    if (cfg.id === 'st6') {
      // Rack de Burn-In industrial abierto técnico con torre Andon montada
      const rackFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
      for (let colX of [-10, 10]) {
        for (let colZ of [-2.5, 2.5]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 20, 0.8), rackFrameMat);
          post.position.set(colX, 10, colZ);
          stGroup.add(post);
        }
      }
      stGroup.userData.burnInLeds = [];
      for (let sy of [4, 9, 14, 19]) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.5, 5.5), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 }));
        shelf.position.set(0, sy, 0);
        stGroup.add(shelf);
        for (let lx = -8; lx <= 8; lx += 4) {
          const led = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
          led.position.set(lx, sy + 0.8, -2.2);
          stGroup.add(led);
          stGroup.userData.burnInLeds.push(led);
        }
      }
      const frontPanel = new THREE.Mesh(
        new THREE.BoxGeometry(20, 19, 0.2),
        new THREE.MeshPhysicalMaterial({ color: 0xef4444, transparent: true, opacity: 0.2, depthWrite: false })
      );
      frontPanel.position.set(0, 10, -2.8);
      stGroup.add(frontPanel);

      const headerDisplay = new THREE.Mesh(new THREE.BoxGeometry(18, 2.2, 0.8), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
      headerDisplay.position.set(0, 20.5, 0);
      stGroup.add(headerDisplay);

      // Torre Andon montada en poste del rack
      const andonMast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.5, 8), strutMat);
      andonMast.position.set(10, 22.0, -2.5);
      const andonGreen = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 12), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      andonGreen.position.set(10, 24.1, -2.5);
      const andonCap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
      andonCap.position.set(10, 24.6, -2.5);
      stGroup.add(andonMast, andonGreen, andonCap);
      stGroup.userData.andonLight = andonGreen;

    } else if (cfg.id === 'st5') {
      // Estación 5: Calibración Metrológica con Cámara de Gases Patrón
      for (let lx of [-8.5, 8.5]) {
        for (let lz of [-5.5, 5.5]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 8.0, 1.0), strutMat);
          leg.position.set(lx, 4.0, lz);
          stGroup.add(leg);
        }
      }
      const benchTop = new THREE.Mesh(new THREE.BoxGeometry(19, 0.8, 13), strutMat);
      benchTop.position.set(0, 8.0, 0);
      stGroup.add(benchTop);

      const chamber = new THREE.Mesh(new THREE.BoxGeometry(17, 13, 11), metalMat);
      chamber.position.set(0, 14.8, 0);
      const glassWindow = new THREE.Mesh(new THREE.BoxGeometry(10, 7, 0.2), new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 }));
      glassWindow.position.set(0, 15.0, 5.6);
      stGroup.add(chamber, glassWindow);

      // Botellas de Gases Patrón con reguladores de presión y tubería de acero inoxidable
      for (let cx of [-4.5, 4.5]) {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 13, 16), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }));
        cyl.position.set(cx, 6.5, -8.0);
        const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8), metalMat);
        valve.position.set(cx, 13.5, -8.0);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.0, 8), metalMat);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(cx, 13.8, -6.0);
        stGroup.add(cyl, valve, tube);
      }

      // Torre Andon montada
      const andonMast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.5, 8), strutMat);
      andonMast.position.set(8.5, 23.0, -5.5);
      const andonGreen = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 12), new THREE.MeshBasicMaterial({ color: 0xa855f7 }));
      andonGreen.position.set(8.5, 25.1, -5.5);
      stGroup.add(andonMast, andonGreen);
      stGroup.userData.andonLight = andonGreen;

    } else if (cfg.id === 'st4') {
      // Estación 4: Banco de Ensayo de Hermeticidad por Caída de Presión IP65
      for (let lx of [-8.5, 8.5]) {
        for (let lz of [-4.5, 4.5]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 8.0, 1.0), strutMat);
          leg.position.set(lx, 4.0, lz);
          stGroup.add(leg);
        }
      }
      const baseBench = new THREE.Mesh(new THREE.BoxGeometry(19, 0.8, 11), topMat);
      baseBench.position.set(0, 8.4, 0);
      stGroup.add(baseBench);

      const bellJar = new THREE.Mesh(
        new THREE.CylinderGeometry(3.5, 3.5, 7.5, 24),
        new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, depthWrite: false })
      );
      bellJar.position.set(0, 12.5, 0);
      const gauge = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.4, 16), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      gauge.position.set(0, 14, 3.8);
      gauge.rotation.x = Math.PI / 2;
      const vacHose = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5.0, 8), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
      vacHose.position.set(3.5, 11.0, 0);
      stGroup.add(bellJar, gauge, vacHose);

      // Torre Andon montada
      const andonMast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.0, 8), strutMat);
      andonMast.position.set(8.5, 12.0, -4.5);
      const andonGreen = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 12), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      andonGreen.position.set(8.5, 15.0, -4.5);
      stGroup.add(andonMast, andonGreen);
      stGroup.userData.andonLight = andonGreen;

    } else {
      // Estaciones de Montaje Manual y Verificación (st1: Ensamble, st2: Flasheo, st3: Sellado IP65, st7: QA)
      // 1. Patas estructurales de aluminio con niveladores en suelo (Y=0 a Y=8.0)
      for (let lx of [-9.2, 9.2]) {
        for (let lz of [-4.6, 4.6]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 8.0, 1.0), strutMat);
          leg.position.set(lx, 4.0, lz);
          const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.3, 12), strutMat);
          foot.position.set(lx, 0.15, lz);
          stGroup.add(leg, foot);
        }
      }

      // Travesaños inferiores y bastidor de soporte
      const lowerCrossL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 9.2), strutMat);
      lowerCrossL.position.set(-9.2, 1.8, 0);
      const lowerCrossR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 9.2), strutMat);
      lowerCrossR.position.set(9.2, 1.8, 0);
      const footRestBar = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.8, 0.8), strutMat);
      footRestBar.position.set(0, 1.8, -2.5);
      stGroup.add(lowerCrossL, lowerCrossR, footRestBar);

      // 2. Encimera técnica y Tapete Disipativo ESD con terminal a tierra
      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 11), topMat);
      tableTop.position.set(0, 8.4, 0);
      const esdMatMesh = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.15, 9.2), esdMat);
      esdMatMesh.position.set(0, 8.85, 0);
      const esdSnap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9 }));
      esdSnap.position.set(8.5, 8.95, -4.0);
      stGroup.add(tableTop, esdMatMesh, esdSnap);

      // 3. Estructura de pórtico trasero (Uprights) y puente superior
      for (let ux of [-9.2, 9.2]) {
        const upright = new THREE.Mesh(new THREE.BoxGeometry(1.0, 14.0, 1.0), strutMat);
        upright.position.set(ux, 15.0, -4.6);
        stGroup.add(upright);
      }
      const topGantry = new THREE.Mesh(new THREE.BoxGeometry(19.4, 1.0, 1.0), strutMat);
      topGantry.position.set(0, 22.0, -4.6);

      // Luminaria LED industrial suspendida del puente superior
      const lampHousing = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.5, 1.6), strutMat);
      lampHousing.position.set(0, 21.2, -4.2);
      const lampDiffuser = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.1, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      lampDiffuser.position.set(0, 20.9, -4.2);

      // Riel portaherramientas y equilibrador retráctil (Tool Balancer)
      const toolRail = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 12.0, 8), strutMat);
      toolRail.rotation.z = Math.PI / 2;
      toolRail.position.set(0, 20.0, -2.5);
      const balancer = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7 }));
      balancer.position.set(0, 19.2, -2.5);
      const coiledCable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.0, 8), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
      coiledCable.position.set(0, 16.8, -2.5);

      stGroup.add(topGantry, lampHousing, lampDiffuser, toolRail, balancer, coiledCable);

      // 4. Brazo VESA articulado anclado firmemente y Pantalla HMI táctil
      const vesaClamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), strutMat);
      vesaClamp.position.set(-3.5, 12.0, -4.6);
      const vesaArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.5, 8), strutMat);
      vesaArm1.position.set(-2.4, 12.5, -3.8);
      vesaArm1.rotation.z = Math.PI / 4;
      const vesaArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.0, 8), strutMat);
      vesaArm2.position.set(-1.0, 13.5, -3.2);
      vesaArm2.rotation.x = Math.PI / 4;
      const screenBezel = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.8, 0.35), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }));
      screenBezel.position.set(0, 14.0, -2.8);
      const screenFace = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.2), new THREE.MeshBasicMaterial({ color: cfg.color }));
      screenFace.position.set(0, 14.0, -2.6);
      stGroup.add(vesaClamp, vesaArm1, vesaArm2, screenBezel, screenFace);

      // 5. Torre de señalización industrial Andon de 3 niveles anclada a columna derecha
      const andonMast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.0, 12), strutMat);
      andonMast.position.set(9.2, 24.0, -4.6);
      const andonBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
      andonBase.position.set(9.2, 26.0, -4.6);
      const andonGreen = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 16), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      andonGreen.position.set(9.2, 26.55, -4.6);
      const andonAmber = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 16), new THREE.MeshBasicMaterial({ color: 0x64748b }));
      andonAmber.position.set(9.2, 27.35, -4.6);
      const andonRed = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 16), new THREE.MeshBasicMaterial({ color: 0x64748b }));
      andonRed.position.set(9.2, 28.15, -4.6);
      const andonCap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
      andonCap.position.set(9.2, 28.65, -4.6);

      stGroup.add(andonMast, andonBase, andonGreen, andonAmber, andonRed, andonCap);
      stGroup.userData.andonLight = andonGreen;

      // Elementos específicos según estación
      if (cfg.id === 'st2') {
        // Fijación ICT de agujas Pogo-Pin
        const pogoBase = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.2, 4.0), strutMat);
        pogoBase.position.set(0, 9.5, 0);
        const pogoArm = new THREE.Mesh(new THREE.BoxGeometry(4.0, 5.0, 3.5), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.8 }));
        pogoArm.position.set(0, 12.0, 0);
        stGroup.add(pogoBase, pogoArm);
        stGroup.userData.pogoArm = pogoArm;
      } else if (cfg.id === 'st1') {
        // Gavetas Kanban de tornillos y soporte de preensamble
        const kanbanTray = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.2, 2.2), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
        kanbanTray.position.set(-4.0, 9.5, -3.2);
        const fixtureJig = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 3.2), strutMat);
        fixtureJig.position.set(0, 9.3, 0.5);
        stGroup.add(kanbanTray, fixtureJig);
      } else if (cfg.id === 'st3') {
        // Soporte de sellado IP65 y dispensador de sellador
        const sealJig = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.8, 3.6), strutMat);
        sealJig.position.set(0, 9.3, 0.5);
        stGroup.add(sealJig);
      } else if (cfg.id === 'st7') {
        // Cuna de empaque acolchada y caja de despacho con etiqueta QR
        const packFoam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 4.2), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
        packFoam.position.set(0, 9.2, 0.5);
        const cartonBox = new THREE.Mesh(new THREE.BoxGeometry(5.8, 4.2, 4.8), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }));
        cartonBox.position.set(-5.0, 11.0, 0);
        stGroup.add(packFoam, cartonBox);
      }

      if (cfg.hasWorker) {
        stGroup.add(createHuman3D(0, 0, -8.2, 0, true, false, cfg.role || 'assembly'));
      }
    }

    // Letrero Aéreo Industrial Suspendido sobre la Estación de Trabajo (Doble Cara Luminosa)
    const stData = plantStationData[cfg.id] || { desc: "Línea de Ensamble y Verificación OTech", specs: { "Operario Responsable": "Técnico de Planta" } };
    const stBadgeTex = createSignBadgeTexture(cfg.name, "CELDA LEAN • " + cfg.id.toUpperCase(), "#0284c7", true);
    const stSign = createSignPanel(22, 3.5, stBadgeTex, 1);
    stSign.position.set(0, 24, 0);
    stGroup.add(stSign);

    // Metadatos para el Raycaster de la Mira en Modo Primera Persona (FPS)
    stGroup.userData = {
      id: cfg.id,
      name: cfg.name,
      badge: "ESTACIÓN DE MANUFACTURA PISO 1",
      desc: stData.desc || "Operaciones de ensamble, test metrológico y empaque.",
      extra: (stData.specs && stData.specs["Operario Responsable"] ? "Responsable: " + stData.specs["Operario Responsable"] : "Línea OTech AirNet"),
      isInteractive: true
    };
    if (!window.fpsInteractiveTargets) window.fpsInteractiveTargets = [];
    window.fpsInteractiveTargets.push(stGroup);

    stGroup.position.set(cfg.x, 0, cfg.z);
    plantStationsMap[cfg.id] = stGroup;
    window.plantFloor1Group.add(stGroup);
    addCollisionBox(cfg.x - 10.5, cfg.x + 10.5, cfg.z - 9.5, cfg.z + 6.0, 0, 16, cfg.name);
  });

  // -------------------------------------------------------------------------
  // 5. CINTA DE PRODUCCIÓN EN CIRCUITO CERRADO Y ENSAMBLE PROGRESIVO PIEZA POR PIEZA
  // -------------------------------------------------------------------------
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

  // Pista continua en 4 segmentos:
  const trackN = new THREE.Mesh(new THREE.BoxGeometry(94, 1.4, 4.4), trackMat);
  trackN.position.set(0, 5.5, -25);
  const trackE = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 39.4), trackMat);
  trackE.position.set(45, 5.5, -7.5);
  const trackS = new THREE.Mesh(new THREE.BoxGeometry(94, 1.4, 4.4), trackMat);
  trackS.position.set(0, 5.5, 10);
  const trackW = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 39.4), trackMat);
  trackW.position.set(-45, 5.5, -7.5);

  window.plantFloor1Group.add(trackN, trackE, trackS, trackW);

  // Colisiones físicas de la cinta transportadora (altura 16 para bloquear al jugador)
  addCollisionBox(-48, 48, -27.5, -22.5, 0, 16, "ConveyorNorth");
  addCollisionBox(42.5, 47.5, -25, 12, 0, 16, "ConveyorEast");
  addCollisionBox(-48, 48, 7.5, 12.5, 0, 16, "ConveyorSouth");
  addCollisionBox(-47.5, -42.5, -25, 12, 0, 16, "ConveyorWest");

  // Generador de modelos tridimensionales para las 7 etapas de ensamble progresivo
  window.createProgressiveAssemblyModel = function(stage) {
    const group = new THREE.Group();

    // Palet conductivo ESD
    const pallet = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.4, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 })
    );
    pallet.position.set(0, 0.2, 0);
    group.add(pallet);

    const rfid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.5), new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }));
    rfid.position.set(1.9, 0.45, 1.5);
    group.add(rfid);

    if (stage === 0) {
      // Etapa 0 (Post-Estación 1): Bandeja interna deslizable con sensores
      const tray = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 2.6), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 }));
      tray.position.set(0, 0.55, 0);
      const pcb = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 2.2), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 }));
      pcb.position.set(0, 0.75, 0);
      const sps30 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.1), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }));
      sps30.position.set(-0.6, 1.25, 0);
      const noz1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x475569 }));
      noz1.position.set(-0.9, 1.8, -0.3);
      const noz2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x475569 }));
      noz2.position.set(-0.9, 1.8, 0.3);
      const esp32 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 1.0), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 }));
      esp32.position.set(0.7, 0.95, -0.4);
      const bme680 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
      bme680.position.set(0.7, 0.9, 0.5);
      group.add(tray, pcb, sps30, noz1, noz2, esp32, bme680);

    } else if (stage === 1) {
      // Etapa 1 (Post-Estación 2): Chasis verificado con Firmware TLS inyectado
      const tray = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 2.6), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 }));
      tray.position.set(0, 0.55, 0);
      const pcb = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 2.2), new THREE.MeshStandardMaterial({ color: 0x15803d }));
      pcb.position.set(0, 0.75, 0);
      const sps30 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.1), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }));
      sps30.position.set(-0.6, 1.25, 0);
      const esp32 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 1.0), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 }));
      esp32.position.set(0.7, 0.95, -0.4);
      const testLed = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      testLed.position.set(0.2, 1.0, 0.6);
      group.add(tray, pcb, sps30, esp32, testLed);

    } else if (stage === 2) {
      // Etapa 2 (Post-Estación 3): Gabinete cilíndrico ASA blanco IP65 + Batería LiFePO4
      const enclosure = new THREE.Mesh(
        new THREE.CylinderGeometry(2.0, 2.0, 3.8, 24),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
      );
      enclosure.position.set(0, 2.3, 0);
      const pg9 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 12), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 }));
      pg9.position.set(0, 0.4, 0);
      const battery = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
      battery.position.set(0, 2.8, 0);
      const ledRing = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.35, 24), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 }));
      ledRing.position.set(0, 0.7, 0);
      group.add(enclosure, pg9, battery, ledRing);

    } else if (stage === 3) {
      // Etapa 3 (Post-Estación 4): Gabinete hermético sellado con O-Ring perimetral
      const enclosure = new THREE.Mesh(
        new THREE.CylinderGeometry(2.0, 2.0, 3.8, 24),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
      );
      enclosure.position.set(0, 2.3, 0);
      const oring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.15, 8, 24), new THREE.MeshStandardMaterial({ color: 0x111827 }));
      oring.rotation.x = Math.PI / 2;
      oring.position.set(0, 4.2, 0);
      const pg9 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 12), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 }));
      pg9.position.set(0, 0.4, 0);
      const ledRing = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.35, 24), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.5 }));
      ledRing.position.set(0, 0.7, 0);
      const seal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      seal.position.set(2.02, 2.5, 0);
      group.add(enclosure, oring, pg9, ledRing, seal);

    } else if (stage === 4) {
      // Etapa 4 (Post-Estación 5): Cámara Stevenson Louvered inferior integrada
      const enclosure = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 3.4, 24), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }));
      enclosure.position.set(0, 3.7, 0);
      const oring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.15, 8, 24), new THREE.MeshStandardMaterial({ color: 0x111827 }));
      oring.rotation.x = Math.PI / 2;
      oring.position.set(0, 5.4, 0);
      for (let g = 0; g < 4; g++) {
        const gill = new THREE.Mesh(new THREE.ConeGeometry(2.4, 0.4, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, side: THREE.DoubleSide }));
        gill.position.set(0, 1.0 + g * 0.55, 0);
        group.add(gill);
      }
      const meshInox = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }));
      meshInox.position.set(0, 0.7, 0);
      const ledRing = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.35, 24), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0ea5e9, emissiveIntensity: 0.4 }));
      ledRing.position.set(0, 2.0, 0);
      group.add(enclosure, oring, meshInox, ledRing);

    } else if (stage === 5) {
      // Etapa 5 (Post-Estación 6): Cúpula solar 12° ETFE montada y prueba Burn-In activa
      const enclosure = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 3.4, 24), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }));
      enclosure.position.set(0, 3.7, 0);
      for (let g = 0; g < 4; g++) {
        const gill = new THREE.Mesh(new THREE.ConeGeometry(2.4, 0.4, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide }));
        gill.position.set(0, 1.0 + g * 0.55, 0);
        group.add(gill);
      }
      const hood = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.2, 24), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }));
      hood.position.set(0, 5.8, 0);
      hood.rotation.x = 0.2;
      const solarCell = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 2.2), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.8, roughness: 0.2 }));
      solarCell.position.set(0, 5.8, 0);
      solarCell.rotation.x = 0.2;
      const ledRing = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.35, 24), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.9 }));
      ledRing.position.set(0, 2.0, 0);
      group.add(enclosure, hood, solarCell, ledRing);

    } else {
      // Etapa 6 (Post-Estación 7): Soporte Mástil Inox 316 y Empaque Final en Caja OTech
      const box = new THREE.Mesh(new THREE.BoxGeometry(6.8, 4.2, 5.8), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));
      box.position.set(0, 2.1, 0);
      const foam = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.8, 5.4), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }));
      foam.position.set(0, 2.2, 0);
      const unitPreview = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 3.8, 16), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
      unitPreview.position.set(0, 2.6, 0);
      const hoodPreview = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.0, 16), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      hoodPreview.position.set(0, 4.8, 0);
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95 }));
      bracket.position.set(0, 2.6, 2.4);
      const qrLabel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      qrLabel.position.set(0, 2.6, 2.92);
      group.add(box, foam, unitPreview, hoodPreview, bracket, qrLabel);
    }

    return group;
  };

  // Creación de las 7 unidades móviles con su respectiva etapa de manufactura
  plantMovingUnits = [];
  for (let i = 0; i < 7; i++) {
    const uGroup = new THREE.Group();
    const initialStage = i;
    uGroup.userData = {
      progress: i / 7.0,
      speed: 0.0006,
      currentStage: initialStage
    };
    const stageModel = window.createProgressiveAssemblyModel(initialStage);
    stageModel.name = 'stageModel';
    uGroup.add(stageModel);
    plantMovingUnits.push(uGroup);
    window.plantFloor1Group.add(uGroup);
  }

  scene.add(plantRootGroup);
}

// Conmutar entre Modo Producto 3D y Modo Planta de Producción
function setAppMode(mode) {
  state.currentMode = mode;

  const isPlant = mode === 'plant';

  // Botones de Header
  document.getElementById('btn-view-product').classList.toggle('active', !isPlant);
  document.getElementById('btn-view-plant').classList.toggle('active', isPlant);

  // Docks flotantes del viewport
  document.getElementById('dock-product-controls').classList.toggle('hidden', isPlant);
  document.getElementById('dock-plant-controls').classList.toggle('hidden', !isPlant);

  // Pestañas del sidebar
  document.getElementById('tabs-product').classList.toggle('hidden', isPlant);
  document.getElementById('tabs-plant').classList.toggle('hidden', !isPlant);

  // Activar la primera pestaña correspondiente
  if (isPlant) {
    document.querySelectorAll('#tabs-plant .tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-plant-stations').classList.add('active');
    document.getElementById('header-status-text').innerText = "Complejo Industrial y Corporativo OTech";

    // Mostrar planta y campus exterior y ocultar estación
    modelRoot.visible = false;
    mastGroup.visible = false;
    if (airflowParticles) airflowParticles.visible = false;
    if (rainParticles) rainParticles.visible = false;
    if (dimensionLinesGroup) dimensionLinesGroup.visible = false;
    plantRootGroup.visible = true;
    if (window.plantOutdoorGroup) window.plantOutdoorGroup.visible = true;
    if (window.plantRoofGroup) window.plantRoofGroup.visible = state.showPlantRoof;

    // Configuración de Cielo Diurno Natural e Iluminación de Campus Industrial (Atmósfera Arquitectónica PBR)
    if (plantSkyDome) plantSkyDome.visible = true;
    if (scene) {
      scene.background.set(0xcfd8dc); // Haze arquitectónico en el horizonte
      if (scene.fog) {
        scene.fog.color.set(0xcfd8dc);
        scene.fog.density = 0.0012; // Haze atmosférico sutil a lo largo del campus de 400m
      }
    }
    if (dirLight) {
      dirLight.color.set(0xfffaed);
      dirLight.intensity = 1.35;
      dirLight.castShadow = true; // Sombras suaves optimizadas sin raster lines
    }
    if (hemiLight) {
      hemiLight.color.set(0xe0f2fe);
      hemiLight.groundColor.set(0x1e293b);
      hemiLight.intensity = 0.65;
    }
    if (ambientLight) {
      ambientLight.color.set(0xe0f2fe);
      ambientLight.intensity = 0.50;
    }

    // Configurar cámara para vista de Planta (Nave completa)
    controls.maxDistance = 700;
    controls.minDistance = 20;
    controls.target.set(0, 10, 20);
    camera.position.set(0, 130, 170);
  } else {
    document.querySelectorAll('#tabs-product .tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-specs').classList.add('active');
    document.getElementById('header-status-text').innerText = "Modelo 3D Interactivo";

    // Mostrar estación y ocultar planta
    plantRootGroup.visible = false;
    if (window.plantRoofGroup) window.plantRoofGroup.visible = false;
    modelRoot.visible = true;
    mastGroup.visible = state.showMast;
    if (state.isXRay && airflowParticles) airflowParticles.visible = true;

    // Restaurar estudio de producto fotográfico oscuro
    if (plantSkyDome) plantSkyDome.visible = false;
    if (scene) {
      scene.background.set(0x0a0e17);
      if (scene.fog) {
        scene.fog.color.set(0x0a0e17);
        scene.fog.density = 0.003;
      }
    }
    if (dirLight) {
      dirLight.color.set(0xfffaed);
      dirLight.intensity = 1.45;
      dirLight.castShadow = true;
    }
    if (hemiLight) {
      hemiLight.color.set(0xffffff);
      hemiLight.groundColor.set(0x1e293b);
      hemiLight.intensity = 0.55;
    }
    if (ambientLight) {
      ambientLight.color.set(0xddeeff);
      ambientLight.intensity = 0.65;
    }

    // Configurar cámara para vista de Producto
    controls.maxDistance = 500;
    controls.minDistance = 80;
    controls.target.set(0, 40, 0);
    camera.position.set(180, 140, 260);
  }

  hideHotspot();
  controls.update();
}

// Control de Niveles y Pisos en Planta 3D (Piso 1, Piso 2, Ambos, Despiece)
function setPlantFloorView(mode) {
  if (!window.plantFloor1Group || !window.plantFloor2Group) return;

  if (window.plantOutdoorGroup) {
    window.plantOutdoorGroup.visible = (mode !== 'p2');
  }

  if (window.plantRoofGroup) {
    if (mode === 'all') {
      window.plantRoofGroup.visible = state.showPlantRoof;
      window.plantRoofGroup.position.set(0, 0, 0);
    } else if (mode === 'p1') {
      window.plantRoofGroup.visible = false;
    } else if (mode === 'p2') {
      window.plantRoofGroup.visible = state.showPlantRoof;
      window.plantRoofGroup.position.set(0, -38, 0); // Baja junto con el piso 2
    } else if (mode === 'split') {
      window.plantRoofGroup.visible = state.showPlantRoof;
      window.plantRoofGroup.position.set(0, 47, 0); // Se eleva en la explosión
    }
  }

  if (mode === 'all') {
    window.plantFloor1Group.visible = true;
    window.plantFloor2Group.visible = true;
    window.plantFloor2Group.position.set(0, 38, 0);
    controls.target.set(0, 20, 0);
  } else if (mode === 'p1') {
    window.plantFloor1Group.visible = true;
    window.plantFloor2Group.visible = false;
    controls.target.set(0, 10, 0);
  } else if (mode === 'p2') {
    window.plantFloor1Group.visible = false;
    window.plantFloor2Group.visible = true;
    window.plantFloor2Group.position.set(0, 0, 0); // Bajar al nivel base para inspeccionar
    controls.target.set(0, 10, 0);
  } else if (mode === 'split') {
    window.plantFloor1Group.visible = true;
    window.plantFloor2Group.visible = true;
    window.plantFloor2Group.position.set(0, 85, 0); // Vista explosionada vertical entre pisos
    controls.target.set(0, 40, 0);
  }
  controls.update();
}

// Mostrar inspección de Departamento Administrativo (Organigrama)
function showAdminDept(deptId) {
  const data = adminDeptData[deptId];
  if (!data) return;

  const popup = document.getElementById('hotspot-card');
  document.getElementById('hotspot-type').innerText = data.type;
  document.getElementById('hotspot-title').innerText = data.title;
  document.getElementById('hotspot-desc').innerText = data.desc;

  const specsContainer = document.getElementById('hotspot-specs');
  specsContainer.innerHTML = '';
  for (const [key, val] of Object.entries(data.specs)) {
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `<span class="spec-key">${key}:</span><span class="spec-val">${val}</span>`;
    specsContainer.appendChild(row);
  }

  popup.classList.remove('hidden');

  // Mover suavemente la cámara 3D hacia el departamento administrativo
  if (window.adminDeptsMap && window.adminDeptsMap[deptId]) {
    const dMesh = window.adminDeptsMap[deptId];
    controls.target.set(dMesh.position.x, 8, dMesh.position.z);
    camera.position.set(dMesh.position.x + 18, 30, dMesh.position.z + 32);
    controls.update();
  }
}

// Mostrar inspección técnica de estación de planta
function showPlantStation(stationId) {
  const data = plantStationData[stationId];
  if (!data) return;

  state.selectedStation = stationId;
  const popup = document.getElementById('hotspot-card');
  document.getElementById('hotspot-type').innerText = data.type;
  document.getElementById('hotspot-title').innerText = data.title;
  document.getElementById('hotspot-desc').innerText = data.desc;

  const specsContainer = document.getElementById('hotspot-specs');
  specsContainer.innerHTML = '';
  for (const [key, val] of Object.entries(data.specs)) {
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `<span class="spec-key">${key}:</span><span class="spec-val">${val}</span>`;
    specsContainer.appendChild(row);
  }

  popup.classList.remove('hidden');

  // Mover suavemente la cámara 3D hacia la estación
  const stMesh = plantStationsMap[stationId];
  if (stMesh) {
    controls.target.set(stMesh.position.x, 10, stMesh.position.z);
    camera.position.set(stMesh.position.x + 15, 30, stMesh.position.z + 35);
    controls.update();
  }
}

// Presets de Cámara adaptados a Producto vs Planta
function setCameraView(view) {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (state.currentMode === 'plant') {
    controls.target.set(0, 8, 0);
    switch (view) {
      case 'isometric':
        camera.position.set(0, 110, 140);
        break;
      case 'front':
        camera.position.set(0, 30, 160);
        break;
      case 'top':
        camera.position.set(0, 180, 0.1);
        break;
      case 'side':
        camera.position.set(160, 30, 0);
        break;
    }
  } else {
    controls.target.set(0, 40, 0);
    switch (view) {
      case 'isometric':
        camera.position.set(180, 140, 260);
        break;
      case 'front':
        camera.position.set(0, 40, 320);
        break;
      case 'top':
        camera.position.set(0, 320, 0.1);
        break;
      case 'side':
        camera.position.set(320, 40, 0);
        break;
    }
  }
  controls.update();
}

// Hotspot Inspection Modal Display (Producto)
function showHotspot(partId) {
  const data = componentData[partId];
  if (!data) return;

  state.selectedComponent = partId;
  const popup = document.getElementById('hotspot-card');
  document.getElementById('hotspot-type').innerText = data.type;
  document.getElementById('hotspot-title').innerText = data.title;
  document.getElementById('hotspot-desc').innerText = data.desc;

  const specsContainer = document.getElementById('hotspot-specs');
  specsContainer.innerHTML = '';
  for (const [key, val] of Object.entries(data.specs)) {
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `<span class="spec-key">${key}:</span><span class="spec-val">${val}</span>`;
    specsContainer.appendChild(row);
  }

  popup.classList.remove('hidden');
}

function hideHotspot() {
  document.getElementById('hotspot-card').classList.add('hidden');
  state.selectedComponent = null;
  state.selectedStation = null;
}

// Canvas Click Raycaster for Hotspots (Producto & Planta)
function onCanvasClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  if (state.currentMode === 'plant') {
    const stations = Object.values(plantStationsMap);
    const adminDepts = window.adminDeptsMap ? Object.values(window.adminDeptsMap) : [];
    const allPlantObjs = [...stations, ...adminDepts];
    const intersects = raycaster.intersectObjects(allPlantObjs, true);
    if (intersects.length > 0) {
      let topObj = intersects[0].object;
      while (topObj.parent && !topObj.userData.id) {
        topObj = topObj.parent;
      }
      if (topObj && topObj.userData.id) {
        if (topObj.userData.isAdminDept) {
          showAdminDept(topObj.userData.id);
        } else {
          showPlantStation(topObj.userData.id);
        }
      }
    }
  } else {
    const groups = [hoodGroup, enclosureGroup, chassisGroup, stevensonGroup, bracketGroup];
    const intersects = raycaster.intersectObjects(groups, true);
    if (intersects.length > 0) {
      let topGroup = intersects[0].object;
      while (topGroup.parent && !topGroup.userData.id) {
        topGroup = topGroup.parent;
      }
      if (topGroup && topGroup.userData.id) {
        showHotspot(topGroup.userData.id);
      }
    }
  }
}

// UI Event Listeners

// =========================================================================
// CONTROL DE VISIBILIDAD DE LA PARED FRONTAL / FACHADA PISO 2
// =========================================================================
function toggleP2Facade(forceVisible) {
  if (forceVisible !== undefined) {
    state.showP2Facade = forceVisible;
  } else {
    state.showP2Facade = !state.showP2Facade;
  }

  if (window.wallP2FrontGroup) {
    window.wallP2FrontGroup.visible = state.showP2Facade;
  }

  const btnTop = document.getElementById('btn-toggle-p2-facade');
  const txtTop = document.getElementById('facade-p2-btn-text');
  if (btnTop) {
    btnTop.classList.toggle('active', state.showP2Facade);
    if (txtTop) txtTop.innerText = state.showP2Facade ? 'Fachada P2: ON' : 'Fachada P2: OFF';
  }

  const btnFps = document.getElementById('btn-fps-facade');
  const txtFps = document.getElementById('fps-facade-text');
  if (btnFps) {
    btnFps.classList.toggle('active', state.showP2Facade);
    if (txtFps) txtFps.innerText = state.showP2Facade ? 'Fachada P2 ON' : 'Fachada P2 OFF';
  }
}
window.toggleP2Facade = toggleP2Facade;

function setupUIEvents() {
  // Sidebar Toggle Drawer Button (Pantalla Completa Limpia)
  const sidebarToggleBtn = document.getElementById('btn-toggle-sidebar');
  const mainLayout = document.querySelector('.main-layout');
  if (sidebarToggleBtn && mainLayout) {
    sidebarToggleBtn.addEventListener('click', () => {
      const isOpen = mainLayout.classList.toggle('sidebar-open');
      sidebarToggleBtn.classList.toggle('active', isOpen);
      setTimeout(() => {
        onWindowResize();
      }, 360);
    });
  }

  // Mode Switcher (Producto vs Planta)
  document.getElementById('btn-view-product').addEventListener('click', () => setAppMode('product'));
  document.getElementById('btn-view-plant').addEventListener('click', () => setAppMode('plant'));

  // Exploded Slider (Producto)
  const slider = document.getElementById('exploded-slider');
  slider.addEventListener('input', (e) => {
    updateExplodedView(parseFloat(e.target.value) / 100);
  });

  // Plant Simulation Controls
  const simPlayBtn = document.getElementById('btn-sim-play');
  if (simPlayBtn) {
    simPlayBtn.addEventListener('click', () => {
      state.simRunning = !state.simRunning;
      simPlayBtn.classList.toggle('paused', !state.simRunning);
      simPlayBtn.innerHTML = state.simRunning 
        ? `<i data-lucide="play"></i> <span>Simulación Activa</span>`
        : `<i data-lucide="pause"></i> <span>Simulación Pausada</span>`;
      safeRefreshIcons();
    });
  }

  // Floor Selector (Edificio de 2 Pisos)
  document.querySelectorAll('.floor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setPlantFloorView(btn.dataset.floor);
    });
  });

  // Speed buttons
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.simSpeed = parseFloat(btn.dataset.speed);
    });
  });

  // View Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => setCameraView(btn.dataset.view));
  });

  // X-Ray Toggle
  document.getElementById('btn-toggle-xray').addEventListener('click', () => {
    toggleXRay(!state.isXRay);
  });

  // Dimensions Toggle
  const dimBtn = document.getElementById('btn-toggle-dimensions');
  dimBtn.addEventListener('click', () => {
    state.showDimensions = !state.showDimensions;
    dimBtn.classList.toggle('active', state.showDimensions);
    dimensionLinesGroup.visible = state.showDimensions;
  });

  // Mast Toggle
  const mastBtn = document.getElementById('btn-toggle-mast');
  mastBtn.addEventListener('click', () => {
    state.showMast = !state.showMast;
    mastBtn.classList.toggle('active', state.showMast);
    mastGroup.visible = state.showMast;
  });

  // Weather Buttons
  document.querySelectorAll('.weather-btn').forEach(btn => {
    btn.addEventListener('click', () => setWeather(btn.dataset.weather));
  });

  // Hotspot Close Button
  document.getElementById('hotspot-close').addEventListener('click', hideHotspot);

  // Función global para Expandir / Colapsar todos los acordeones del tab activo
  window.toggleAllAccordions = function(paneId) {
    const pane = document.getElementById(paneId);
    if (!pane) return;
    const items = pane.querySelectorAll('.comp-item');
    if (!items.length) return;
    const hasClosed = Array.from(items).some(i => !i.classList.contains('open'));
    items.forEach(i => i.classList.toggle('open', hasClosed));
    safeRefreshIcons();
  };

  // Component Click on Product Sidebar Items (Acordeón + 3D)
  document.querySelectorAll('#tab-specs .comp-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const isAlreadyOpen = item.classList.contains('open');
      document.querySelectorAll('#tab-specs .comp-item').forEach(i => i.classList.remove('open'));
      if (!isAlreadyOpen) item.classList.add('open');

      const part = item.dataset.part;
      showHotspot(part);
      if (slider.value == 0) {
        slider.value = 50;
        updateExplodedView(0.5);
      }
      safeRefreshIcons();
    });
  });

  // Plant Station Click on Plant Sidebar Items (Acordeón + 3D)
  document.querySelectorAll('#tab-plant-stations .comp-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const isAlreadyOpen = item.classList.contains('open');
      document.querySelectorAll('#tab-plant-stations .comp-item').forEach(i => i.classList.remove('open'));
      if (!isAlreadyOpen) item.classList.add('open');

      const stationId = item.dataset.station;
      showPlantStation(stationId);
      safeRefreshIcons();
    });
  });

  // Admin Department Click on Sidebar Items (Acordeón + 3D)
  document.querySelectorAll('#tab-plant-admin .comp-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const isAlreadyOpen = item.classList.contains('open');
      document.querySelectorAll('#tab-plant-admin .comp-item').forEach(i => i.classList.remove('open'));
      if (!isAlreadyOpen) item.classList.add('open');

      const deptId = item.dataset.dept;
      showAdminDept(deptId);
      safeRefreshIcons();
    });
  });

  // Sidebar Tabs (Grouped)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentTabs = btn.closest('.sidebar-tabs');
      parentTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(`tab-${btn.dataset.tab}`);
      if (targetPane) targetPane.classList.add('active');
      safeRefreshIcons();
    });
  });

  // Export 3D STL
  document.getElementById('btn-export-stl').addEventListener('click', exportSTL);

  // Modo Recorrido en Primera Persona (Walkthrough FPS)
  const fpsBtn = document.getElementById('btn-toggle-fps');
  if (fpsBtn) {
    fpsBtn.addEventListener('click', () => toggleFPSMode());
  }

  const fpsExitBtn = document.getElementById('btn-exit-fps');
  if (fpsExitBtn) {
    fpsExitBtn.addEventListener('click', () => toggleFPSMode(false));
  }

  // Función para sincronizar la UI de sensibilidad de ratón
  function updateSensUI(val) {
    const slider = document.getElementById('fps-sens-slider');
    if (slider) slider.value = val;
    document.querySelectorAll('.sens-btn').forEach(btn => {
      const bVal = parseFloat(btn.dataset.sens);
      btn.classList.toggle('active', Math.abs(bVal - val) < 0.0002);
    });
  }

  // Botones de preselección de sensibilidad en FPS
  document.querySelectorAll('.sens-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sens = parseFloat(btn.dataset.sens);
      state.fpsMouseSensitivity = sens;
      updateSensUI(sens);
    });
  });

  // Slider de ajuste continuo de sensibilidad de ratón
  const sensSlider = document.getElementById('fps-sens-slider');
  if (sensSlider) {
    sensSlider.addEventListener('input', (e) => {
      state.fpsMouseSensitivity = parseFloat(e.target.value);
      updateSensUI(state.fpsMouseSensitivity);
    });
  }

  // Alternar Techo Industrial en Vista Orbital
  const roofToggleBtn = document.getElementById('btn-toggle-roof');
  if (roofToggleBtn) {
    roofToggleBtn.addEventListener('click', () => {
      state.showPlantRoof = !state.showPlantRoof;
      roofToggleBtn.classList.toggle('active', state.showPlantRoof);
      const txt = document.getElementById('roof-btn-text');
      if (txt) txt.innerText = state.showPlantRoof ? "Ocultar Techo" : "Ver Techo";
      if (window.plantRoofGroup) {
        window.plantRoofGroup.visible = state.showPlantRoof;
      }
    });
  }

  // Alternar Pared Frontal / Fachada Piso 2 en Header y Vista Orbital
  const headerFacadeBtn = document.getElementById('btn-header-facade');
  if (headerFacadeBtn) {
    headerFacadeBtn.addEventListener('click', () => {
      toggleP2Facade();
    });
  }

  const facadeToggleBtn = document.getElementById('btn-toggle-p2-facade');
  if (facadeToggleBtn) {
    facadeToggleBtn.addEventListener('click', () => {
      toggleP2Facade();
    });
  }

  // Alternar Pared Frontal / Fachada Piso 2 desde el HUD de Primera Persona
  const fpsFacadeBtn = document.getElementById('btn-fps-facade');
  if (fpsFacadeBtn) {
    fpsFacadeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleP2Facade();
    });
  }

  // Botón para liberar/fijar ratón y cambiar opciones en FPS
  const unlockMouseBtn = document.getElementById('btn-unlock-mouse');
  if (unlockMouseBtn) {
    unlockMouseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const canvas = renderer ? renderer.domElement : null;
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      } else if (canvas && canvas.requestPointerLock) {
        canvas.requestPointerLock().catch(() => {});
      }
    });
  }

  // Banner superior para reanudar control FPS con un solo clic
  const resumeFpsBtn = document.getElementById('btn-resume-fps');
  if (resumeFpsBtn) {
    resumeFpsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const canvas = renderer ? renderer.domElement : null;
      if (canvas && canvas.requestPointerLock) {
        canvas.requestPointerLock().catch(() => {});
      }
    });
  }

  // Alternar techo directamente desde el HUD de Primera Persona
  const fpsRoofBtn = document.getElementById('btn-fps-roof');
  if (fpsRoofBtn) {
    fpsRoofBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.showPlantRoof = !state.showPlantRoof;
      if (window.plantRoofGroup) window.plantRoofGroup.visible = state.showPlantRoof;
      fpsRoofBtn.classList.toggle('active', state.showPlantRoof);
      const fpsRoofTxt = document.getElementById('fps-roof-text');
      if (fpsRoofTxt) fpsRoofTxt.innerText = state.showPlantRoof ? "Techo ON" : "Techo OFF";
      const orbitalRoofBtn = document.getElementById('btn-toggle-roof');
      if (orbitalRoofBtn) orbitalRoofBtn.classList.toggle('active', state.showPlantRoof);
      const orbitalRoofTxt = document.getElementById('roof-btn-text');
      if (orbitalRoofTxt) orbitalRoofTxt.innerText = state.showPlantRoof ? "Ocultar Techo" : "Ver Techo";
    });
  }

  // Al hacer clic en el viewport 3D mientras se está en FPS con ratón liberado, volver a fijar puntero
  if (renderer && renderer.domElement) {
    renderer.domElement.addEventListener('click', () => {
      if (state.fpsMode && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock().catch(() => {});
      }
    });
  }

  // Listener para cambio en el estado de bloqueo de puntero (Pointer Lock)
  document.addEventListener('pointerlockchange', () => {
    const canvas = renderer ? renderer.domElement : null;
    const isLocked = (document.pointerLockElement === canvas);
    state.fpsPointerLocked = isLocked;

    const unlockBtn = document.getElementById('btn-unlock-mouse');
    const resumeBanner = document.getElementById('fps-resume-banner');

    if (isLocked) {
      if (unlockBtn) {
        unlockBtn.classList.remove('unlocked');
        unlockBtn.innerHTML = '<i data-lucide="mouse-pointer-click"></i> Opciones (Tab)';
      }
      if (resumeBanner) resumeBanner.classList.add('hidden');
    } else if (state.fpsMode) {
      // Ratón liberado: el cursor es visible y el usuario puede hacer clic en opciones sin salir de FPS
      if (unlockBtn) {
        unlockBtn.classList.add('unlocked');
        unlockBtn.innerHTML = '<i data-lucide="lock"></i> Fijar Ratón (Tab)';
      }
      if (resumeBanner) resumeBanner.classList.remove('hidden');
    }
    safeRefreshIcons();
  });

  // Movimiento del ratón para rotación de cámara 360° en FPS con sensibilidad regulable y suave
  document.addEventListener('mousemove', (e) => {
    const canvas = renderer ? renderer.domElement : null;
    if (!state.fpsMode || document.pointerLockElement !== canvas) return;
    const sens = state.fpsMouseSensitivity || 0.0005;
    state.fpsCameraYaw -= e.movementX * sens;
    state.fpsCameraPitch -= e.movementY * sens;
    const maxPitch = Math.PI / 2.05;
    state.fpsCameraPitch = Math.max(-maxPitch, Math.min(maxPitch, state.fpsCameraPitch));
  });

  // Teclado para navegación FPS (WASD, Flechas, Shift, Tab para pausar/opciones, 1-3 sensibilidad, T techo, Esc salir)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV' && !e.ctrlKey && !e.altKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      toggleFPSMode();
      return;
    }

    if (!state.fpsMode) return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        state.fpsMoveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        state.fpsMoveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        state.fpsMoveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        state.fpsMoveRight = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        state.fpsRun = true;
        break;
      case 'Tab':
        e.preventDefault();
        const canvas = renderer ? renderer.domElement : null;
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock();
        } else if (canvas && canvas.requestPointerLock) {
          canvas.requestPointerLock().catch(() => {});
        }
        break;
      case 'Digit1':
      case 'Numpad1':
        state.fpsMouseSensitivity = 0.0005;
        updateSensUI(0.0005);
        break;
      case 'Digit2':
      case 'Numpad2':
        state.fpsMouseSensitivity = 0.0008;
        updateSensUI(0.0008);
        break;
      case 'Digit3':
      case 'Numpad3':
        state.fpsMouseSensitivity = 0.0014;
        updateSensUI(0.0014);
        break;
      case 'KeyT':
        state.showPlantRoof = !state.showPlantRoof;
        if (window.plantRoofGroup) window.plantRoofGroup.visible = state.showPlantRoof;
        const roofBtn = document.getElementById('btn-toggle-roof');
        if (roofBtn) roofBtn.classList.toggle('active', state.showPlantRoof);
        const roofTxt = document.getElementById('roof-btn-text');
        if (roofTxt) roofTxt.innerText = state.showPlantRoof ? "Ocultar Techo" : "Ver Techo";
        const fRoofBtn = document.getElementById('btn-fps-roof');
        if (fRoofBtn) fRoofBtn.classList.toggle('active', state.showPlantRoof);
        const fRoofTxt = document.getElementById('fps-roof-text');
        if (fRoofTxt) fRoofTxt.innerText = state.showPlantRoof ? "Techo ON" : "Techo OFF";
        break;
      case 'BracketLeft':
        state.fpsMouseSensitivity = Math.max(0.0002, (state.fpsMouseSensitivity || 0.0005) - 0.00015);
        updateSensUI(state.fpsMouseSensitivity);
        break;
      case 'BracketRight':
        state.fpsMouseSensitivity = Math.min(0.0020, (state.fpsMouseSensitivity || 0.0005) + 0.00015);
        updateSensUI(state.fpsMouseSensitivity);
        break;
      case 'Escape':
        toggleFPSMode(false);
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (!state.fpsMode) return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        state.fpsMoveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        state.fpsMoveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        state.fpsMoveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        state.fpsMoveRight = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        state.fpsRun = false;
        break;
    }
  });
}

// Activar / Desactivar Modo Recorrido en Primera Persona (Videojuego FPS)
function toggleFPSMode(enable) {
  state.fpsMode = (enable !== undefined) ? enable : !state.fpsMode;
  const fpsBtn = document.getElementById('btn-toggle-fps');
  const hud = document.getElementById('fps-hud');
  const canvas = renderer ? renderer.domElement : null;

  // Ocultar barras de herramientas superpuestas en la interfaz cuando se recorre en FPS
  document.body.classList.toggle('fps-mode-active', state.fpsMode);

  if (state.fpsMode) {
    if (fpsBtn) fpsBtn.classList.add('active');
    if (hud) hud.classList.remove('hidden');

    // Cambiar a modo Planta si está en modo Producto
    if (state.currentMode !== 'plant') {
      setAppMode('plant');
    }

    // Asegurar que el campus exterior, la cubierta y ambos pisos estén visibles y alineados a su cota vertical
    if (window.plantOutdoorGroup) window.plantOutdoorGroup.visible = true;
    if (window.plantFloor1Group) window.plantFloor1Group.visible = true;
    if (window.plantFloor2Group) {
      window.plantFloor2Group.visible = true;
      window.plantFloor2Group.position.set(0, 38, 0);
    }
    // El techo SIEMPRE se activa en modo FPS para que al mirar arriba se vea el techo estructural real
    state.showPlantRoof = true;
    if (window.plantRoofGroup) {
      window.plantRoofGroup.visible = true;
      window.plantRoofGroup.position.set(0, 0, 0);
    }
    const fRoofBtn = document.getElementById('btn-fps-roof');
    if (fRoofBtn) fRoofBtn.classList.add('active');
    const fRoofTxt = document.getElementById('fps-roof-text');
    if (fRoofTxt) fRoofTxt.innerText = "Techo ON";

    // Posición inicial: si estaba viendo Piso 2, comenzar en Piso 2; de lo contrario, en el patio exterior frente a la entrada
    const activeFloorBtn = document.querySelector('.floor-btn.active');
    const startFloor = activeFloorBtn ? activeFloorBtn.dataset.floor : 'all';
    if (startFloor === 'p2') {
      state.fpsCameraPos.set(-20, 48, 20);
      state.fpsCameraYaw = -Math.PI / 2;
    } else {
      state.fpsCameraPos.set(0, 10, 80);
      state.fpsCameraYaw = Math.PI;
    }
    state.fpsCameraPitch = 0;
    camera.position.copy(state.fpsCameraPos);
    camera.rotation.set(0, state.fpsCameraYaw, 0, 'YXZ');

    controls.enabled = false;

    if (canvas && canvas.requestPointerLock) {
      canvas.requestPointerLock().catch(() => {});
    }
    safeRefreshIcons();
  } else {
    if (fpsBtn) fpsBtn.classList.remove('active');
    if (hud) hud.classList.add('hidden');
    controls.enabled = true;

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    state.fpsMoveForward = false;
    state.fpsMoveBackward = false;
    state.fpsMoveLeft = false;
    state.fpsMoveRight = false;
    state.fpsRun = false;

    // Restaurar visibilidad del techo según la preferencia del usuario en vista orbital
    if (window.plantRoofGroup) {
      window.plantRoofGroup.visible = state.showPlantRoof;
    }

    // Regresar a vista isométrica general de la planta
    setCameraView('isometric');
    safeRefreshIcons();
  }
}

// STL Exporter for 3D Printing
function exportSTL() {
  const exporter = new THREE.STLExporter();
  const root = state.currentMode === 'plant' ? plantRootGroup : modelRoot;
  const stlString = exporter.parse(root, { binary: true });
  const blob = new Blob([stlString], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = state.currentMode === 'plant' ? 'Planta_Produccion_OTech_AirNet.stl' : 'OTech_AirNet_Outdoor_Enclosure_3D.stl';
  link.click();
}

// Window Resize Handler
function onWindowResize() {
  const container = document.getElementById('canvas-container');
  if (!container || !camera || !renderer) return;
  const width = container.clientWidth > 0 ? container.clientWidth : window.innerWidth;
  const height = container.clientHeight > 0 ? container.clientHeight : Math.max(300, window.innerHeight - 64);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  if (composer) {
    composer.setSize(width, height);
    if (bloomPass) bloomPass.setSize(width, height);
    if (fxaaPass) {
      const pixelRatio = renderer.getPixelRatio();
      fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
      fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
    }
  }
}

// Animation Loop
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(animClock.getDelta(), 0.05);
  const dtFactor = delta * 60; // Normalización precisa a 60 FPS
  const time = Date.now() * 0.002;

  // Actualización de Física y Cámara en Modo Primera Persona (FPS)
  if (state.fpsMode) {
    controls.enabled = false;

    // Vectores horizontal de traslación
    const forwardX = -Math.sin(state.fpsCameraYaw);
    const forwardZ = -Math.cos(state.fpsCameraYaw);
    const rightX = Math.cos(state.fpsCameraYaw);
    const rightZ = -Math.sin(state.fpsCameraYaw);

    const speed = (state.fpsRun ? 1.6 : 0.85) * (state.simSpeed || 1.0) * dtFactor;
    let moveX = 0;
    let moveZ = 0;

    if (state.fpsMoveForward) {
      moveX += forwardX * speed;
      moveZ += forwardZ * speed;
    }
    if (state.fpsMoveBackward) {
      moveX -= forwardX * speed;
      moveZ -= forwardZ * speed;
    }
    if (state.fpsMoveRight) {
      moveX += rightX * speed;
      moveZ += rightZ * speed;
    }
    if (state.fpsMoveLeft) {
      moveX -= rightX * speed;
      moveZ -= rightZ * speed;
    }

    // Colisión física contra cajas de colisión registradas (window.plantCollisionBoxes)
    function checkPlayerCollision(newX, newZ, currentY) {
      const radius = 2.0; // Radio corporal del avatar
      if (!window.plantCollisionBoxes || window.plantCollisionBoxes.length === 0) return false;
      const playerFeetY = currentY - 9.0;
      const playerHeadY = currentY + 1.0;
      for (let i = 0; i < window.plantCollisionBoxes.length; i++) {
        const b = window.plantCollisionBoxes[i];
        if (playerHeadY >= b.minY && playerFeetY <= b.maxY) {
          if (newX + radius >= b.minX && newX - radius <= b.maxX &&
              newZ + radius >= b.minZ && newZ - radius <= b.maxZ) {
            return true;
          }
        }
      }
      return false;
    }

    // Desplazamiento con resolución independiente en ejes X y Z (permite deslizamiento suave en paredes/muros)
    const targetX = state.fpsCameraPos.x + moveX;
    if (!checkPlayerCollision(targetX, state.fpsCameraPos.z, state.fpsCameraPos.y)) {
      state.fpsCameraPos.x = targetX;
    }

    const targetZ = state.fpsCameraPos.z + moveZ;
    if (!checkPlayerCollision(state.fpsCameraPos.x, targetZ, state.fpsCameraPos.y)) {
      state.fpsCameraPos.z = targetZ;
    }

    // Perímetro del Campus Exterior Completo (-182m a +182m en X, -132m a +200m en Z)
    state.fpsCameraPos.x = Math.max(-182, Math.min(182, state.fpsCameraPos.x));
    state.fpsCameraPos.z = Math.max(-132, Math.min(200, state.fpsCameraPos.z));

    // Detección de escalera arquitectónica (X: [-88, -70], Z: [20, 74])
    const inStairs = (state.fpsCameraPos.x >= -88 && state.fpsCameraPos.x <= -70 && state.fpsCameraPos.z >= 20 && state.fpsCameraPos.z <= 74);

    if (inStairs) {
      const stairProgress = Math.max(0, Math.min(1, (state.fpsCameraPos.z - 20) / 54));
      state.fpsCameraPos.y = 10 + stairProgress * 38;
      const locEl = document.getElementById('fps-location-text');
      if (locEl) locEl.innerText = 'Escalera de Comunicación Vertical (Subiendo a Sede Corporativa & Data Center)';
    } else {
      if (state.fpsCameraPos.y > 28) {
        state.fpsCameraPos.y = 48; // Altura de ojos en Piso 2 (+10m sobre losa)
        const locEl = document.getElementById('fps-location-text');
        if (locEl) {
          if (state.fpsCameraPos.x > 10 && state.fpsCameraPos.z > 30) {
            locEl.innerText = 'Piso 2: Infraestructura de Datos & Servidores Cloud IoT';
          } else if (state.fpsCameraPos.x < -20 && state.fpsCameraPos.z < -10) {
            locEl.innerText = 'Piso 2: Laboratorio I+D Hardware & Firmware OTech OS';
          } else if (state.fpsCameraPos.x > 15 && state.fpsCameraPos.z < -20) {
            locEl.innerText = 'Piso 2: Dirección General & Presidencia (Junta)';
          } else if (state.fpsCameraPos.x < -20 && state.fpsCameraPos.z > 20) {
            locEl.innerText = 'Piso 2: Vestíbulo & Operaciones NOC 24/7';
          } else {
            locEl.innerText = 'Piso 2: Sede Corporativa, I+D & Data Center OTech';
          }
        }
      } else {
        state.fpsCameraPos.y = 10; // Altura de ojos en Piso 1 y Campus Exterior (+10m sobre suelo)
        const locEl = document.getElementById('fps-location-text');
        if (locEl) {
          if (state.fpsCameraPos.z > 98) {
            // Fuera de la nave industrial: Campus Exterior
            if (state.fpsCameraPos.z > 145) {
              locEl.innerText = 'Campus Exterior: Vía de Acceso Principal, Caseta de Control & Barrera Vehicular';
            } else if (state.fpsCameraPos.x < -70 && state.fpsCameraPos.z >= 105 && state.fpsCameraPos.z <= 145) {
              locEl.innerText = 'Campus Exterior: Parqueadero de Empleados & Estaciones de Recarga EV';
            } else if (state.fpsCameraPos.x >= -65 && state.fpsCameraPos.x <= -35 && state.fpsCameraPos.z <= 135) {
              locEl.innerText = 'Campus Exterior: Muelle 1 - Descarga de Camión BOM (Inbound Logistics)';
            } else if (state.fpsCameraPos.x >= 35 && state.fpsCameraPos.x <= 65 && state.fpsCameraPos.z <= 135) {
              locEl.innerText = 'Campus Exterior: Muelle 2 - Despacho de Camión FGS (Outbound Distribution)';
            } else {
              locEl.innerText = 'Campus Exterior: Fachada Corporativa & Patio de Maniobras OTech';
            }
          } else if (state.fpsCameraPos.z > 45 && state.fpsCameraPos.x < 0) {
            locEl.innerText = 'Piso 1: Muelle de Descarga, Estación IQC & Bodega BOM Kanban';
          } else if (state.fpsCameraPos.z > 45 && state.fpsCameraPos.x >= 0) {
            locEl.innerText = 'Piso 1: Muelle de Despacho FGS, Envolvedora & Báscula de Pesaje';
          } else if (state.fpsCameraPos.x >= 60 && state.fpsCameraPos.z <= -40) {
            locEl.innerText = 'Piso 1: Tanques de Recolección Pluvial (10.000 L) & Bombeo';
          } else if (state.fpsCameraPos.x >= -50 && state.fpsCameraPos.x <= 50 && state.fpsCameraPos.z >= -35 && state.fpsCameraPos.z <= 20) {
            locEl.innerText = 'Piso 1: Celda Limpia ESD en U (7 Estaciones OTech)';
          } else {
            locEl.innerText = 'Piso 1: Nave Industrial & Pasillo Logístico';
          }
        }
      }
    }

    camera.position.copy(state.fpsCameraPos);
    camera.rotation.set(state.fpsCameraPitch, state.fpsCameraYaw, 0, 'YXZ');

    // Detección Interactiva de la Mira Central (Crosshair Raycast HUD)
    if (window.fpsInteractiveTargets && window.fpsInteractiveTargets.length > 0) {
      const forwardDir = new THREE.Vector3();
      camera.getWorldDirection(forwardDir);
      raycaster.set(camera.position, forwardDir);

      const intersects = raycaster.intersectObjects(window.fpsInteractiveTargets, true);
      const hudCard = document.getElementById('fps-target-card');

      if (intersects.length > 0 && intersects[0].distance < 75) {
        let hitObj = intersects[0].object;
        while (hitObj.parent && !hitObj.userData.isInteractive) {
          hitObj = hitObj.parent;
        }

        if (hitObj && hitObj.userData.isInteractive) {
          const u = hitObj.userData;
          const badgeEl = document.getElementById('fps-target-type');
          const titleEl = document.getElementById('fps-target-title');
          const descEl = document.getElementById('fps-target-desc');
          const extraEl = document.getElementById('fps-target-extra');

          if (badgeEl) badgeEl.innerText = u.badge || 'ÁREA INDUSTRIAL';
          if (titleEl) titleEl.innerText = u.name || 'Instalación OTech';
          if (descEl) descEl.innerText = u.desc || '';
          if (extraEl) extraEl.innerText = u.extra || '';

          if (hudCard) hudCard.classList.remove('hidden');
        } else if (hudCard) {
          hudCard.classList.add('hidden');
        }
      } else if (hudCard) {
        hudCard.classList.add('hidden');
      }
    }
  } else {
    controls.update();
  }

  // 1. Animaciones Modo Producto (Fluidez & Realismo Vivo)
  if (state.currentMode === 'product') {
    // Respiración del Anillo LED de Estado 360°
    if (enclosureGroup && ledRingLight && materialsMap.ledRing) {
      const pulse = (Math.sin(time * 3.5) + 1.0) * 0.5;
      ledRingLight.intensity = 1.2 + pulse * 1.2;
      materialsMap.ledRing.color.setHSL(0.52 + pulse * 0.03, 0.95, 0.45 + pulse * 0.2);
    }

    // Rotación suave continua de la micro-turbina del sensor SPS30
    if (window.spsFanMesh) {
      window.spsFanMesh.rotation.x += 0.35;
    }

    // Suavizado lerp ultra fluido en la transición de la vista explosionada
    if (state.targetExplodedProgress !== undefined) {
      const diff = state.targetExplodedProgress - state.explodedProgress;
      if (Math.abs(diff) > 0.001) {
        state.explodedProgress += diff * 0.12;
        if (typeof applyExplodedPositions === 'function') {
          applyExplodedPositions(state.explodedProgress);
        }
        const slider = document.getElementById('exploded-slider');
        if (slider) {
          slider.value = state.explodedProgress * 100;
          const valEl = document.getElementById('exploded-val');
          if (valEl) valEl.innerText = `${Math.round(state.explodedProgress * 100)}%`;
        }
      }
    }

    if (airflowParticles && airflowParticles.visible) {
      const pos = airflowParticles.geometry.attributes.position.array;
      const vels = airflowParticles.userData.velocities;
      for (let i = 0; i < vels.length; i++) {
        const v = vels[i];
        v.radius -= 0.15;
        v.angle += 0.02;
        if (v.radius < 10) {
          v.radius = 55 + Math.random() * 10;
          v.y = Math.random() * 40;
        }
        pos[i * 3] = Math.cos(v.angle) * v.radius;
        pos[i * 3 + 1] = v.y;
        pos[i * 3 + 2] = Math.sin(v.angle) * v.radius;
      }
      airflowParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (rainParticles && rainParticles.visible) {
      const pos = rainParticles.geometry.attributes.position.array;
      const vels = rainParticles.userData.velocities;
      for (let i = 0; i < vels.length; i++) {
        pos[i * 3 + 1] += vels[i].vy;
        pos[i * 3] += vels[i].vx;
        pos[i * 3 + 2] += vels[i].vz;
        if (pos[i * 3 + 1] < -80) {
          pos[i * 3 + 1] = 160 + Math.random() * 40;
          pos[i * 3] = (Math.random() - 0.5) * 250;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 250;
        }
      }
      rainParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // 2. Animaciones Modo Planta de Producción
  if (state.currentMode === 'plant' && plantRootGroup.visible) {
    // Parpadeo de LEDs en Burn-In Rack y balizas Andon
    if (plantStationsMap.st6 && plantStationsMap.st6.userData.burnInLeds) {
      const leds = plantStationsMap.st6.userData.burnInLeds;
      leds.forEach((led, idx) => {
        const blink = Math.sin(time * 3 + idx);
      });
    }

    // Cinemática activa de los operarios de planta (respiración, postura y tareas en tiempo real)
    if (window.plantWorkers && window.plantWorkers.length > 0) {
      const animSec = Date.now() * 0.001;
      window.plantWorkers.forEach((w, idx) => {
        const t = animSec * (state.simRunning ? (state.simSpeed || 1.0) : 1.0) + (w.phaseOffset || idx * 1.3);

        // 1. Respiración sutil en el pecho
        if (w.torsoGroup) {
          const breath = 1.0 + Math.sin(t * 1.8) * 0.025;
          w.torsoGroup.scale.set(breath, 1.0, breath);
        }

        // 2. Movimiento natural de cabeza (mirar alternadamente la tarea, pantalla y entorno)
        if (w.headPivot) {
          if (w.role === 'assembly') {
            w.headPivot.rotation.x = 0.25 + Math.sin(t * 0.8) * 0.08;
            w.headPivot.rotation.y = Math.sin(t * 0.5) * 0.15;
          } else if (w.role === 'flashing') {
            const lookScreen = Math.sin(t * 0.6) > 0;
            w.headPivot.rotation.x = lookScreen ? -0.1 : 0.22;
            w.headPivot.rotation.y = lookScreen ? 0.35 : -0.12;
          } else if (w.role === 'sealing') {
            w.headPivot.rotation.x = 0.3 + Math.sin(t * 1.5) * 0.05;
            w.headPivot.rotation.y = Math.sin(t * 0.7) * 0.1;
          } else if (w.role === 'oqc') {
            w.headPivot.rotation.y = Math.sin(t * 0.9) * 0.35;
            w.headPivot.rotation.x = 0.18 + Math.cos(t * 0.9) * 0.08;
          } else if (w.isSeated) {
            w.headPivot.rotation.y = Math.sin(t * 0.7) * 0.25;
            w.headPivot.rotation.x = 0.1 + Math.sin(t * 1.4) * 0.05;
          } else {
            w.headPivot.rotation.y = Math.sin(t * 0.4) * 0.35;
            w.headPivot.rotation.x = Math.sin(t * 0.6) * 0.08;
          }
        }

        // 3. Cinemática activa de brazos según el rol de producción
        if (w.role === 'assembly' && w.rightArmPivot && w.rightForearmPivot) {
          const cycle = (t * 1.2) % 4.0;
          if (cycle < 1.5) {
            const prog = cycle / 1.5;
            w.rightArmPivot.rotation.x = -Math.PI / 4 - prog * 0.35;
            w.rightForearmPivot.rotation.x = -Math.PI / 3 - prog * 0.2;
          } else if (cycle < 2.5) {
            w.rightArmPivot.rotation.x = -Math.PI / 4 - 0.35 + (Math.random() - 0.5) * 0.04;
            w.rightForearmPivot.rotation.x = -Math.PI / 3 - 0.2 + (Math.random() - 0.5) * 0.04;
          } else {
            const prog = (cycle - 2.5) / 1.5;
            w.rightArmPivot.rotation.x = (-Math.PI / 4 - 0.35) * (1.0 - prog) - Math.PI / 4 * prog;
            w.rightForearmPivot.rotation.x = (-Math.PI / 3 - 0.2) * (1.0 - prog) - Math.PI / 3 * prog;
          }
          if (w.leftArmPivot) w.leftArmPivot.rotation.x = -Math.PI / 3.5;
        } else if (w.role === 'sealing' && w.rightArmPivot && w.rightForearmPivot) {
          const ratchet = Math.sin(t * 4.0);
          w.rightArmPivot.rotation.x = -Math.PI / 3.5 + ratchet * 0.18;
          w.rightArmPivot.rotation.z = 0.15 + ratchet * 0.12;
          w.rightForearmPivot.rotation.x = -Math.PI / 2.5;
        } else if (w.role === 'oqc' && w.rightArmPivot) {
          const scanCycle = Math.sin(t * 1.5);
          w.rightArmPivot.rotation.x = -Math.PI / 3.0 + scanCycle * 0.15;
          w.rightArmPivot.rotation.y = -0.3 + scanCycle * 0.25;
          if (w.laserMesh) {
            w.laserMesh.visible = (scanCycle > -0.2);
            w.laserMesh.material.opacity = 0.4 + Math.sin(t * 12.0) * 0.3;
          }
        } else if (w.role === 'flashing' && w.rightArmPivot) {
          const tap = Math.sin(t * 2.0);
          w.rightArmPivot.rotation.x = -Math.PI / 4 + (tap > 0.8 ? 0.1 : 0);
          if (w.leftArmPivot) w.leftArmPivot.rotation.x = -Math.PI / 3.5;
        } else if (w.isSeated && w.leftArmPivot && w.rightArmPivot) {
          const typeL = Math.sin(t * 6.0) * 0.08;
          const typeR = Math.cos(t * 6.0) * 0.08;
          w.leftArmPivot.rotation.x = -Math.PI / 4.5 + typeL;
          w.rightArmPivot.rotation.x = -Math.PI / 4.5 + typeR;
        }
      });
    }

    // Mover unidades en la celda en U con ensamble progresivo pieza por pieza (dtFactor para velocidad constante a 60 FPS)
    if (state.simRunning && plantMovingUnits.length > 0) {
      plantMovingUnits.forEach(unit => {
        unit.userData.progress += unit.userData.speed * (state.simSpeed || 1.0) * dtFactor;
        if (unit.userData.progress > 1.0) {
          unit.userData.progress -= 1.0;
          state.unitsProduced = Math.min(25, state.unitsProduced + 1);
          const counterEl = document.getElementById('sim-units-count');
          if (counterEl) counterEl.innerText = `${state.unitsProduced} / 25 uds`;
        }

        const p = unit.userData.progress;
        let x, z;
        // Circuito Continuo de 4 Segmentos (Longitud total normalizada):
        // 1. Tramo Norte (0.00 a 0.36): de X=-45 a X=45 a Z=-25 (Estaciones 1, 2, 3, 4)
        if (p < 0.36) {
          const t = p / 0.36;
          x = -45 + t * 90;
          z = -25;
        }
        // 2. Tramo Este (0.36 a 0.50): de Z=-25 a Z=10 a X=45 (Estación 5)
        else if (p < 0.50) {
          const t = (p - 0.36) / 0.14;
          x = 45;
          z = -25 + t * 35;
        }
        // 3. Tramo Sur (0.50 a 0.86): de X=45 a X=-45 a Z=10 (Estaciones 6, 7)
        else if (p < 0.86) {
          const t = (p - 0.50) / 0.36;
          x = 45 - t * 90;
          z = 10;
        }
        // 4. Tramo Oeste de Retorno (0.86 a 1.00): de Z=10 a Z=-25 a X=-45
        else {
          const t = (p - 0.86) / 0.14;
          x = -45;
          z = 10 - t * 35;
        }

        unit.position.set(x, 6.2, z);

        // Determinar la etapa de ensamble según la posición en la línea:
        // Etapa 0: Chasis base y sensores (p < 0.12)
        // Etapa 1: ICT Flasheado & TLS (0.12 <= p < 0.24)
        // Etapa 2: Gabinete IP65 (0.24 <= p < 0.36)
        // Etapa 3: Banco Hermético (0.36 <= p < 0.50)
        // Etapa 4: Cámara Stevenson (0.50 <= p < 0.65)
        // Etapa 5: Cúpula Solar & Burn-In (0.65 <= p < 0.82)
        // Etapa 6: Empaque y Bracket Inox (p >= 0.82)
        let expectedStage = 0;
        if (p >= 0.82) expectedStage = 6;
        else if (p >= 0.65) expectedStage = 5;
        else if (p >= 0.50) expectedStage = 4;
        else if (p >= 0.36) expectedStage = 3;
        else if (p >= 0.24) expectedStage = 2;
        else if (p >= 0.12) expectedStage = 1;

        if (unit.userData.currentStage !== expectedStage) {
          unit.userData.currentStage = expectedStage;
          const oldModel = unit.getObjectByName('stageModel');
          if (oldModel) unit.remove(oldModel);
          if (window.createProgressiveAssemblyModel) {
            const newModel = window.createProgressiveAssemblyModel(expectedStage);
            newModel.name = 'stageModel';
            unit.add(newModel);
          }
        }
      });
    }

    // Parpadeo dinámico de LEDs en el Data Center (Piso 2)
    if (window.datacenterLeds && window.datacenterLeds.length > 0 && window.plantFloor2Group && window.plantFloor2Group.visible) {
      window.datacenterLeds.forEach((led, idx) => {
        const flicker = Math.sin(time * 7 + idx * 1.9) * Math.cos(time * 4 + idx * 2.7);
        led.material.opacity = flicker > -0.2 ? 0.95 : 0.2;
      });
    }
  }

  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

// Procedural Architectural Sky Dome Shader
function createSkyDome() {
  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + offset).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `;
  const uniforms = {
    topColor: { value: new THREE.Color(0x1d4ed8) },
    bottomColor: { value: new THREE.Color(0xcfd8dc) },
    offset: { value: 30 },
    exponent: { value: 0.6 }
  };
  const skyGeo = new THREE.SphereGeometry(750, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    side: THREE.BackSide,
    depthWrite: false
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.name = "plantSkyDome";
  return skyMesh;
}

// =========================================================================
// PIPELINE GRÁFICO PBR & TEXTURAS PROCEDURALES CANVAS DE ALTA RESOLUCIÓN
// =========================================================================

function createAsphaltPBRTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e2430';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 36;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 1.2));
  }
  ctx.putImageData(imgData, 0, 0);

  for (let s = 0; s < 45; s++) {
    const sx = Math.random() * 512;
    const sy = Math.random() * 512;
    const sr = 3 + Math.random() * 10;
    ctx.fillStyle = 'rgba(12, 16, 24, 0.22)';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  return tex;
}

function createConcretePBRTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#222938';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Cuadrícula arquitectónica de losa con juntas de dilatación
  ctx.strokeStyle = 'rgba(10, 14, 22, 0.65)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(256, 0); ctx.lineTo(256, 512);
  ctx.moveTo(0, 256); ctx.lineTo(512, 256);
  ctx.stroke();

  // Bisel de luz
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(258, 0); ctx.lineTo(258, 512);
  ctx.moveTo(0, 258); ctx.lineTo(512, 258);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

function createCorrugatedPBRTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 256, 256);

  for (let x = 0; x < 256; x += 16) {
    const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0.0, 'rgba(15, 23, 42, 0.85)');
    grad.addColorStop(0.3, 'rgba(51, 65, 85, 0.35)');
    grad.addColorStop(0.7, 'rgba(148, 163, 184, 0.20)');
    grad.addColorStop(1.0, 'rgba(15, 23, 42, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 16, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 4);
  return tex;
}

function createLawnPBRTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, 0, 256, 256);

  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 36;
    data[i] = Math.min(255, Math.max(0, data[i] + noise * 0.7));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 1.2));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.4));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  return tex;
}

function generateProceduralEnvironmentMap(rendererInstance) {
  if (!rendererInstance || typeof THREE.PMREMGenerator === 'undefined') return null;
  try {
    const pmremGenerator = new THREE.PMREMGenerator(rendererInstance);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xdbeafe);

    const skyMesh = createSkyDome();
    skyMesh.scale.setScalar(0.2);
    envScene.add(skyMesh);

    const sun = new THREE.DirectionalLight(0xfffaed, 3.2);
    sun.position.set(80, 160, 60);
    envScene.add(sun);

    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.2);
    envScene.add(hemi);

    const renderTarget = pmremGenerator.fromScene(envScene, 0.04);
    pmremGenerator.dispose();
    return renderTarget.texture;
  } catch (err) {
    console.warn("IBL Environment generator error:", err);
    return null;
  }
}

function setupPostprocessing(container) {
  if (!window.THREE || typeof THREE.EffectComposer === 'undefined') {
    return;
  }
  const width = (container && container.clientWidth > 0) ? container.clientWidth : window.innerWidth;
  const height = (container && container.clientHeight > 0) ? container.clientHeight : Math.max(300, window.innerHeight - 64);

  try {
    composer = new THREE.EffectComposer(renderer);
    renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    if (typeof THREE.UnrealBloomPass !== 'undefined') {
      bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.32, // strength
        0.35, // radius
        0.85  // threshold
      );
      composer.addPass(bloomPass);
    }

    if (typeof THREE.ShaderPass !== 'undefined' && typeof THREE.FXAAShader !== 'undefined') {
      fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
      const pixelRatio = renderer.getPixelRatio();
      fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
      fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
      composer.addPass(fxaaPass);
    }
  } catch (e) {
    console.warn("Postprocessing initialization error, falling back to direct render:", e);
    composer = null;
  }
}

// Setup Three.js Scene, Camera & Lights
function initThree() {
  const container = document.getElementById('canvas-container');
  const width = (container && container.clientWidth > 0) ? container.clientWidth : window.innerWidth;
  const height = (container && container.clientHeight > 0) ? container.clientHeight : Math.max(300, window.innerHeight - 64);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e17);
  scene.fog = new THREE.FogExp2(0x0a0e17, 0.003);

  // Procedural Sky Dome
  plantSkyDome = createSkyDome();
  plantSkyDome.visible = false;
  scene.add(plantSkyDome);

  // Camera
  camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
  camera.position.set(180, 140, 260);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 + 0.05;
  controls.minDistance = 80;
  controls.maxDistance = 500;
  controls.target.set(0, 40, 0);

  // Lighting
  setupLights();

  // Entorno IBL Fotorrealista y Post-Processing Bloom/FXAA
  try {
    pbrEnvMap = generateProceduralEnvironmentMap(renderer);
    if (pbrEnvMap) scene.environment = pbrEnvMap;
  } catch (e) {
    console.warn("PBR Environment map fallback:", e);
  }
  setupPostprocessing(container);

  // Raycaster & Mouse
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Resize Listener
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onCanvasClick);
}

// Lighting Setup with Dynamic Weather Support
// =====================================================================
// TEXTURAS PROCEDURALES CANVAS DE ALTA RESOLUCIÓN PARA CAD 3D
// =====================================================================

function createSolarCellTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Silicio monocristalino azul noche fotovoltaico
  ctx.fillStyle = '#071526';
  ctx.fillRect(0, 0, 512, 512);

  // Rejilla de celdas
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 3;
  const cellSize = 128;
  for (let x = 0; x <= 512; x += cellSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  for (let y = 0; y <= 512; y += cellSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }

  // 4 Busbars principales de plata (Silver Busbars)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 5;
  [64, 192, 320, 448].forEach(pos => {
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, 512); ctx.stroke();
  });

  // Micro-conductores de alta densidad (Fingers)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 1;
  for (let y = 6; y < 512; y += 10) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createOLEDTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Fondo OLED negro profundo
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, 512, 256);

  // Marco perimetral cian
  ctx.strokeStyle = '#0d9488';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 244);

  // Encabezado
  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 28px "JetBrains Mono", monospace';
  ctx.fillText('OTech AirNet OS v2.4', 24, 46);

  // Línea divisoria
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(24, 58); ctx.lineTo(488, 58); ctx.stroke();

  // Métricas ambientales
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.fillText('PM2.5: 14.8 µg/m³', 24, 104);
  ctx.fillText('PM10 : 28.4 µg/m³', 24, 142);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillText('HR: 68.2%  |  T: 18.4°C', 24, 180);

  // Footer status bar
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 21px "JetBrains Mono", monospace';
  ctx.fillText('● LoRaWAN OK  |  BAT: 98% [⚡]', 24, 226);

  // Widget AQI lateral
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 36px "JetBrains Mono", monospace';
  ctx.fillText('AQI: 42', 330, 115);
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillText('[ BUENO ]', 335, 145);

  const texture = new THREE.CanvasTexture(canvas);
  window.oledCanvasTexture = texture;
  return texture;
}

function createBadgeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Fondo aluminio anodizado cepillado
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 248);

  // Texto grabado láser
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 28px "JetBrains Mono", monospace';
  ctx.fillText('OTech AirNet S.A.S.', 20, 44);

  ctx.font = '17px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Model: AirNet-Outdoor-v2.4 | IP65', 20, 78);
  ctx.fillText('Serial: SN-2026-CO-08819', 20, 108);
  ctx.fillText('UUID: ATECC608A-8a7c-44f2', 20, 138);
  ctx.fillText('BOM Lot: #2026-B3 | Bogotá D.C.', 20, 168);
  ctx.fillText('Sensors: SPS30 + BME680 + SCD41', 20, 198);

  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText('CE  RoHS  IP65  [NEMA 4X]', 20, 234);

  // QR Code estilizado en esquina derecha
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(380, 20, 110, 110);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(390, 30, 90, 90);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(405, 45, 25, 25);
  ctx.fillRect(445, 45, 25, 25);
  ctx.fillRect(405, 85, 25, 25);
  ctx.fillRect(440, 80, 15, 15);
  ctx.fillRect(460, 95, 15, 15);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Lighting Setup with Dynamic Weather & Cinematic Studio Rim Light

// =========================================================================
// GENERADORES DE TEXTURAS CANVAS PARA SEÑALIZACIÓN 3D Y GAFETES
// =========================================================================

function createSignBadgeTexture(title, subtitle, colorHex, isWarning = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Fondo degradado industrial oscuro de alto contraste y profundidad
  const grad = ctx.createLinearGradient(0, 0, 1024, 256);
  grad.addColorStop(0, '#090d16');
  grad.addColorStop(0.5, '#0f172a');
  grad.addColorStop(1, '#090d16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  // Marco luminoso con brillo
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 1012, 244);

  // Esquinas reforzadas
  ctx.fillStyle = colorHex;
  ctx.fillRect(6, 6, 28, 28);
  ctx.fillRect(1024 - 34, 6, 28, 28);
  ctx.fillRect(6, 256 - 34, 28, 28);
  ctx.fillRect(1024 - 34, 256 - 34, 28, 28);

  // Franja decorativa lateral izquierda
  ctx.fillRect(14, 14, 20, 228);

  // Franja de advertencia si aplica
  if (isWarning) {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(1024 - 34, 14, 20, 228);
  }

  // Encabezado corporativo
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 24px "JetBrains Mono", "Segoe UI", Arial, sans-serif';
  ctx.fillText('🏢 OTech AirNet S.A.S. • SISTEMA OPERATIVO CORPORATIVO', 50, 52);

  // Título principal con sombra sutil para legibilidad impecable
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px "JetBrains Mono", "Segoe UI", Arial, sans-serif';
  ctx.fillText(title, 50, 128);

  // Subtítulo técnico
  ctx.fillStyle = colorHex;
  ctx.font = 'bold 30px "JetBrains Mono", "Segoe UI", Arial, monospace';
  ctx.fillText(subtitle, 50, 196);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Helper: Panel de Señalización Luminosa Doble Cara con Marco y Varillas de Acero
function createSignPanel(width, height, texture, facingZ = 1) {
  const panelGroup = new THREE.Group();

  // Marco perimetral de acero grafito oscuro
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.25
  });
  const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, height + 0.4, 0.4), frameMat);
  panelGroup.add(frameMesh);

  // Material auto-iluminado con emisivo (glowing signage)
  const signMat = new THREE.MeshStandardMaterial({
    map: texture,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.1
  });

  // Cara Frontal (Hacia el pasillo / observador)
  const frontPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), signMat);
  frontPlane.position.set(0, 0, 0.22);
  panelGroup.add(frontPlane);

  // Cara Posterior (Para visibilidad bidireccional)
  const backPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), signMat);
  backPlane.rotation.y = Math.PI;
  backPlane.position.set(0, 0, -0.22);
  panelGroup.add(backPlane);

  // Tirantes de suspensión de acero hacia la losa/estructura
  for (let sx of [-width * 0.4, width * 0.4]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.5, 8), frameMat);
    rod.position.set(sx, height * 0.5 + 1.75, 0);
    panelGroup.add(rod);
  }

  if (facingZ === -1) {
    panelGroup.rotation.y = Math.PI;
  }

  return panelGroup;
}

function createPTARBannerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Fondo grafito oscuro
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 1280, 256);

  // Franja superior verde esmeralda OTech
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 0, 1280, 24);

  // Marco perimetral cian
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 1272, 248);

  // Franja inferior de seguridad a rayas amarillas y negras
  const stripeW = 28;
  for (let s = 0; s < 1280; s += stripeW * 2) {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(s, 232, stripeW, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(s + stripeW, 232, stripeW, 20);
  }

  // Encabezado institucional
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 30px "JetBrains Mono", Arial, sans-serif';
  ctx.fillText('OTech AirNet S.A.S. • SISTEMA DE GESTIÓN AMBIENTAL', 45, 76);

  // Título principal de la PTAR
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "JetBrains Mono", Arial, sans-serif';
  ctx.fillText('PLANTA DE TRATAMIENTO DE AGUAS RESIDUALES (PTAR)', 45, 142);

  // Subtítulo técnico
  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 28px "JetBrains Mono", Arial, monospace';
  ctx.fillText('RECIRCULACIÓN INDUSTRIAL • FILTRADO & RED CONTRA INCENDIOS', 45, 196);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createTankLabelTexture(labelCode, capacity) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "JetBrains Mono", sans-serif';
  ctx.fillText(labelCode, 24, 55);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillText(capacity, 24, 95);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}


function setupLights() {
  ambientLight = new THREE.AmbientLight(0xddeeff, 0.65);
  scene.add(ambientLight);

  hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.65);
  hemiLight.position.set(0, 220, 0);
  scene.add(hemiLight);

  // Key Light (Luz Solar con Sombras Suaves Optimizadas de Alta Definición y Frustum Ajustado)
  dirLight = new THREE.DirectionalLight(0xfffaed, 1.45);
  dirLight.position.set(130, 210, 110);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 480;
  dirLight.shadow.camera.left = -180;
  dirLight.shadow.camera.right = 180;
  dirLight.shadow.camera.top = 180;
  dirLight.shadow.camera.bottom = -180;
  dirLight.shadow.bias = -0.0004;
  dirLight.shadow.normalBias = 0.04;
  scene.add(dirLight);

  // Studio Rim Light (Luz de Contorno Cian / Perfilado de Aristas de Producto)
  const rimLight = new THREE.DirectionalLight(0x14b8a6, 2.0);
  rimLight.position.set(-160, 170, -140);
  scene.add(rimLight);
  window.rimLight = rimLight;

  // Fill Light Inferior (Ilumina suavemente los louvers de la cámara Stevenson)
  const bounceLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
  bounceLight.position.set(0, -90, 70);
  scene.add(bounceLight);
  window.bounceLight = bounceLight;

  // LED Ring Status Glow Light
  ledRingLight = new THREE.PointLight(0x0ea5e9, 1.6, 90);
  ledRingLight.position.set(0, 75, 0);
  scene.add(ledRingLight);
}

// Build the Procedural 3D CAD Model (Grado Industrial IP65)
function buildStation3D() {
  modelRoot = new THREE.Group();
  scene.add(modelRoot);

  // ----------------------------------------------------
  // MATERIALES FOTORREALISTAS (MeshPhysicalMaterial)
  // ----------------------------------------------------
  materialsMap.asaPlastic = new THREE.MeshPhysicalMaterial({
    color: 0xf1f5f9,
    roughness: 0.28,
    metalness: 0.04,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
    reflectivity: 0.6
  });

  materialsMap.darkAsa = new THREE.MeshPhysicalMaterial({
    color: 0x111827,
    roughness: 0.35,
    metalness: 0.12,
    clearcoat: 0.2,
    clearcoatRoughness: 0.3
  });

  const solarTexture = createSolarCellTexture();
  materialsMap.solarGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1e3a8a,
    map: solarTexture,
    roughness: 0.04,
    metalness: 0.85,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 0.95
  });

  materialsMap.stainlessSteel = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.18,
    metalness: 0.92
  });

  materialsMap.anodizedAlu = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.24,
    metalness: 0.86
  });

  materialsMap.goldContacts = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.2,
    metalness: 0.95
  });

  const oledTexture = createOLEDTexture();
  materialsMap.oledScreen = new THREE.MeshBasicMaterial({
    map: oledTexture
  });

  materialsMap.glassCover = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.05,
    transmission: 0.9,
    ior: 1.5,
    clearcoat: 1.0
  });

  materialsMap.meshScreen = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.4,
    metalness: 0.8,
    transparent: true,
    opacity: 0.65,
    wireframe: true
  });

  materialsMap.brass = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.28,
    metalness: 0.85
  });

  materialsMap.pcbGreen = new THREE.MeshStandardMaterial({
    color: 0x064e3b,
    roughness: 0.3,
    metalness: 0.25
  });

  materialsMap.sensorAlu = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.88
  });

  materialsMap.ledRing = new THREE.MeshBasicMaterial({
    color: 0x0ea5e9
  });

  materialsMap.batteryBlue = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.25,
    metalness: 0.45
  });

  materialsMap.oRingRubber = new THREE.MeshStandardMaterial({
    color: 0x030712,
    roughness: 0.95,
    metalness: 0.0
  });

  materialsMap.copperWire = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.35,
    metalness: 0.9
  });

  materialsMap.redWire = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.4,
    metalness: 0.1
  });

  materialsMap.blackWire = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.4,
    metalness: 0.1
  });

  const badgeTexture = createBadgeTexture();
  materialsMap.badgeMaterial = new THREE.MeshStandardMaterial({
    map: badgeTexture,
    roughness: 0.3,
    metalness: 0.7
  });

  // ----------------------------------------------------
  // 1. TOP HOOD & SOLAR MODULE (CÚPULA SOLAR CON BISEL)
  // ----------------------------------------------------
  hoodGroup = new THREE.Group();
  hoodGroup.userData = { id: 'hood', basePos: new THREE.Vector3(0, 115, 0) };
  hoodGroup.position.copy(hoodGroup.userData.basePos);

  // Inclinación aerodinámica de 12 grados
  const solarTilt = new THREE.Group();
  solarTilt.rotation.x = THREE.MathUtils.degToRad(12);

  // Domo superior troncocónico moldeado
  const hoodGeom = new THREE.CylinderGeometry(68, 62, 12, 64);
  const hoodMesh = new THREE.Mesh(hoodGeom, materialsMap.darkAsa);
  hoodMesh.castShadow = true;
  hoodMesh.receiveShadow = true;
  solarTilt.add(hoodMesh);

  // Bisel de aluminio anodizado perimetral CNC
  const bezelGeom = new THREE.TorusGeometry(67.5, 2.2, 16, 64);
  const bezelMesh = new THREE.Mesh(bezelGeom, materialsMap.anodizedAlu);
  bezelMesh.rotation.x = Math.PI / 2;
  bezelMesh.position.y = 5.8;
  solarTilt.add(bezelMesh);

  // Módulo de Celda Solar Monocristalina de Silicio
  const solarGeom = new THREE.BoxGeometry(78, 3.2, 78);
  const solarMesh = new THREE.Mesh(solarGeom, materialsMap.solarGlass);
  solarMesh.position.y = 6.2;
  solarMesh.castShadow = true;
  solarTilt.add(solarMesh);

  // 8 Tornillos Torx de Acero Inoxidable perimetrales
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const screwGeom = new THREE.CylinderGeometry(2.0, 2.0, 2.5, 16);
    const screwMesh = new THREE.Mesh(screwGeom, materialsMap.stainlessSteel);
    screwMesh.position.set(Math.cos(angle) * 58, 6.2, Math.sin(angle) * 58);
    solarTilt.add(screwMesh);
  }

  // Antena Stubby LoRaWAN / 4G (US915 / 868 MHz) en la parte superior
  const antBaseGeom = new THREE.CylinderGeometry(4.5, 4.5, 5, 16);
  const antBaseMesh = new THREE.Mesh(antBaseGeom, materialsMap.goldContacts);
  antBaseMesh.position.set(0, 8, -28);
  solarTilt.add(antBaseMesh);

  const antWhipGeom = new THREE.CylinderGeometry(2.8, 3.8, 38, 16);
  const antWhipMesh = new THREE.Mesh(antWhipGeom, materialsMap.darkAsa);
  antWhipMesh.position.set(0, 27, -28);
  solarTilt.add(antWhipMesh);

  const antTipGeom = new THREE.SphereGeometry(2.8, 16, 16);
  const antTipMesh = new THREE.Mesh(antTipGeom, materialsMap.darkAsa);
  antTipMesh.position.set(0, 46, -28);
  solarTilt.add(antTipMesh);

  // Válvula de Compensación ePTFE Gore-Tex IP68 (Respiradero Hidrofóbico)
  const ventHexGeom = new THREE.CylinderGeometry(5, 5, 4, 6);
  const ventHexMesh = new THREE.Mesh(ventHexGeom, materialsMap.stainlessSteel);
  ventHexMesh.position.set(28, 7.5, -20);
  solarTilt.add(ventHexMesh);

  const ventCapGeom = new THREE.CylinderGeometry(3.5, 3.5, 2, 16);
  const ventCapMesh = new THREE.Mesh(ventCapGeom, materialsMap.darkAsa);
  ventCapMesh.position.set(28, 9.5, -20);
  solarTilt.add(ventCapMesh);

  // Fotodiodo / Sensor UV miniatura
  const uvLenseGeom = new THREE.SphereGeometry(2.2, 16, 16);
  const uvLenseMesh = new THREE.Mesh(uvLenseGeom, materialsMap.glassCover);
  uvLenseMesh.position.set(-28, 8, -20);
  solarTilt.add(uvLenseMesh);

  hoodGroup.add(solarTilt);

  // Collarín Inferior con Ranura Machihembrada de Doble Ajuste
  const collarGeom = new THREE.CylinderGeometry(51.8, 51.8, 16, 64);
  const collarMesh = new THREE.Mesh(collarGeom, materialsMap.darkAsa);
  collarMesh.position.y = -8;
  collarMesh.castShadow = true;
  hoodGroup.add(collarMesh);

  // Doble Junta Tórica EPDM (Estanqueidad IP65 Certificada)
  for (let r = 0; r < 2; r++) {
    const oringGeom = new THREE.TorusGeometry(51.6, 1.8, 16, 64);
    const oringMesh = new THREE.Mesh(oringGeom, materialsMap.oRingRubber);
    oringMesh.rotation.x = Math.PI / 2;
    oringMesh.position.y = -6 - r * 5;
    hoodGroup.add(oringMesh);
  }

  modelRoot.add(hoodGroup);

  // ----------------------------------------------------
  // 2. MAIN SEALED ENCLOSURE (IP65) CON DISPLAY OLED
  // ----------------------------------------------------
  enclosureGroup = new THREE.Group();
  enclosureGroup.userData = { id: 'enclosure', basePos: new THREE.Vector3(0, 60, 0) };
  enclosureGroup.position.copy(enclosureGroup.userData.basePos);

  // Cuerpo Cilíndrico Principal de Plástico Técnico ASA
  const encGeom = new THREE.CylinderGeometry(52, 52, 80, 64, 1, true);
  const encMesh = new THREE.Mesh(encGeom, materialsMap.asaPlastic);
  encMesh.castShadow = true;
  encMesh.receiveShadow = true;
  enclosureGroup.add(encMesh);

  // Bridas Superior e Inferior Maquinadas
  const flangeGeom = new THREE.CylinderGeometry(56, 56, 6, 64);
  const topFlange = new THREE.Mesh(flangeGeom, materialsMap.darkAsa);
  topFlange.position.y = 38;
  const btmFlange = new THREE.Mesh(flangeGeom, materialsMap.darkAsa);
  btmFlange.position.y = -38;
  enclosureGroup.add(topFlange);
  enclosureGroup.add(btmFlange);

  // Ventana Frontal con Display OLED Integrado en Vivo
  const oledFrameGeom = new THREE.BoxGeometry(32, 18, 4);
  const oledFrameMesh = new THREE.Mesh(oledFrameGeom, materialsMap.darkAsa);
  oledFrameMesh.position.set(0, 14, 51.5);
  enclosureGroup.add(oledFrameMesh);

  const oledScreenGeom = new THREE.PlaneGeometry(28, 14);
  const oledScreenMesh = new THREE.Mesh(oledScreenGeom, materialsMap.oledScreen);
  oledScreenMesh.position.set(0, 14, 53.6);
  enclosureGroup.add(oledScreenMesh);

  // Cristal de Protección Templado Biselado
  const glassGeom = new THREE.BoxGeometry(30, 16, 1.5);
  const glassMesh = new THREE.Mesh(glassGeom, materialsMap.glassCover);
  glassMesh.position.set(0, 14, 54.4);
  enclosureGroup.add(glassMesh);

  // Anillo LED RGB Difusor 360° (Status Ring Luminoso)
  const ledRingGeom = new THREE.TorusGeometry(53, 2.4, 16, 64);
  const ledRingMesh = new THREE.Mesh(ledRingGeom, materialsMap.ledRing);
  ledRingMesh.rotation.x = Math.PI / 2;
  ledRingMesh.position.y = 2;
  enclosureGroup.add(ledRingMesh);

  // 2x Cierres Rápidos Tipo Quick-Latch (Pestillos de Acero Inox para Hot-Swap)
  for (let latch = 0; latch < 2; latch++) {
    const yLatch = -14 + latch * 24;
    // Base fijada al gabinete (lado derecho)
    const latchBase = new THREE.BoxGeometry(4, 10, 8);
    const latchBaseMesh = new THREE.Mesh(latchBase, materialsMap.stainlessSteel);
    latchBaseMesh.position.set(52.5, yLatch, 0);
    enclosureGroup.add(latchBaseMesh);

    // Palanca de tiro basculante
    const latchLever = new THREE.BoxGeometry(3, 14, 6);
    const latchLeverMesh = new THREE.Mesh(latchLever, materialsMap.stainlessSteel);
    latchLeverMesh.position.set(54.5, yLatch, 0);
    enclosureGroup.add(latchLeverMesh);

    // Bisagras industriales de acero inoxidable en el lado opuesto (izquierdo)
    const hingeGeom = new THREE.CylinderGeometry(3.5, 3.5, 12, 16);
    const hingeMesh = new THREE.Mesh(hingeGeom, materialsMap.stainlessSteel);
    hingeMesh.position.set(-52.5, yLatch, 0);
    enclosureGroup.add(hingeMesh);
  }

  // Prensaestopas PG9 de Latón Niquelado con Alivio de Curvatura
  const glandBase = new THREE.CylinderGeometry(7, 7, 14, 6);
  const glandNut = new THREE.CylinderGeometry(9, 9, 8, 6);
  const glandMesh1 = new THREE.Mesh(glandBase, materialsMap.brass);
  const glandMesh2 = new THREE.Mesh(glandNut, materialsMap.darkAsa);
  glandMesh1.rotation.z = Math.PI / 2;
  glandMesh2.rotation.z = Math.PI / 2;
  glandMesh1.position.set(48, -24, 20);
  glandMesh2.position.set(56, -24, 20);
  enclosureGroup.add(glandMesh1);
  enclosureGroup.add(glandMesh2);

  // Conector Circular de Aviación Estanco M12 (5 Pines para Sensores Externos)
  const m12Geom = new THREE.CylinderGeometry(6, 6, 12, 16);
  const m12Mesh = new THREE.Mesh(m12Geom, materialsMap.anodizedAlu);
  m12Mesh.rotation.z = Math.PI / 2;
  m12Mesh.position.set(48, -24, -20);
  enclosureGroup.add(m12Mesh);

  // Placa de Identificación Metrológica Grabada por Láser (Cara Posterior)
  const badgeGeom = new THREE.BoxGeometry(2, 22, 44);
  const badgeMesh = new THREE.Mesh(badgeGeom, materialsMap.badgeMaterial);
  badgeMesh.position.set(0, -10, -52.5);
  enclosureGroup.add(badgeMesh);

  modelRoot.add(enclosureGroup);

  // ----------------------------------------------------
  // 3. INTERNAL SENSOR CHASSIS (HOT-SWAP TRAY)
  // ----------------------------------------------------
  chassisGroup = new THREE.Group();
  chassisGroup.userData = { id: 'chassis', basePos: new THREE.Vector3(0, 60, 0) };
  chassisGroup.position.copy(chassisGroup.userData.basePos);

  // Placa Backbone de Aluminio Anodizado Maquinado
  const pcbBackGeom = new THREE.BoxGeometry(4, 72, 76);
  const pcbBackMesh = new THREE.Mesh(pcbBackGeom, materialsMap.sensorAlu);
  pcbBackMesh.castShadow = true;
  chassisGroup.add(pcbBackMesh);

  // Asa / Tirador Ergonómico Frontal para Extracción Rápida (< 2 minutos)
  const handleBarGeom = new THREE.TorusGeometry(12, 2.5, 12, 24, Math.PI);
  const handleBarMesh = new THREE.Mesh(handleBarGeom, materialsMap.anodizedAlu);
  handleBarMesh.rotation.z = -Math.PI / 2;
  handleBarMesh.position.set(4, 26, 40);
  chassisGroup.add(handleBarMesh);

  // Rieles Guía de Precisión Laterales (Encajan en el Gabinete)
  for (let r = 0; r < 2; r++) {
    const railGeom = new THREE.BoxGeometry(3, 4, 78);
    const railMesh = new THREE.Mesh(railGeom, materialsMap.anodizedAlu);
    railMesh.position.set(0, (r === 0 ? 32 : -32), 0);
    chassisGroup.add(railMesh);
  }

  // Conector de Peine de 12 Pines Pogo-Pin Bañados en Oro (Base Trasera)
  const pogoBlockGeom = new THREE.BoxGeometry(6, 12, 34);
  const pogoBlockMesh = new THREE.Mesh(pogoBlockGeom, materialsMap.darkAsa);
  pogoBlockMesh.position.set(0, -32, -32);
  chassisGroup.add(pogoBlockMesh);

  for (let p = 0; p < 12; p++) {
    const pinGeom = new THREE.CylinderGeometry(0.9, 0.9, 5, 8);
    const pinMesh = new THREE.Mesh(pinGeom, materialsMap.goldContacts);
    pinMesh.rotation.x = Math.PI / 2;
    pinMesh.position.set(-1.5 + (p % 2) * 3, -32, -44 + Math.floor(p / 2) * 4.5);
    chassisGroup.add(pinMesh);
  }

  // Tarjeta PCB Principal (ESP32-S3 + LoRa Core)
  const pcbGeom = new THREE.BoxGeometry(1.8, 66, 72);
  const pcbMesh = new THREE.Mesh(pcbGeom, materialsMap.pcbGreen);
  pcbMesh.position.x = 3.6;
  chassisGroup.add(pcbMesh);

  // Shield de Radiofrecuencia ESP32-S3 WROOM con Serigrafía Láser
  const espGeom = new THREE.BoxGeometry(4, 18, 26);
  const espMesh = new THREE.Mesh(espGeom, materialsMap.sensorAlu);
  espMesh.position.set(6, 18, -14);
  chassisGroup.add(espMesh);

  // Cripto-Chip de Seguridad ATECC608A (mTLS Hardware Key)
  const ateccGeom = new THREE.BoxGeometry(2.5, 6, 8);
  const ateccMesh = new THREE.Mesh(ateccGeom, materialsMap.darkAsa);
  ateccMesh.position.set(5.5, 26, -14);
  chassisGroup.add(ateccMesh);

  // Sensor Sensirion SPS30 con Turbina de Ventilación Interna
  const spsGeom = new THREE.BoxGeometry(14, 40, 40);
  const spsMesh = new THREE.Mesh(spsGeom, materialsMap.sensorAlu);
  spsMesh.position.set(10, -12, -12);
  spsMesh.castShadow = true;
  chassisGroup.add(spsMesh);

  // Toberas de Admisión y Escape del SPS30
  const nozzleGeom = new THREE.CylinderGeometry(4.0, 4.0, 9, 16);
  const nozzleMesh1 = new THREE.Mesh(nozzleGeom, materialsMap.darkAsa);
  const nozzleMesh2 = new THREE.Mesh(nozzleGeom, materialsMap.darkAsa);
  nozzleMesh1.rotation.z = Math.PI / 2;
  nozzleMesh2.rotation.z = Math.PI / 2;
  nozzleMesh1.position.set(18.5, -20, -22);
  nozzleMesh2.position.set(18.5, -20, -2);
  chassisGroup.add(nozzleMesh1);
  chassisGroup.add(nozzleMesh2);

  // Turbina de Ventilación Centrífuga Activa en la Tobera
  const fanGroup = new THREE.Group();
  fanGroup.position.set(22, -20, -22);
  for (let b = 0; b < 5; b++) {
    const bladeGeom = new THREE.BoxGeometry(0.8, 3.2, 1.5);
    const bladeMesh = new THREE.Mesh(bladeGeom, materialsMap.darkAsa);
    bladeMesh.rotation.x = (b * Math.PI * 2) / 5;
    fanGroup.add(bladeMesh);
  }
  chassisGroup.add(fanGroup);
  window.spsFanMesh = fanGroup;

  // Sensor NDIR de CO2 (SCD41 / Senseair) con Cámara Dorada Reflectante
  const ndirBaseGeom = new THREE.BoxGeometry(10, 16, 20);
  const ndirBaseMesh = new THREE.Mesh(ndirBaseGeom, materialsMap.darkAsa);
  ndirBaseMesh.position.set(8, -12, 20);
  chassisGroup.add(ndirBaseMesh);

  const ndirChamberGeom = new THREE.CylinderGeometry(5.5, 5.5, 14, 24);
  const ndirChamberMesh = new THREE.Mesh(ndirChamberGeom, materialsMap.goldContacts);
  ndirChamberMesh.rotation.z = Math.PI / 2;
  ndirChamberMesh.position.set(11, -12, 20);
  chassisGroup.add(ndirChamberMesh);

  // Sensor Bosch BME680 (Temp, Humedad, Presión, VOC)
  const bmeGeom = new THREE.BoxGeometry(3, 10, 12);
  const bmeMesh = new THREE.Mesh(bmeGeom, materialsMap.sensorAlu);
  bmeMesh.position.set(6, 18, 18);
  chassisGroup.add(bmeMesh);

  // Pack Dual de Baterías LiFePO4 32650 (6000 mAh c/u - Autonomía 72h)
  for (let c = 0; c < 2; c++) {
    const zOffset = -2 + c * 24;
    const battGeom = new THREE.CylinderGeometry(14.5, 14.5, 66, 32);
    const battMesh = new THREE.Mesh(battGeom, materialsMap.batteryBlue);
    battMesh.position.set(-18, 0, zOffset);
    battMesh.castShadow = true;
    chassisGroup.add(battMesh);

    // Bornes de Níquel Soldados
    const terminalGeom = new THREE.CylinderGeometry(4.5, 4.5, 3, 16);
    const terminalMesh = new THREE.Mesh(terminalGeom, materialsMap.stainlessSteel);
    terminalMesh.position.set(-18, 34, zOffset);
    chassisGroup.add(terminalMesh);
  }

  // Jaula Ignífuga Soporte de Batería con Placa BMS
  const bmsGeom = new THREE.BoxGeometry(6, 6, 48);
  const bmsMesh = new THREE.Mesh(bmsGeom, materialsMap.darkAsa);
  bmsMesh.position.set(-18, 36, 10);
  chassisGroup.add(bmsMesh);

  // Cables de Silicona Trenzados Rojo (+) y Negro (-)
  const redWireGeom = new THREE.CylinderGeometry(1.2, 1.2, 30, 8);
  const redWireMesh = new THREE.Mesh(redWireGeom, materialsMap.redWire);
  redWireMesh.rotation.z = Math.PI / 4;
  redWireMesh.position.set(-8, 26, 16);
  chassisGroup.add(redWireMesh);

  const blackWireGeom = new THREE.CylinderGeometry(1.2, 1.2, 30, 8);
  const blackWireMesh = new THREE.Mesh(blackWireGeom, materialsMap.blackWire);
  blackWireMesh.rotation.z = Math.PI / 4;
  blackWireMesh.position.set(-8, 24, 6);
  chassisGroup.add(blackWireMesh);

  modelRoot.add(chassisGroup);

  // ----------------------------------------------------
  // 4. STEVENSON INTAKE CHAMBER (PERSIANAS AERODINÁMICAS)
  // ----------------------------------------------------
  stevensonGroup = new THREE.Group();
  stevensonGroup.userData = { id: 'stevenson', basePos: new THREE.Vector3(0, 0, 0) };
  stevensonGroup.position.copy(stevensonGroup.userData.basePos);

  // 6 Anillos Aerodinámicos de Entrada (Perfil Alar Invertido 45°)
  const louverCount = 6;
  for (let i = 0; i < louverCount; i++) {
    const yPos = 6 + i * 8.0;

    // Perfil curvado aerodinámico exterior
    const ringGeom = new THREE.CylinderGeometry(56, 47, 6.5, 64, 1, true);
    const ringMesh = new THREE.Mesh(ringGeom, materialsMap.asaPlastic);
    ringMesh.position.y = yPos;
    ringMesh.castShadow = true;
    ringMesh.receiveShadow = true;
    stevensonGroup.add(ringMesh);

    // 6 Soportes Estructurales Verticales a 60 grados
    for (let a = 0; a < 6; a++) {
      const angle = (a * Math.PI) / 3;
      const ribGeom = new THREE.BoxGeometry(2.0, 6.5, 9);
      const ribMesh = new THREE.Mesh(ribGeom, materialsMap.darkAsa);
      ribMesh.position.set(Math.cos(angle) * 50, yPos, Math.sin(angle) * 50);
      ribMesh.rotation.y = -angle;
      stevensonGroup.add(ribMesh);
    }
  }

  // Malla Cilíndrica Interior de Acero Inoxidable 316 Micronizada
  const meshGeom = new THREE.CylinderGeometry(45.5, 45.5, 50, 48, 1, true);
  const meshMesh = new THREE.Mesh(meshGeom, materialsMap.meshScreen);
  meshMesh.position.y = 26;
  stevensonGroup.add(meshMesh);

  // Deflector Cónico Inferior con Boquilla de Drenaje por Gravedad
  const coneGeom = new THREE.ConeGeometry(46, 16, 48, 1, true);
  const coneMesh = new THREE.Mesh(coneGeom, materialsMap.darkAsa);
  coneMesh.rotation.x = Math.PI;
  coneMesh.position.y = 4;
  stevensonGroup.add(coneMesh);

  // Boquilla de purga / drenaje de condensación
  const drainGeom = new THREE.CylinderGeometry(3.5, 3.5, 8, 16);
  const drainMesh = new THREE.Mesh(drainGeom, materialsMap.darkAsa);
  drainMesh.position.y = -6;
  stevensonGroup.add(drainMesh);

  modelRoot.add(stevensonGroup);

  // ----------------------------------------------------
  // 5. POLE & WALL MOUNT BRACKET REFORZADO
  // ----------------------------------------------------
  bracketGroup = new THREE.Group();
  bracketGroup.userData = { id: 'bracket', basePos: new THREE.Vector3(0, -22, 0) };
  bracketGroup.position.copy(bracketGroup.userData.basePos);

  // Collarín de Encastre Machihembrado a la Base
  const baseCollarGeom = new THREE.CylinderGeometry(52, 52, 16, 64);
  const baseCollarMesh = new THREE.Mesh(baseCollarGeom, materialsMap.darkAsa);
  baseCollarMesh.position.y = 8;
  baseCollarMesh.castShadow = true;
  bracketGroup.add(baseCollarMesh);

  // Brazo Extensor Estructural Reforzado con Nervaduras Triangulares
  const armGeom = new THREE.BoxGeometry(46, 16, 42);
  const armMesh = new THREE.Mesh(armGeom, materialsMap.darkAsa);
  armMesh.position.set(0, 8, -46);
  armMesh.castShadow = true;
  bracketGroup.add(armMesh);

  // 2 Nervaduras de Refuerzo Mecánico (Gussets contra vientos de 120 km/h)
  for (let g = 0; g < 2; g++) {
    const gussetGeom = new THREE.BoxGeometry(4, 28, 30);
    const gussetMesh = new THREE.Mesh(gussetGeom, materialsMap.darkAsa);
    gussetMesh.rotation.x = Math.PI / 4;
    gussetMesh.position.set((g === 0 ? -18 : 18), 0, -42);
    bracketGroup.add(gussetMesh);
  }

  // Mordaza Semicilíndrica de Amarre para Mástil de 2 Pulgadas (50.8 mm)
  const clampGeom = new THREE.CylinderGeometry(32, 32, 24, 48, 1, true, Math.PI * 0.25, Math.PI * 1.5);
  const clampMesh = new THREE.Mesh(clampGeom, materialsMap.darkAsa);
  clampMesh.position.set(0, 8, -70);
  bracketGroup.add(clampMesh);

  // 2 Abrazaderas de Servicio Pesado en Acero Inox con Tornillos Nyloc
  for (let c = 0; c < 2; c++) {
    const yClamp = 2 + c * 12;
    const clampBandGeom = new THREE.TorusGeometry(32.5, 2.2, 12, 48);
    const clampBandMesh = new THREE.Mesh(clampBandGeom, materialsMap.stainlessSteel);
    clampBandMesh.rotation.x = Math.PI / 2;
    clampBandMesh.position.set(0, yClamp, -70);
    bracketGroup.add(clampBandMesh);

    // Pernos Pasantes M8 con Tuercas Autoblocantes
    const screwBox = new THREE.BoxGeometry(8, 7, 10);
    const screwBoxMesh = new THREE.Mesh(screwBox, materialsMap.stainlessSteel);
    screwBoxMesh.position.set(24, yClamp, -48);
    bracketGroup.add(screwBoxMesh);

    const nutHex = new THREE.CylinderGeometry(4, 4, 6, 6);
    const nutHexMesh = new THREE.Mesh(nutHex, materialsMap.stainlessSteel);
    nutHexMesh.rotation.z = Math.PI / 2;
    nutHexMesh.position.set(28, yClamp, -48);
    bracketGroup.add(nutHexMesh);
  }

  // Terminal de Puesta a Tierra para Descargas Atmosféricas
  const groundLugGeom = new THREE.CylinderGeometry(4, 4, 6, 16);
  const groundLugMesh = new THREE.Mesh(groundLugGeom, materialsMap.copperWire);
  groundLugMesh.position.set(-20, 0, -56);
  bracketGroup.add(groundLugMesh);

  // Cable de Tierra Trenzado Amarillo/Verde
  const groundCableGeom = new THREE.CylinderGeometry(2, 2, 80, 12);
  const groundCableMesh = new THREE.Mesh(groundCableGeom, materialsMap.goldContacts);
  groundCableMesh.position.set(-20, -40, -56);
  bracketGroup.add(groundCableMesh);

  modelRoot.add(bracketGroup);

  // ----------------------------------------------------
  // 6. EXTERIOR MAST / POLE (TOGGLEABLE)
  // ----------------------------------------------------
  mastGroup = new THREE.Group();

  // Mástil de Acero Galvanizado de 2 Pulgadas (50.8 mm de diámetro)
  const mastGeom = new THREE.CylinderGeometry(25.4, 25.4, 340, 48);
  const mastMesh = new THREE.Mesh(mastGeom, materialsMap.stainlessSteel);
  mastMesh.position.set(0, 10, -70);
  mastMesh.castShadow = true;
  mastMesh.receiveShadow = true;
  mastGroup.add(mastMesh);

  // Tapa de Extremo Superior del Mástil
  const mastCapGeom = new THREE.SphereGeometry(25.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const mastCapMesh = new THREE.Mesh(mastCapGeom, materialsMap.darkAsa);
  mastCapMesh.position.set(0, 180, -70);
  mastGroup.add(mastCapMesh);

  // Rejilla de Piso de Estudio Fotográfico
  const gridHelper = new THREE.GridHelper(320, 24, 0x14b8a6, 0x1e293b);
  gridHelper.position.set(0, -150, 0);
  mastGroup.add(gridHelper);

  scene.add(mastGroup);
}


// Airflow Dynamics Particle Simulation (Inside Stevenson Screen)
function createAirflowParticles() {
  const particleCount = 200;
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    // Spawn around outer louvers
    const radius = 45 + Math.random() * 20;
    const angle = Math.random() * Math.PI * 2;
    const y = Math.random() * 40;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    velocities.push({
      angle: angle,
      radius: radius,
      speed: 0.15 + Math.random() * 0.25,
      y: y
    });
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 2.5,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });

  airflowParticles = new THREE.Points(geom, mat);
  airflowParticles.userData = { velocities: velocities };
  airflowParticles.visible = false;
  scene.add(airflowParticles);
}

// Rain Precipitation Simulation
function createRainParticles() {
  const rainCount = 450;
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(rainCount * 3);
  const velocities = [];

  for (let i = 0; i < rainCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 250;
    positions[i * 3 + 1] = 80 + Math.random() * 160;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 250;

    velocities.push({
      vy: -(2.5 + Math.random() * 2.0),
      vx: 0.3,
      vz: 0.1
    });
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0x7dd3fc,
    size: 1.8,
    transparent: true,
    opacity: 0.65
  });

  rainParticles = new THREE.Points(geom, mat);
  rainParticles.userData = { velocities: velocities };
  rainParticles.visible = false;
  scene.add(rainParticles);
}

// Technical Dimension Annotations
function createDimensionLines() {
  dimensionLinesGroup = new THREE.Group();
  dimensionLinesGroup.visible = false;

  const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });

  // Height line (Total = 240mm)
  const hPoints = [
    new THREE.Vector3(75, -22, 0),
    new THREE.Vector3(75, 125, 0),
    new THREE.Vector3(70, 125, 0),
    new THREE.Vector3(80, 125, 0),
    new THREE.Vector3(70, -22, 0),
    new THREE.Vector3(80, -22, 0)
  ];
  const hGeom = new THREE.BufferGeometry().setFromPoints(hPoints);
  const hLine = new THREE.LineSegments(hGeom, lineMat);
  dimensionLinesGroup.add(hLine);

  // Diameter line (Ø110mm)
  const dPoints = [
    new THREE.Vector3(-55, 60, 65),
    new THREE.Vector3(55, 60, 65),
    new THREE.Vector3(-55, 55, 65),
    new THREE.Vector3(-55, 65, 65),
    new THREE.Vector3(55, 55, 65),
    new THREE.Vector3(55, 65, 65)
  ];
  const dGeom = new THREE.BufferGeometry().setFromPoints(dPoints);
  const dLine = new THREE.LineSegments(dGeom, lineMat);
  dimensionLinesGroup.add(dLine);

  scene.add(dimensionLinesGroup);
}

// Exploded View Transition Logic
function applyExplodedPositions(factor) {
  if (!hoodGroup) return;

  // 1. Cúpula superior sube suavemente
  hoodGroup.position.y = hoodGroup.userData.basePos.y + factor * 76;

  // 2. Gabinete principal se eleva
  enclosureGroup.position.y = enclosureGroup.userData.basePos.y + factor * 38;

  // 3. Bandeja Hot-Swap se desliza hacia afuera en rieles telescópicos para inspección
  chassisGroup.position.y = chassisGroup.userData.basePos.y + factor * 38;
  chassisGroup.position.x = factor * 48;
  chassisGroup.position.z = factor * 32;

  // 4. Cámara Stevenson desciende
  stevensonGroup.position.y = stevensonGroup.userData.basePos.y - factor * 34;

  // 5. Soporte y mástil descienden para desacoplar el conjunto
  bracketGroup.position.y = bracketGroup.userData.basePos.y - factor * 68;
}

function updateExplodedView(progress) {
  state.targetExplodedProgress = progress;
  state.explodedProgress = progress;
  const valEl = document.getElementById('exploded-val');
  if (valEl) valEl.innerText = `${Math.round(progress * 100)}%`;
  applyExplodedPositions(progress);
}

// X-Ray / Cross-Section Mode Toggle
function toggleXRay(enabled) {
  state.isXRay = enabled;
  const btn = document.getElementById('btn-toggle-xray');
  btn.classList.toggle('active', enabled);

  if (enabled) {
    materialsMap.asaPlastic.transparent = true;
    materialsMap.asaPlastic.opacity = 0.22;
    materialsMap.asaPlastic.wireframe = true;

    materialsMap.darkAsa.transparent = true;
    materialsMap.darkAsa.opacity = 0.3;

    airflowParticles.visible = true;
  } else {
    materialsMap.asaPlastic.transparent = false;
    materialsMap.asaPlastic.opacity = 1.0;
    materialsMap.asaPlastic.wireframe = false;

    materialsMap.darkAsa.transparent = false;
    materialsMap.darkAsa.opacity = 1.0;

    airflowParticles.visible = false;
  }
}

// Weather Simulation Switcher
function setWeather(mode) {
  state.currentWeather = mode;
  document.querySelectorAll('.weather-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.weather === mode);
  });

  if (mode === 'sun') {
    scene.background.set(0x0a0e17);
    dirLight.color.set(0xfffaed);
    dirLight.intensity = 1.5;
    ambientLight.color.set(0xddeeff);
    ambientLight.intensity = 0.7;
    rainParticles.visible = false;
    materialsMap.ledRing.color.set(0x0ea5e9);
    ledRingLight.color.set(0x0ea5e9);
  } else if (mode === 'rain') {
    scene.background.set(0x0f172a);
    dirLight.color.set(0x94a3b8);
    dirLight.intensity = 0.8;
    ambientLight.color.set(0x64748b);
    ambientLight.intensity = 0.5;
    rainParticles.visible = true;
    materialsMap.ledRing.color.set(0x10b981);
    ledRingLight.color.set(0x10b981);
  } else if (mode === 'night') {
    scene.background.set(0x020617);
    dirLight.color.set(0x1e293b);
    dirLight.intensity = 0.3;
    ambientLight.color.set(0x0f172a);
    ambientLight.intensity = 0.25;
    rainParticles.visible = false;
    materialsMap.ledRing.color.set(0x10b981);
    ledRingLight.color.set(0x10b981);
    ledRingLight.intensity = 3.0;
  }
}

// Camera View Presets
function setCameraView(view) {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  const target = new THREE.Vector3(0, 40, 0);
  controls.target.copy(target);

  switch (view) {
    case 'isometric':
      camera.position.set(180, 140, 260);
      break;
    case 'front':
      camera.position.set(0, 40, 320);
      break;
    case 'top':
      camera.position.set(0, 320, 0.1);
      break;
    case 'side':
      camera.position.set(320, 40, 0);
      break;
  }
  controls.update();
}

// Hotspot Inspection Modal Display
function showHotspot(partId) {
  const data = componentData[partId];
  if (!data) return;

  state.selectedComponent = partId;
  const popup = document.getElementById('hotspot-card');
  document.getElementById('hotspot-type').innerText = data.type;
  document.getElementById('hotspot-title').innerText = data.title;
  document.getElementById('hotspot-desc').innerText = data.desc;

  const specsContainer = document.getElementById('hotspot-specs');
  specsContainer.innerHTML = '';
  for (const [key, val] of Object.entries(data.specs)) {
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `<span class="spec-key">${key}:</span><span class="spec-val">${val}</span>`;
    specsContainer.appendChild(row);
  }

  popup.classList.remove('hidden');
}

function hideHotspot() {
  document.getElementById('hotspot-card').classList.add('hidden');
  state.selectedComponent = null;
  state.selectedStation = null;
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}


