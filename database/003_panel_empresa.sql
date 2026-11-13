-- Lecturas del portal. La organización y el alcance proceden de la sesión.
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
        RAISE EXCEPTION 'Sin acceso al portal' USING ERRCODE='42501';
    END IF;
    WITH equipos AS (
        SELECT d.id, d.serial_dispositivo AS serial, s.nombre_sede AS sede,
            d.latitud_instalacion AS lat, d.longitud_instalacion AS lon,
            d.estado_operativo AS estado, d.nivel_bateria_pct AS bateria,
            d.ultima_conexion_utc AS conexion
        FROM public.dispositivos d JOIN public.sedes_operativas s ON s.id=d.sede_id
        WHERE s.organizacion_id=empresa
    )
    SELECT jsonb_build_object('estaciones', COALESCE(jsonb_agg(to_jsonb(e) || jsonb_build_object(
        'lecturas', (SELECT jsonb_object_agg(v.variable_codigo,v.valor_compensado) FROM (
            SELECT DISTINCT ON (m.variable_codigo) m.variable_codigo,m.valor_compensado
            FROM public.mediciones_telemetria m WHERE m.dispositivo_id=e.id
            ORDER BY m.variable_codigo,m.timestamp_utc DESC,m.id DESC
        ) v)) ORDER BY e.serial),'[]'::jsonb)) INTO resultado FROM equipos e;

    IF 'estadisticas'=ANY(permisos) THEN
        resultado := resultado || jsonb_build_object('serie', COALESCE((
            SELECT jsonb_agg(to_jsonb(v) ORDER BY v.fecha,v.serial,v.variable) FROM (
                SELECT d.serial_dispositivo AS serial,m.timestamp_utc AS fecha,m.variable_codigo AS variable,
                       m.valor_crudo AS crudo,m.valor_compensado AS valor,m.unidad_medida AS unidad
                FROM public.mediciones_telemetria m JOIN public.dispositivos d ON d.id=m.dispositivo_id
                JOIN public.sedes_operativas s ON s.id=d.sede_id WHERE s.organizacion_id=empresa
                ORDER BY m.timestamp_utc DESC,m.id DESC LIMIT 4000
            ) v),'[]'::jsonb));
    END IF;
    IF 'alertas'=ANY(permisos) THEN
        resultado := resultado || jsonb_build_object('alertas', COALESCE((
            SELECT jsonb_agg(to_jsonb(v) ORDER BY v.fecha DESC) FROM (
                SELECT d.serial_dispositivo AS serial,i.fecha_inicio_utc AS fecha,i.estado_incidente AS estado,
                    r.variable_codigo AS variable,r.umbral_limite AS umbral,i.valor_maximo_registrado AS maximo
                FROM public.incidentes_alertas i JOIN public.reglas_alerta r ON r.id=i.regla_id
                JOIN public.dispositivos d ON d.id=i.dispositivo_id JOIN public.sedes_operativas s ON s.id=d.sede_id
                WHERE r.organizacion_id=empresa AND s.organizacion_id=empresa
            ) v),'[]'::jsonb));
    END IF;
    IF 'mantenimiento'=ANY(permisos) THEN
        resultado := resultado || jsonb_build_object('ordenes', COALESCE((
            SELECT jsonb_agg(to_jsonb(v) ORDER BY v.fecha DESC) FROM (
                SELECT d.serial_dispositivo AS serial,o.fecha_programada AS fecha,o.tipo_intervencion AS tipo,
                       o.estado_orden AS estado,u.nombre_completo AS tecnico
                FROM public.ordenes_mantenimiento o JOIN public.dispositivos d ON d.id=o.dispositivo_id
                JOIN public.sedes_operativas s ON s.id=d.sede_id
                LEFT JOIN public.usuarios u ON u.id=o.tecnico_usuario_id AND u.organizacion_id=empresa
                WHERE s.organizacion_id=empresa
            ) v),'[]'::jsonb));
    END IF;
    IF 'reportes'=ANY(permisos) THEN
        resultado := resultado || jsonb_build_object('reportes', COALESCE((
            SELECT jsonb_agg(to_jsonb(v) ORDER BY v.fecha DESC) FROM (
                SELECT tipo_reporte AS tipo,fecha_inicio AS inicio,fecha_fin AS fin,fecha_creacion AS fecha,
                       url_almacenamiento_s3 AS archivo FROM public.reportes_generados WHERE organizacion_id=empresa
            ) v),'[]'::jsonb));
    END IF;
    RETURN resultado;
END $$;
REVOKE ALL ON FUNCTION public.panel_empresa() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.panel_empresa() TO authenticated;
COMMIT;
