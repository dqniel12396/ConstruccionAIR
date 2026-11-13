# Instalación de la base de datos OTech AirNet

Crea una base vacía en el servicio PostgreSQL (versión 16 o superior) y usa su conexión directa con permisos para crear objetos en el esquema public. El archivo 001_inicial.sql contiene el modelo operativo de la aplicación y los cinco roles iniciales. Se ejecuta una vez, dentro de una transacción.

Desde la raíz del proyecto, configura PGHOST, PGPORT, PGDATABASE y PGUSER con los valores del proveedor. Configura PGSSLMODE y el certificado de confianza según sus instrucciones para conexiones TLS verificadas. psql solicitará la contraseña cuando corresponda.

~~~powershell
psql -X -v ON_ERROR_STOP=1 -f database/001_inicial.sql
~~~

Si el servicio ofrece TimescaleDB en el esquema public, aplica el siguiente paso antes de ingresar telemetría. Convierte mediciones_telemetria en una hipertabla con particiones de siete días. Con PostgreSQL estándar, las lecturas se almacenan en la tabla indexada creada por la migración inicial.

~~~powershell
psql -X -v ON_ERROR_STOP=1 -f database/activar_timescaledb.sql
~~~

Comprueba que aparezcan los cinco perfiles de aplicación y que la tabla de mediciones admita consultas.

~~~sql
SELECT codigo FROM public.roles ORDER BY codigo;
SELECT count(*) FROM public.mediciones_telemetria;
~~~

Los perfiles del catálogo roles se usarán desde el backend. Para conectar el portal, configura allí la credencial de acceso y la autorización por organización. Si el proveedor publica tablas mediante una API automática, mantén el esquema fuera de acceso público hasta configurar esos permisos.
## Acceso al portal con Supabase Auth

Aplica `002_acceso_portal.sql` después de la migración inicial en instalaciones nuevas. Abre `portal.html` desde el servidor web del proyecto. La sesión se conserva en la pestaña hasta cerrar sesión o cerrar la pestaña. Las vistas operativas siguen mostrando datos de demostración. El navegador consulta el perfil y los paneles mediante funciones que usan la identidad autenticada.

### Alta del primer usuario

1. En Supabase, abre **Authentication → Users → Add user → Create new user**, indica un correo y contraseña y confirma la dirección para habilitar el ingreso.
2. En **Table Editor → organizaciones**, crea o selecciona la organización. Copia su UUID y el UUID del usuario de Authentication.
3. Ejecuta en **SQL Editor** el siguiente bloque con tus dos UUID, el nombre y el rol deseado. Repite el bloque cambiando el código para añadir otro rol al mismo perfil. Los permisos son la unión de sus roles.

~~~sql
DO $$
DECLARE
    identidad uuid := 'UUID-DE-AUTHENTICATION';
    empresa uuid := 'UUID-DE-ORGANIZACION';
    nombre text := 'Nombre del usuario';
    codigo_rol text := 'ADMIN_EMPRESA';
    perfil uuid;
    rol_id_asignado integer;
    correo text;
BEGIN
    SELECT email INTO STRICT correo FROM auth.users WHERE id = identidad;
    SELECT id INTO STRICT rol_id_asignado FROM public.roles WHERE codigo = codigo_rol;
    INSERT INTO public.usuarios (auth_user_id, organizacion_id, email, nombre_completo)
    VALUES (identidad, empresa, correo, nombre)
    ON CONFLICT (auth_user_id) DO NOTHING;
    SELECT id INTO STRICT perfil FROM public.usuarios
    WHERE auth_user_id = identidad AND organizacion_id = empresa;
    INSERT INTO public.usuario_roles (usuario_id, rol_id)
    VALUES (perfil, rol_id_asignado) ON CONFLICT DO NOTHING;
END $$;
~~~

Para un perfil previo que ya tenga ese correo, verifica su identidad y organización y vincula su columna `auth_user_id` antes de ejecutar el bloque. Una cuenta sin perfil o sin roles queda sin acceso. Desactivar el perfil o su organización impide obtener permisos en la siguiente consulta.

## Datos por empresa

Aplica `003_panel_empresa.sql` después de la migración de acceso. El portal consulta `panel_empresa()` al iniciar o renovar la sesión y al recargar la página. La función obtiene la organización desde el perfil autenticado. El tablero muestra la última lectura disponible por estación y variable. El histórico admite hasta las 4.000 mediciones más recientes de la empresa y el filtro de periodo toma como referencia el final de la serie seleccionada.

El archivo `demo_empresas.sql` carga las empresas de prueba con NIT `DEMO-OTECH-01` y `DEMO-OTECH-02`. Requiere que existan sus cuentas técnicas. Genera 48 muestras horarias por variable y estación, un incidente, una orden y un reporte de texto por organización. La carga se puede repetir sin duplicar los equipos ni sus mediciones.
