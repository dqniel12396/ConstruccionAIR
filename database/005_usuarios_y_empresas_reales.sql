-- =========================================================================
-- OTech AirNet S.A.S. — Semilla de Empresas Reales, Estaciones y Usuarios
-- Ejecutar en Supabase SQL Editor (después de 001..004). Script idempotente.
-- =========================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_org_otech     uuid;
    v_org_ecopetrol uuid;
    v_org_alpina    uuid;
    v_org_corferias uuid;
    v_rol_super     uuid;
    v_rol_admin     uuid;
    v_rol_analista  uuid;
    v_rol_tecnico   uuid;
    v_rol_publico   uuid;

    v_auth_id       uuid;
    v_user_id       uuid;
    v_sede_id       uuid;
    v_disp_id       uuid;
    v_sensor_id     uuid;
    v_regla_id      uuid;
    v_ref           timestamptz := date_trunc('hour', now());

    rec_usr RECORD;
    rec_est RECORD;
    v_var   text;
    v_uni   text;
    v_base  numeric;
    v_org_target uuid;
    v_tec_id     uuid;
BEGIN
    -- 1. Organizaciones reales
    INSERT INTO public.organizaciones (nit, razon_social, activo)
    VALUES
      ('901900100-1', 'OTech AirNet S.A.S.', true),
      ('899999068-1', 'Ecopetrol S.A.', true),
      ('860025900-2', 'Alpina Productos Alimenticios S.A.', true),
      ('860002464-3', 'Corferias Bogotá', true)
    ON CONFLICT (nit) DO UPDATE SET razon_social = EXCLUDED.razon_social, activo = true;

    SELECT id INTO STRICT v_org_otech     FROM public.organizaciones WHERE nit = '901900100-1';
    SELECT id INTO STRICT v_org_ecopetrol FROM public.organizaciones WHERE nit = '899999068-1';
    SELECT id INTO STRICT v_org_alpina    FROM public.organizaciones WHERE nit = '860025900-2';
    SELECT id INTO STRICT v_org_corferias FROM public.organizaciones WHERE nit = '860002464-3';

    -- 2. Roles del sistema
    SELECT id INTO STRICT v_rol_super    FROM public.roles WHERE codigo = 'SUPER_ADMIN_OTECH';
    SELECT id INTO STRICT v_rol_admin    FROM public.roles WHERE codigo = 'ADMIN_EMPRESA';
    SELECT id INTO STRICT v_rol_analista FROM public.roles WHERE codigo = 'ANALISTA_AMBIENTAL';
    SELECT id INTO STRICT v_rol_tecnico  FROM public.roles WHERE codigo = 'TECNICO_CAMPO';
    SELECT id INTO STRICT v_rol_publico  FROM public.roles WHERE codigo = 'VISUALIZADOR_PUBLICO';

    -- 3. Usuarios reales en auth.users + public.usuarios + usuario_roles
    FOR rec_usr IN
        SELECT * FROM (VALUES
            ('admin@otechairnet.co',      'OTechAdmin2026!',        'Daniel Sanabria Rivera',      v_org_otech,     v_rol_super),
            ('tecnico@otechairnet.co',    'OTechTecnico2026!',      'Jamyson Steven Rolón',        v_org_otech,     v_rol_tecnico),
            ('admin@ecopetrol.otech.co',  'Ecopetrol2026!',         'Ing. Juan José León',         v_org_ecopetrol, v_rol_admin),
            ('analista@ecopetrol.otech.co','EcopetrolAnalista2026!','Dra. Andrea Silva Castro',    v_org_ecopetrol, v_rol_analista),
            ('admin@alpina.otech.co',     'Alpina2026!',            'Ing. Carlos Méndez',          v_org_alpina,    v_rol_admin),
            ('tecnico@alpina.otech.co',   'AlpinaTecnico2026!',     'Téc. Laura Gómez',            v_org_alpina,    v_rol_tecnico),
            ('consulta@corferias.otech.co','Corferias2026!',        'Coordinación Ambiental Feria',v_org_corferias, v_rol_publico)
        ) AS t(email, pass, nombre, org_id, rol_id)
    LOOP
        SELECT id INTO v_auth_id FROM auth.users WHERE email = rec_usr.email;
        IF v_auth_id IS NULL THEN
            v_auth_id := gen_random_uuid();
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at, confirmation_token, recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                v_auth_id, 'authenticated', 'authenticated',
                rec_usr.email, crypt(rec_usr.pass, gen_salt('bf')),
                now(), '{"provider":"email","providers":["email"]}'::jsonb,
                jsonb_build_object('nombre', rec_usr.nombre),
                now(), now(), '', ''
            );

            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), v_auth_id,
                jsonb_build_object('sub', v_auth_id::text, 'email', rec_usr.email),
                'email', v_auth_id::text, now(), now(), now()
            ) ON CONFLICT DO NOTHING;
        END IF;

        INSERT INTO public.usuarios (organizacion_id, email, nombre_completo, activo, auth_user_id)
        VALUES (rec_usr.org_id, rec_usr.email, rec_usr.nombre, true, v_auth_id)
        ON CONFLICT (email) DO UPDATE
            SET organizacion_id = EXCLUDED.organizacion_id,
                nombre_completo = EXCLUDED.nombre_completo,
                activo = true,
                auth_user_id = EXCLUDED.auth_user_id
        RETURNING id INTO v_user_id;

        INSERT INTO public.usuario_roles (usuario_id, rol_id)
        VALUES (v_user_id, rec_usr.rol_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- 4. Estaciones exclusivas por empresa
    FOR rec_est IN
        SELECT * FROM (VALUES
            ('OT-CORF-01', v_org_corferias, 'Corferias - Pabellón Innovación',            4.630, -74.091, 'OPERATIVO_ONLINE',     98, 12.3, 24.1, 68.2, 18.4),
            ('OT-USAQ-08', v_org_corferias, 'Usaquén - Centro Empresarial Santa Bárbara', 4.693, -74.032, 'OPERATIVO_ONLINE',     97, 15.6, 31.0, 66.8, 17.8),
            ('OT-INDU-02', v_org_ecopetrol, 'Zona Franca - Parque Industrial',            4.677, -74.161, 'ADVERTENCIA_MODERADA', 92, 36.8, 55.6, 79.5, 17.1),
            ('OT-AERO-03', v_org_ecopetrol, 'Terminal Carga - El Dorado',                 4.701, -74.146, 'OPERATIVO_ONLINE',    100, 10.9, 21.4, 65.0, 19.0),
            ('OT-MOVI-04', v_org_ecopetrol, 'Portal Sur - TransMilenio Autopista',        4.596, -74.170, 'ALERTA_CRITICA',       85, 58.2, 83.5, 62.1, 21.0),
            ('OT-ALPI-05', v_org_alpina,    'Sopó - Cuenca Sabana Norte',                 4.909, -73.943, 'OPERATIVO_ONLINE',     95,  8.4, 16.2, 65.0, 19.0),
            ('OT-SUBA-06', v_org_alpina,    'Suba - Reserva Humedal La Conejera',         4.756, -74.098, 'OPERATIVO_ONLINE',     94,  9.8, 18.5, 78.4, 16.5),
            ('OT-CHIA-07', v_org_alpina,    'Chía - Corredor Central del Norte',          4.862, -74.053, 'OPERATIVO_ONLINE',     91, 14.1, 27.6, 64.3, 18.2)
        ) AS s(serial, org_id, sede, lat, lon, estado, bat, pm25, pm10, hum, temp)
    LOOP
        IF EXISTS (SELECT 1 FROM public.dispositivos WHERE serial_dispositivo = rec_est.serial) THEN
            CONTINUE;
        END IF;

        INSERT INTO public.sedes_operativas (organizacion_id, nombre_sede, latitud, longitud)
        VALUES (rec_est.org_id, rec_est.sede, rec_est.lat, rec_est.lon)
        RETURNING id INTO v_sede_id;

        INSERT INTO public.dispositivos (
            serial_dispositivo, uuid_cripto_chip, sede_id,
            latitud_instalacion, longitud_instalacion,
            estado_operativo, nivel_bateria_pct, ultima_conexion_utc
        ) VALUES (
            rec_est.serial, 'ATECC608A-' || rec_est.serial, v_sede_id,
            rec_est.lat, rec_est.lon,
            rec_est.estado::public.estado_dispositivo_enum, rec_est.bat, v_ref
        ) RETURNING id INTO v_disp_id;

        INSERT INTO public.config_comunicacion (dispositivo_id, tipo_tecnologia, deveui_lorawan, intervalo_muestreo_seg)
        VALUES (v_disp_id, 'LoRaWAN US915 + Backup 4G LTE-M', '70B3D57ED006' || right(rec_est.serial, 4), 60)
        ON CONFLICT DO NOTHING;

        INSERT INTO public.trazabilidad_manufactura (dispositivo_id, lote_produccion, test_estanqueidad_ip65, test_camara_gas, test_burn_in_48h)
        VALUES (v_disp_id, 'LOTE-2026-11', true, true, true)
        ON CONFLICT DO NOTHING;

        FOREACH v_var IN ARRAY ARRAY['PM2_5', 'PM10', 'HUM', 'TEMP'] LOOP
            v_uni := CASE v_var WHEN 'HUM' THEN '%' WHEN 'TEMP' THEN '°C' ELSE 'µg/m³' END;
            v_base := CASE v_var
                WHEN 'PM2_5' THEN rec_est.pm25
                WHEN 'PM10'  THEN rec_est.pm10
                WHEN 'HUM'   THEN rec_est.hum
                ELSE rec_est.temp
            END;
            INSERT INTO public.sensores_instalados (dispositivo_id, modelo_sensor, variable_fisica)
            VALUES (v_disp_id, CASE WHEN v_var LIKE 'PM%' THEN 'Sensirion SPS30' ELSE 'Bosch BME680' END, v_var)
            RETURNING id INTO v_sensor_id;

            INSERT INTO public.mediciones_telemetria (
                dispositivo_id, sensor_id, timestamp_utc, variable_codigo,
                valor_crudo, valor_compensado, unidad_medida, estado_calidad_dato
            )
            SELECT
                v_disp_id, v_sensor_id, v_ref - (h * interval '1 hour'), v_var,
                round((v_base + 2.5 * sin(h::numeric / 4))::numeric, 1),
                round((v_base + 2.0 * sin(h::numeric / 4))::numeric, 1),
                v_uni, 'COMPENSADO_KOHLER'
            FROM generate_series(0, 47) AS h;
        END LOOP;

        IF rec_est.pm25 > 30 THEN
            INSERT INTO public.reglas_alerta (organizacion_id, dispositivo_id, variable_codigo, operador, umbral_limite, nivel_severidad)
            VALUES (rec_est.org_id, v_disp_id, 'PM2_5', '>', 35.0, 'ALERTA_FASE_1')
            RETURNING id INTO v_regla_id;

            INSERT INTO public.incidentes_alertas (regla_id, dispositivo_id, fecha_inicio_utc, valor_maximo_registrado, estado)
            VALUES (v_regla_id, v_disp_id, v_ref - interval '2 hours', rec_est.pm25, 'ABIERTO');
        END IF;
    END LOOP;

    -- Órdenes de mantenimiento de ejemplo por organización
    SELECT id INTO v_tec_id FROM public.usuarios WHERE email = 'tecnico@otechairnet.co';
    FOR v_org_target IN SELECT unnest(ARRAY[v_org_ecopetrol, v_org_alpina]) LOOP
        INSERT INTO public.ordenes_mantenimiento (dispositivo_id, tecnico_usuario_id, tipo_intervencion, fecha_programada, observaciones)
        SELECT d.id, v_tec_id, 'CALIBRACION_OPTICA', v_ref + interval '3 days', 'Verificación óptica programada'
        FROM public.dispositivos d
        JOIN public.sedes_operativas s ON s.id = d.sede_id
        WHERE s.organizacion_id = v_org_target
        LIMIT 1;
    END LOOP;
END $$;

-- RPC opcional para que SUPER_ADMIN_OTECH liste organizaciones cliente
CREATE OR REPLACE FUNCTION public.listar_organizaciones_portal()
RETURNS TABLE (id uuid, nit text, razon_social text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_permisos text[];
BEGIN
    SELECT p.vistas INTO v_permisos FROM public.mi_acceso_portal() p LIMIT 1;
    IF NOT ('database' = ANY(v_permisos)) THEN
        RAISE EXCEPTION 'Solo Super Admin puede listar organizaciones' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
    SELECT o.id, o.nit::text, o.razon_social::text
    FROM public.organizaciones o
    WHERE o.activo
    ORDER BY o.razon_social;
END $$;

REVOKE ALL ON FUNCTION public.listar_organizaciones_portal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_organizaciones_portal() TO authenticated;

COMMIT;
