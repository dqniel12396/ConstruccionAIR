-- =====================================================================
-- Ecosistema OTech AirNet S.A.S. - Definición DDL de Base de Datos
-- Motor: PostgreSQL 16+ con Extensión TimescaleDB
-- Basado en: OTech_Esquema_Constitucion_Final.pdf y Requisitos SDLC
-- =====================================================================

-- 1. HABILITACIÓN DE EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- 2. TIPOS ENUMERADOS DEL SISTEMA
CREATE TYPE tipo_sector_enum AS ENUM (
    'INDUSTRIAL',
    'CONSTRUCCION',
    'LOGISTICA_TRANSPORTE',
    'INFRAESTRUCTURA_PUBLICA',
    'EDUCATIVO_INVESTIGACION',
    'COMERCIAL'
);

CREATE TYPE estado_dispositivo_enum AS ENUM (
    'OPERATIVO_ONLINE',
    'ADVERTENCIA_MODERADA',
    'ALERTA_CRITICA',
    'EN_MANTENIMIENTO',
    'DESCONECTADO_OFFLINE'
);

CREATE TYPE calidad_dato_enum AS ENUM (
    'RAW',                      -- Lectura cruda original
    'VALIDATED_KAPPA_KOHLER',   -- Corregida por modelo higroscópico (HR > 75%)
    'EXCLUDED_OUTLIER',         -- Descartada por fallo óptico transitorio
    'CALIBRATION_SPAN'          -- Lectura en cámara de prueba
);

CREATE TYPE severidad_alerta_enum AS ENUM (
    'INFORMATIVO',
    'PREVENTIVO',
    'ALERTA_FASE_1',
    'CONTINGENCIA_CRITICA'
);

CREATE TYPE estado_incidente_enum AS ENUM (
    'ABIERTO',
    'RECONOCIDO',
    'EN_MITIGACION',
    'RESUELTO'
);

-- =====================================================================
-- 3. MÓDULO ORGANIZACIONAL Y SEGURIDAD MULTI-TENANT (RBAC)
-- =====================================================================

CREATE TABLE organizaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razon_social VARCHAR(200) NOT NULL,
    nit VARCHAR(50) NOT NULL UNIQUE,
    sector_industrial tipo_sector_enum NOT NULL,
    direccion_fiscal VARCHAR(255),
    ciudad VARCHAR(100) DEFAULT 'Bogotá D.C.',
    contacto_nombre VARCHAR(150),
    contacto_email VARCHAR(150),
    contacto_telefono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sedes_operativas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre_sede VARCHAR(150) NOT NULL,
    latitud NUMERIC(10, 7) NOT NULL,
    longitud NUMERIC(10, 7) NOT NULL,
    altitud_msnm NUMERIC(6, 2) DEFAULT 2600.0,
    clasificacion_zona VARCHAR(100) DEFAULT 'Urbana / Industrial',
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    cargo VARCHAR(100),
    telefono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

INSERT INTO roles (codigo, nombre, descripcion) VALUES
('SUPER_ADMIN_OTECH', 'Super Administrador OTech', 'Control total de plataforma, planta y firmware'),
('ADMIN_EMPRESA', 'Administrador de Organización', 'Gestión de estaciones, alertas y usuarios de su empresa'),
('TECNICO_CAMPO', 'Técnico de Mantenimiento', 'Bitácora técnica, reemplazo Hot-Swap y calibraciones'),
('ANALISTA_AMBIENTAL', 'Analista Ambiental / HSE', 'Acceso a series temporales, analítica y reportes normativos'),
('VISUALIZADOR_PUBLICO', 'Auditor / Visualizador', 'Consultas de solo lectura en mapas y tableros');

CREATE TABLE usuario_roles (
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, rol_id)
);

-- =====================================================================
-- 4. MÓDULO DE HARDWARE IOT Y DISPOSITIVOS DE CAMPO
-- =====================================================================

CREATE TABLE dispositivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_dispositivo VARCHAR(100) NOT NULL UNIQUE,
    uuid_cripto_chip VARCHAR(120) NOT NULL UNIQUE, -- ATECC608A Hardware ID
    modelo_hardware VARCHAR(100) DEFAULT 'OTech-AirNet-Outdoor-v1',
    version_firmware VARCHAR(50) DEFAULT 'OTech-OS-v2.4',
    sede_id UUID NOT NULL REFERENCES sedes_operativas(id) ON DELETE RESTRICT,
    latitud_instalacion NUMERIC(10, 7) NOT NULL,
    longitud_instalacion NUMERIC(10, 7) NOT NULL,
    tipo_soporte VARCHAR(50) DEFAULT 'Mastil / Pared IP65',
    estado_operativo estado_dispositivo_enum DEFAULT 'OPERATIVO_ONLINE',
    nivel_bateria_pct NUMERIC(5, 2) DEFAULT 100.0,
    voltaje_bateria NUMERIC(4, 2) DEFAULT 3.3,
    ultima_conexion_utc TIMESTAMP WITH TIME ZONE,
    proximo_mantenimiento TIMESTAMP WITH TIME ZONE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE config_comunicacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispositivo_id UUID NOT NULL UNIQUE REFERENCES dispositivos(id) ON DELETE CASCADE,
    tipo_tecnologia VARCHAR(50) DEFAULT 'LoRaWAN US915', -- o '4G LTE-M'
    deveui_lorawan VARCHAR(32) UNIQUE,
    appeui_lorawan VARCHAR(32),
    appkey_cifrada TEXT,
    imei_celular VARCHAR(30) UNIQUE,
    intervalo_muestreo_seg INT DEFAULT 60,
    intervalo_envio_seg INT DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensores_instalados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    modelo_sensor VARCHAR(100) NOT NULL,      -- Ej: 'Sensirion SPS30', 'Bosch BME680'
    variable_fisica VARCHAR(50) NOT NULL,     -- Ej: 'PM2_5', 'PM10', 'TEMP', 'HUM', 'CO2'
    serial_fabricante VARCHAR(100),
    fecha_instalacion DATE DEFAULT CURRENT_DATE,
    estado_sensor VARCHAR(50) DEFAULT 'OPERATIVO',
    factor_cero NUMERIC(8, 4) DEFAULT 0.0000,
    factor_span NUMERIC(8, 4) DEFAULT 1.0000,
    r2_calibracion NUMERIC(6, 4) DEFAULT 0.9920,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 5. MÓDULO DE SERIES DE TIEMPO Y TELEMETRÍA (TIMESCALEDB)
-- =====================================================================

CREATE TABLE mediciones_telemetria (
    id BIGSERIAL,
    dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    sensor_id UUID REFERENCES sensores_instalados(id) ON DELETE SET NULL,
    timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    variable_codigo VARCHAR(30) NOT NULL,      -- 'PM2_5', 'PM10', 'TEMP', 'HUM', 'CO2'
    valor_crudo NUMERIC(10, 3) NOT NULL,
    valor_compensado NUMERIC(10, 3) NOT NULL,   -- Con algoritmo Kappa-Köhler si HR > 75%
    unidad_medida VARCHAR(20) NOT NULL,        -- 'ug/m3', 'C', '%', 'ppm'
    humedad_relativa_asoc NUMERIC(5, 2),
    estado_calidad_dato calidad_dato_enum DEFAULT 'VALIDATED_KAPPA_KOHLER',
    flag_validacion VARCHAR(50) DEFAULT 'PASS',
    aqi_calculado INT,
    PRIMARY KEY (id, timestamp_utc)
);

-- Conversión a Hiper-tabla TimescaleDB con particionamiento por tiempo
SELECT create_hypertable('mediciones_telemetria', 'timestamp_utc', chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE);

-- Índices de alto rendimiento para consultas analíticas
CREATE INDEX idx_telemetria_disp_time ON mediciones_telemetria (dispositivo_id, timestamp_utc DESC);
CREATE INDEX idx_telemetria_var_time ON mediciones_telemetria (variable_codigo, timestamp_utc DESC);

-- =====================================================================
-- 6. MÓDULO DE REGLAS DE ALERTA E INCIDENTES
-- =====================================================================

CREATE TABLE reglas_alerta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE CASCADE,
    variable_codigo VARCHAR(30) NOT NULL,
    operador_comparacion VARCHAR(10) DEFAULT '>', -- '>', '>=', '<', '<='
    umbral_limite NUMERIC(10, 3) NOT NULL,
    persistencia_minutos INT DEFAULT 15,
    nivel_severidad severidad_alerta_enum DEFAULT 'PREVENTIVO',
    canales_notificacion VARCHAR(150) DEFAULT 'EMAIL,DASHBOARD,SMS',
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incidentes_alertas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regla_id UUID NOT NULL REFERENCES reglas_alerta(id) ON DELETE RESTRICT,
    dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    fecha_inicio_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin_utc TIMESTAMP WITH TIME ZONE,
    valor_maximo_registrado NUMERIC(10, 3) NOT NULL,
    estado_incidente estado_incidente_enum DEFAULT 'ABIERTO',
    usuario_resolutor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    bitacora_resolucion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 7. MÓDULO DE MANTENIMIENTO, TRAZABILIDAD Y CALIBRACIÓN
-- =====================================================================

CREATE TABLE ordenes_mantenimiento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    tecnico_usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    tipo_intervencion VARCHAR(100) NOT NULL, -- 'REEMPLAZO_HOT_SWAP_BANDEJA', 'CALIBRACION_ANUAL'
    fecha_programada TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_ejecucion TIMESTAMP WITH TIME ZONE,
    duracion_minutos INT,                    -- Meta RNF-05: <= 2.0 min para bandeja
    lote_bandeja_hotswap VARCHAR(100),
    estado_orden VARCHAR(50) DEFAULT 'PROGRAMADA',
    observaciones_tecnicas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE registros_calibracion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_mantenimiento_id UUID NOT NULL REFERENCES ordenes_mantenimiento(id) ON DELETE CASCADE,
    sensor_id UUID NOT NULL REFERENCES sensores_instalados(id) ON DELETE RESTRICT,
    fecha_calibracion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    equipo_patron_referencia VARCHAR(150) NOT NULL, -- Ej: 'Met One BAM-1020 CAMS'
    pendiente_ajustada NUMERIC(8, 4) NOT NULL,
    offset_ajustado NUMERIC(8, 4) NOT NULL,
    numero_certificado VARCHAR(100) NOT NULL UNIQUE,
    hash_sha256_verificacion VARCHAR(64) NOT NULL
);

CREATE TABLE trazabilidad_manufactura (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispositivo_id UUID NOT NULL UNIQUE REFERENCES dispositivos(id) ON DELETE CASCADE,
    lote_produccion VARCHAR(100) NOT NULL,
    test_ict_pogopin BOOLEAN DEFAULT TRUE,
    test_estanqueidad_ip65 BOOLEAN DEFAULT TRUE,
    test_camara_gas BOOLEAN DEFAULT TRUE,
    test_burn_in_48h BOOLEAN DEFAULT TRUE,
    fecha_ensamble TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    operador_planta VARCHAR(100)
);

CREATE TABLE reportes_generados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    generado_por_usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    tipo_reporte VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    url_almacenamiento_s3 VARCHAR(255),
    hash_integridad_sha256 VARCHAR(64) NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

