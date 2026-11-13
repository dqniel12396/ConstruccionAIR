-- Supabase Auth almacena las credenciales. Los administradores vinculan cada
-- identidad con una organización y asignan sus roles desde el lado de confianza.
BEGIN;
ALTER TABLE public.usuarios
    ADD COLUMN auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    ALTER COLUMN password_hash DROP NOT NULL;

-- Estas tablas solo se consultan desde la función de perfil.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usuarios, public.usuario_roles, public.roles, public.organizaciones
    FROM anon, authenticated, PUBLIC;

CREATE FUNCTION public.mi_acceso_portal()
RETURNS TABLE (nombre text, organizacion text, perfiles text[], vistas text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    WITH permisos(rol, vistas) AS (VALUES
        ('SUPER_ADMIN_OTECH', ARRAY['dashboard','dispositivos','estadisticas','alertas','mantenimiento','reportes','database']),
        ('ADMIN_EMPRESA', ARRAY['dashboard','dispositivos','estadisticas','alertas','mantenimiento','reportes']),
        ('TECNICO_CAMPO', ARRAY['dashboard','dispositivos','alertas','mantenimiento']),
        ('ANALISTA_AMBIENTAL', ARRAY['dashboard','estadisticas','alertas','reportes']),
        ('VISUALIZADOR_PUBLICO', ARRAY['dashboard'])
    )
    SELECT u.nombre_completo::text, o.razon_social::text,
           array_agg(DISTINCT r.nombre::text), array_agg(DISTINCT vista)
    FROM public.usuarios u
    JOIN public.organizaciones o ON o.id = u.organizacion_id
    JOIN public.usuario_roles ur ON ur.usuario_id = u.id
    JOIN public.roles r ON r.id = ur.rol_id
    JOIN permisos p ON p.rol = r.codigo
    CROSS JOIN LATERAL unnest(p.vistas) AS v(vista)
    WHERE u.auth_user_id = (SELECT auth.uid()) AND u.activo AND o.activo
    GROUP BY u.id, o.id;
$$;
REVOKE ALL ON FUNCTION public.mi_acceso_portal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_acceso_portal() TO authenticated;
COMMIT;
