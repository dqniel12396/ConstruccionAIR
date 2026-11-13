-- Solo las dos organizaciones demo creadas para el portal.
BEGIN;
SELECT pg_advisory_xact_lock(648923104);
DO $$
DECLARE
    empresa uuid; tecnico uuid; sede uuid; equipo uuid; sensor uuid; regla uuid;
    serial text; sitio text; lat numeric; lon numeric; var text; unidad text;
    referencia timestamptz := date_trunc('hour',now());
    contenido text; base numeric;
BEGIN
    FOR n IN 1..2 LOOP
        SELECT id INTO STRICT empresa FROM public.organizaciones WHERE nit='DEMO-OTECH-0'||n;
        SELECT id INTO STRICT tecnico FROM public.usuarios WHERE organizacion_id=empresa AND email='tecnico'||n||'@otech.example';
        FOR k IN 1..3 LOOP
            serial := format('DEMO-%s-%s',n,k);
            IF EXISTS (SELECT FROM public.dispositivos WHERE serial_dispositivo=serial) THEN CONTINUE; END IF;
            SELECT x.nombre,x.latitud,x.longitud INTO sitio,lat,lon FROM (VALUES
                (1,1,'Corferias',4.630,-74.091),(1,2,'Zona Franca',4.677,-74.161),(1,3,'Portal Sur',4.596,-74.170),
                (2,1,'Usaquén',4.696,-74.031),(2,2,'Suba',4.744,-74.092),(2,3,'Chapinero',4.649,-74.063)
            ) x(org,idx,nombre,latitud,longitud) WHERE x.org=n AND x.idx=k;
            INSERT INTO public.sedes_operativas(organizacion_id,nombre_sede,latitud,longitud) VALUES(empresa,sitio,lat,lon) RETURNING id INTO sede;
            INSERT INTO public.dispositivos(serial_dispositivo,uuid_cripto_chip,sede_id,latitud_instalacion,longitud_instalacion,nivel_bateria_pct,ultima_conexion_utc)
            VALUES(serial,'SIM-'||serial,sede,lat,lon,99-k*5-n,referencia) RETURNING id INTO equipo;
            FOREACH var IN ARRAY ARRAY['PM2_5','PM10','HUM','TEMP'] LOOP
                unidad := CASE var WHEN 'HUM' THEN '%' WHEN 'TEMP' THEN '°C' ELSE 'µg/m³' END;
                base := CASE var WHEN 'HUM' THEN 57 WHEN 'TEMP' THEN 12 WHEN 'PM10' THEN 22 ELSE 9 END + k*3+n*2;
                INSERT INTO public.sensores_instalados(dispositivo_id,modelo_sensor,variable_fisica)
                VALUES(equipo,'Simulador OTech',var) RETURNING id INTO sensor;
                INSERT INTO public.mediciones_telemetria(dispositivo_id,sensor_id,timestamp_utc,variable_codigo,valor_crudo,valor_compensado,unidad_medida,estado_calidad_dato)
                SELECT equipo,sensor,referencia-h*interval '1 hour',var,valor,valor,unidad,'RAW'
                FROM (SELECT h,round((base+3*sin(h::numeric/4+k))::numeric,1) AS valor FROM generate_series(0,47) h) serie;
            END LOOP;
            IF k=1 THEN
                INSERT INTO public.reglas_alerta(organizacion_id,dispositivo_id,variable_codigo,umbral_limite)
                VALUES(empresa,equipo,'PM2_5',base-2) RETURNING id INTO regla;
                INSERT INTO public.incidentes_alertas(regla_id,dispositivo_id,fecha_inicio_utc,valor_maximo_registrado)
                SELECT regla,equipo,min(timestamp_utc),max(valor_crudo) FROM public.mediciones_telemetria
                WHERE dispositivo_id=equipo AND variable_codigo='PM2_5' AND valor_crudo>(SELECT umbral_limite FROM public.reglas_alerta WHERE id=regla);
                INSERT INTO public.ordenes_mantenimiento(dispositivo_id,tecnico_usuario_id,tipo_intervencion,fecha_programada)
                VALUES(equipo,tecnico,'Inspección de sensores',referencia+interval '3 days');
                contenido := format('Estación: %s · Sede: %s · Muestras PM2.5: 48 · Promedio: %s µg/m³',serial,sitio,
                    (SELECT round(avg(valor_crudo),1) FROM public.mediciones_telemetria WHERE dispositivo_id=equipo AND variable_codigo='PM2_5'));
                INSERT INTO public.reportes_generados(organizacion_id,generado_por_usuario_id,tipo_reporte,fecha_inicio,fecha_fin,url_almacenamiento_s3,hash_integridad_sha256)
                VALUES(empresa,tecnico,'Resumen de estación', (referencia-interval '47 hours')::date,referencia::date,
                    'data:text/plain;base64,'||replace(encode(convert_to(contenido,'UTF8'),'base64'),chr(10),''),
                    encode(sha256(convert_to(contenido,'UTF8')),'hex'));
            END IF;
        END LOOP;
    END LOOP;
END $$;
COMMIT;
