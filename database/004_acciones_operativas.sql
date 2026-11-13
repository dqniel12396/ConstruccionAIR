-- Ampliación operativa del portal multi-tenant: ficha técnica de hardware,
-- trazabilidad/calibración y RPCs seguras para gestionar alertas, reglas,
-- órdenes de mantenimiento y reportes normativos.
BEGIN;

CREATE OR REPLACE FUNCTION public.panel_empresa() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    empresa uuid;
    permisos text[];
    resultado jsonb;
BEGIN
    SELECT u.organizacion_id, p.vistas INTO empresa, permisos
    FROM public.usuarios u CROSS JOIN public.mi_acceso_portal() p
    WHERE u.auth_user_id = auth.uid() AND u.activo;

    IF empresa IS NULL OR NOT ('dashboard' = ANY(permisos)) THEN
        RAISE EXCEPTION 'Sin acceso al portal' USING ERRCODE = '42501';
    END IF;

    WITH equipos AS (
        SELECT
            d.id,
            d.serial_dispositivo AS serial,
            d.uuid_cripto_chip AS chip_id,
            d.modelo_hardware AS modelo,
            d.version_firmware AS firmware,
            d.tipo_soporte AS soporte,
            s.nombre_sede AS sede,
            d.latitud_instalacion AS lat,
            d.longitud_instalacion AS lon,
            d.estado_operativo AS estado,
            d.nivel_bateria_pct AS bateria,
            d.voltaje_bateria AS voltaje,
            d.ultima_conexion_utc AS conexion
        FROM public.dispositivos d
        JOIN public.sedes_operativas s ON s.id = d.sede_id
        WHERE s.organizacion_id = empresa
    )
    SELECT jsonb_build_object(
        'estaciones',
        COALESCE(jsonb_agg(
            to_jsonb(e) || jsonb_build_object(
                'lecturas', COALESCE((
                    SELECT jsonb_object_agg(v.variable_codigo, v.valor_compensado)
                    FROM (
                        SELECT DISTINCT ON (m.variable_codigo)
                            m.variable_codigo, m.valor_compensado
                        FROM public.mediciones_telemetria m
                        WHERE m.dispositivo_id = e.id
                        ORDER BY m.variable_codigo, m.timestamp_utc DESC, m.id DESC
                    ) v
                ), '{}'::jsonb),
                'comunicacion', (
                    SELECT jsonb_build_object(
                        'tecnologia', c.tipo_tecnologia,
                        'deveui', c.deveui_lorawan,
                        'muestreo_seg', c.intervalo_muestreo_seg
                    )
                    FROM public.config_comunicacion c
                    WHERE c.dispositivo_id = e.id
                    LIMIT 1
                ),
                'sensores', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'modelo', si.modelo_sensor,
                        'variable', si.variable_fisica,
                        'estado', si.estado_sensor,
                        'cero', si.factor_cero,
                        'span', si.factor_span,
                        'r2', si.r2_calibracion
                    ) ORDER BY si.variable_fisica)
                    FROM public.sensores_instalados si
                    WHERE si.dispositivo_id = e.id
                ), '[]'::jsonb),
                'manufactura', (
                    SELECT jsonb_build_object(
                        'lote', tm.lote_produccion,
                        'ip65', tm.test_estanqueidad_ip65,
                        'camara_gas', tm.test_camara_gas,
                        'burn_in_48h', tm.test_burn_in_48h,
                        'operador', tm.operador_planta
                    )
                    FROM public.trazabilidad_manufactura tm
                    WHERE tm.dispositivo_id = e.id
                    LIMIT 1
                )
            )
            ORDER BY e.serial
        ), '[]'::jsonb)
    )
    INTO resultado
    FROM equipos e;

    IF 'estadisticas' = ANY(permisos) THEN
        resultado := resultado || jsonb_build_object('serie', COALESCE((
            SELECT jsonb_agg(to_jsonb(v) ORDER BY v.fecha, v.serial, v.variable)
            FROM (
                SELECT d.serial_dispositivo AS serial, m.timestamp_utc AS fecha,
                       m.variable_codigo AS variable, m.valor_crudo AS crudo,
                       m.valor_compensado AS valor, m.unidad_medida AS unidad
                FROM public.mediciones_telemetria m
                JOIN public.dispositivos d ON d.id = m.dispositivo_id
                JOIN public.sedes_operativas s ON s.id = d.sede_id
                WHERE s.organizacion_id = empresa
                ORDER BY m.timestamp_utc DESC, m.id DESC
                LIMIT 4000
            ) v
        ), '[]'::jsonb));
    END IF;

    IF 'alertas' = ANY(permisos) THEN
        resultado := resultado || jsonb_build_object(
            'alertas', COALESCE((
                SELECT jsonb_agg(to_jsonb(v) ORDER BY v.fecha DESC)
                FROM (
                    SELECT i.id, d.serial_dispositivo AS serial, i.fecha_inicio_utc AS fecha,
                           i.estado_incidente AS estado, r.variable_codigo AS variable,
                           r.umbral_limite AS umbral, i.valor_maximo_registrado AS maximo,
                           i.bitacora_resolucion AS bitacora
                    FROM public.incidentes_alertas i
                    JOIN public.reglas_alerta r ON r.id = i.regla_id
                    JOIN public.dispositivos d ON d.id = i.dispositivo_id
                    JOIN public.sedes_operativas s ON s.id = d.sede_id
                    WHERE r.organizacion_id = empresa AND s.organizacion_id = empresa
                ) v
            ), '[]'::jsonb),
            'reglas', COALESCE((
                SELECT jsonb_agg(to_jsonb(v) ORDER BY v.variable, v.umbral)
                FROM (
                    SELECT r.id, COALESCE(d.serial_dispositivo, 'TODAS') AS serial,
                           r.variable_codigo AS variable, r.operador_comparacion AS operador,
                           r.umbral_limite AS umbral, r.nivel_severidad AS severidad,
                           r.activa
                    FROM public.reglas_alerta r
                    LEFT JOIN public.dispositivos d ON d.id = r.dispositivo_id
                    WHERE r.organizacion_id = empresa
                ) v
            ), '[]'::jsonb)
        );
    END IF;

    IF 'mantenimiento' = ANY(permisos) THEN
        resultado := resultado || jsonb_build_object(
            'ordenes', COALESCE((
                SELECT jsonb_agg(to_jsonb(v) ORDER BY v.fecha DESC)
                FROM (
                    SELECT o.id, d.serial_dispositivo AS serial, o.fecha_programada AS fecha,
                           o.tipo_intervencion AS tipo, o.estado_orden AS estado,
                           o.duracion_minutos AS duracion, o.observaciones_tecnicas AS observaciones,
                           u.nombre_completo AS tecnico
                    FROM public.ordenes_mantenimiento o
                    JOIN public.dispositivos d ON d.id = o.dispositivo_id
                    JOIN public.sedes_operativas s ON s.id = d.sede_id
                    LEFT JOIN public.usuarios u ON u.id = o.tecnico_usuario_id AND u.organizacion_id = empresa
                    WHERE s.organizacion_id = empresa
                ) v
            ), '[]'::jsonb),
            'calibraciones', COALESCE((
                SELECT jsonb_agg(to_jsonb(v) ORDER BY v.fecha DESC)
                FROM (
                    SELECT d.serial_dispositivo AS serial, si.variable_fisica AS variable,
                           rc.equipo_patron_referencia AS patron, rc.pendiente_ajustada AS pendiente,
                           rc.offset_ajustado AS offset_cero, rc.numero_certificado AS certificado,
                           rc.fecha_calibracion AS fecha
                    FROM public.registros_calibracion rc
                    JOIN public.ordenes_mantenimiento o ON o.id = rc.orden_mantenimiento_id
                    JOIN public.sensores_instalados si ON si.id = rc.sensor_id
                    JOIN public.dispositivos d ON d.id = o.dispositivo_id
                    JOIN public.sedes_operativas s ON s.id = d.sede_id
                    WHERE s.organizacion_id = empresa
                ) v
            ), '[]'::jsonb)
        );
    END IF;

    IF 'reportes' = ANY(permisos) THEN
        resultado := resultado || jsonb_build_object('reportes', COALESCE((
            SELECT jsonb_agg(to_jsonb(v) ORDER BY v.fecha DESC)
            FROM (
                SELECT tipo_reporte AS tipo, fecha_inicio AS inicio, fecha_fin AS fin,
                       fecha_creacion AS fecha, url_almacenamiento_s3 AS archivo,
                       hash_integridad_sha256 AS hash
                FROM public.reportes_generados
                WHERE organizacion_id = empresa
            ) v
        ), '[]'::jsonb));
    END IF;

    RETURN resultado;
END $$;

-- 1. Reconocer o resolver un incidente de alerta
CREATE OR REPLACE FUNCTION public.resolver_incidente_portal(
    p_incidente_id uuid,
    p_nuevo_estado public.estado_incidente_enum,
    p_bitacora text DEFAULT ''
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    uid_local uuid;
    empresa uuid;
    permisos text[];
BEGIN
    SELECT u.id, u.organizacion_id, p.vistas INTO uid_local, empresa, permisos
    FROM public.usuarios u CROSS JOIN public.mi_acceso_portal() p
    WHERE u.auth_user_id = auth.uid() AND u.activo;

    IF empresa IS NULL OR NOT ('alertas' = ANY(permisos)) THEN
        RAISE EXCEPTION 'No autorizado para gestionar alertas' USING ERRCODE = '42501';
    END IF;

    UPDATE public.incidentes_alertas i
    SET estado_incidente = p_nuevo_estado,
        usuario_resolutor_id = uid_local,
        bitacora_resolucion = NULLIF(trim(p_bitacora), ''),
        fecha_fin_utc = CASE WHEN p_nuevo_estado = 'RESUELTO' THEN now() ELSE fecha_fin_utc END
    FROM public.reglas_alerta r
    WHERE i.id = p_incidente_id
      AND r.id = i.regla_id
      AND r.organizacion_id = empresa;
END $$;

-- 2. Crear nueva regla de umbral de alerta para un dispositivo
CREATE OR REPLACE FUNCTION public.crear_regla_alerta_portal(
    p_serial text,
    p_variable text,
    p_operador text,
    p_umbral numeric,
    p_severidad public.severidad_alerta_enum DEFAULT 'PREVENTIVO'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    empresa uuid;
    permisos text[];
    disp_id uuid;
    nueva_id uuid;
BEGIN
    SELECT u.organizacion_id, p.vistas INTO empresa, permisos
    FROM public.usuarios u CROSS JOIN public.mi_acceso_portal() p
    WHERE u.auth_user_id = auth.uid() AND u.activo;

    IF empresa IS NULL OR NOT ('alertas' = ANY(permisos)) THEN
        RAISE EXCEPTION 'No autorizado para crear reglas' USING ERRCODE = '42501';
    END IF;

    IF p_serial IS NOT NULL AND p_serial <> 'TODAS' THEN
        SELECT d.id INTO disp_id
        FROM public.dispositivos d
        JOIN public.sedes_operativas s ON s.id = d.sede_id
        WHERE d.serial_dispositivo = p_serial AND s.organizacion_id = empresa;
    END IF;

    INSERT INTO public.reglas_alerta (
        organizacion_id, dispositivo_id, variable_codigo,
        operador_comparacion, umbral_limite, nivel_severidad
    ) VALUES (
        empresa, disp_id, p_variable,
        CASE WHEN p_operador IN ('>', '>=', '<', '<=') THEN p_operador ELSE '>' END,
        p_umbral, p_severidad
    )
    RETURNING id INTO nueva_id;

    RETURN nueva_id;
END $$;

-- 3. Programar o completar orden de mantenimiento Hot-Swap
CREATE OR REPLACE FUNCTION public.gestionar_orden_portal(
    p_orden_id uuid DEFAULT NULL,
    p_serial text DEFAULT NULL,
    p_tipo text DEFAULT 'Inspección de sensores',
    p_fecha_prog timestamptz DEFAULT now() + interval '1 day',
    p_duracion_min int DEFAULT 2,
    p_observaciones text DEFAULT ''
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    uid_local uuid;
    empresa uuid;
    permisos text[];
    disp_id uuid;
    res_id uuid;
BEGIN
    SELECT u.id, u.organizacion_id, p.vistas INTO uid_local, empresa, permisos
    FROM public.usuarios u CROSS JOIN public.mi_acceso_portal() p
    WHERE u.auth_user_id = auth.uid() AND u.activo;

    IF empresa IS NULL OR NOT ('mantenimiento' = ANY(permisos)) THEN
        RAISE EXCEPTION 'No autorizado para gestionar mantenimiento' USING ERRCODE = '42501';
    END IF;

    IF p_orden_id IS NOT NULL THEN
        UPDATE public.ordenes_mantenimiento o
        SET estado_orden = 'COMPLETADA',
            fecha_ejecucion = now(),
            duracion_minutos = GREATEST(1, COALESCE(p_duracion_min, 2)),
            observaciones_tecnicas = NULLIF(trim(p_observaciones), '')
        FROM public.dispositivos d
        JOIN public.sedes_operativas s ON s.id = d.sede_id
        WHERE o.id = p_orden_id AND d.id = o.dispositivo_id AND s.organizacion_id = empresa
        RETURNING o.id INTO res_id;
        RETURN res_id;
    ELSE
        SELECT d.id INTO STRICT disp_id
        FROM public.dispositivos d
        JOIN public.sedes_operativas s ON s.id = d.sede_id
        WHERE d.serial_dispositivo = p_serial AND s.organizacion_id = empresa;

        INSERT INTO public.ordenes_mantenimiento (
            dispositivo_id, tecnico_usuario_id, tipo_intervencion,
            fecha_programada, estado_orden, observaciones_tecnicas
        ) VALUES (
            disp_id, uid_local, p_tipo, p_fecha_prog, 'PROGRAMADA', NULLIF(trim(p_observaciones), '')
        )
        RETURNING id INTO res_id;
        RETURN res_id;
    END IF;
END $$;

-- 4. Registrar reporte normativo firmado con SHA-256
CREATE OR REPLACE FUNCTION public.registrar_reporte_portal(
    p_tipo text,
    p_inicio date,
    p_fin date,
    p_archivo text,
    p_hash text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    uid_local uuid;
    empresa uuid;
    permisos text[];
    rep_id uuid;
BEGIN
    SELECT u.id, u.organizacion_id, p.vistas INTO uid_local, empresa, permisos
    FROM public.usuarios u CROSS JOIN public.mi_acceso_portal() p
    WHERE u.auth_user_id = auth.uid() AND u.activo;

    IF empresa IS NULL OR NOT ('reportes' = ANY(permisos)) THEN
        RAISE EXCEPTION 'No autorizado para registrar reportes' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.reportes_generados (
        organizacion_id, generado_por_usuario_id, tipo_reporte,
        fecha_inicio, fecha_fin, url_almacenamiento_s3, hash_integridad_sha256
    ) VALUES (
        empresa, uid_local, p_tipo, p_inicio, p_fin, p_archivo, p_hash
    )
    RETURNING id INTO rep_id;

    RETURN rep_id;
END $$;

REVOKE ALL ON FUNCTION
    public.resolver_incidente_portal(uuid, public.estado_incidente_enum, text),
    public.crear_regla_alerta_portal(text, text, text, numeric, public.severidad_alerta_enum),
    public.gestionar_orden_portal(uuid, text, text, timestamptz, int, text),
    public.registrar_reporte_portal(text, date, date, text, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
    public.resolver_incidente_portal(uuid, public.estado_incidente_enum, text),
    public.crear_regla_alerta_portal(text, text, text, numeric, public.severidad_alerta_enum),
    public.gestionar_orden_portal(uuid, text, text, timestamptz, int, text),
    public.registrar_reporte_portal(text, date, date, text, text)
TO authenticated;

COMMIT;
