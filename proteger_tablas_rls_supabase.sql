-- =========================================================================================
-- POLICÍA NACIONAL DEL PERÚ - REGIÓN POLICIAL HUÁNUCO
-- SCRIPT DE BLINDAJE Y SEGURIDAD RLS (ROW LEVEL SECURITY) EN SUPABASE
-- PROYECTO: cmbjqttrwdphrirerzyx (https://cmbjqttrwdphrirerzyx.supabase.co)
-- =========================================================================================
-- INSTRUCCIONES PASO A PASO:
-- 1. Abre el SQL Editor de tu proyecto en Supabase:
--    https://supabase.com/dashboard/project/cmbjqttrwdphrirerzyx/sql/new
-- 2. Copia TODO este código, pégalo en el editor y haz clic en el botón "Run" (Ejecutar).
-- 3. ¡Listo! Todas las tablas dejarán de aparecer como "Unrestricted" y quedarán
--    protegidas contra accesos externos no autorizados, manteniendo 100% operativo
--    tu sistema web (Personal, Documentos, Formulario QR y Google Sheets).
-- =========================================================================================

-- =========================================================================================
-- PASO 1: FUNCIONES DE SEGURIDAD EN EL MOTOR POSTGRESQL (SECURITY DEFINER)
-- =========================================================================================

-- 1.1 Función para leer de forma segura las cabeceras HTTP enviadas por la aplicación
CREATE OR REPLACE FUNCTION public.pnp_get_header(header_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers json;
  v_val text;
BEGIN
  BEGIN
    v_headers := current_setting('request.headers', true)::json;
    v_val := COALESCE(v_headers ->> lower(header_name), '');
  EXCEPTION WHEN OTHERS THEN
    v_val := '';
  END;
  RETURN trim(v_val);
END;
$$;

-- 1.2 Función que verifica que la petición proviene de los módulos oficiales REGPOL HCO 2.0
CREATE OR REPLACE FUNCTION public.pnp_es_cliente_oficial()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- El rol interno de administración de Supabase (Dashboard / SQL Editor) siempre tiene pase
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') OR auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  RETURN (
    public.pnp_get_header('x-pnp-app-token') = 'REGPOL-HCO-2026-SEC-92A153C6'
    AND public.pnp_get_header('x-pnp-client') IN ('regpol-hco-v2', 'regpol-hco-qr', 'regpol-hco-gas')
  );
END;
$$;

-- 1.3 Función que verifica que el usuario tiene sesión activa y está registrado en usuario_oficina
CREATE OR REPLACE FUNCTION public.pnp_es_usuario_autenticado()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cip text;
  v_existe boolean := false;
BEGIN
  -- Permitir administración directa desde el panel de Supabase
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') OR auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  -- Validar token oficial de la aplicación
  IF NOT public.pnp_es_cliente_oficial() THEN
    RETURN false;
  END IF;

  -- El cliente QR público NO tiene sesión de oficina para leer tablas internas
  IF public.pnp_get_header('x-pnp-client') = 'regpol-hco-qr' THEN
    RETURN false;
  END IF;

  v_cip := public.pnp_get_header('x-pnp-cip');
  IF v_cip = '' THEN
    RETURN false;
  END IF;

  -- Verificar que el CIP exista en public.usuario_oficina
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario_oficina u
    WHERE trim(u."CIP"::text) = v_cip
  ) INTO v_existe;

  RETURN COALESCE(v_existe, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pnp_get_header(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pnp_es_cliente_oficial() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pnp_es_usuario_autenticado() TO anon, authenticated, service_role;

-- =========================================================================================
-- PASO 2: ACTIVAR RLS Y LIMPIAR POLÍTICAS ABIERTAS EN TODAS LAS TABLAS DEL ESQUEMA PUBLIC
-- =========================================================================================
DO $$
DECLARE
  r RECORD;
  pol RECORD;
BEGIN
  -- 2.1 Eliminar todas las políticas antiguas (incluyendo las abiertas USING (true))
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
  END LOOP;

  -- 2.2 Activar Row Level Security (RLS) en absolutamente todas las tablas de public
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anon, authenticated, service_role;', r.tablename);
  END LOOP;
END $$;

-- =========================================================================================
-- PASO 3: POLÍTICAS DE SEGURIDAD PARA TABLA DE CREDENCIALES (usuario_oficina)
-- =========================================================================================
-- Solo permite consultar una fila si el usuario ya está autenticado O si está validando
-- específicamente su propio CIP en la pantalla de Login / Recuperación de contraseña.
-- Impide que terceros descarguen la lista completa de usuarios y contraseñas.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usuario_oficina') THEN
    CREATE POLICY "rls_usuario_oficina_select"
      ON public.usuario_oficina
      FOR SELECT
      TO anon, authenticated
      USING (
        public.pnp_es_usuario_autenticado()
        OR (
          public.pnp_es_cliente_oficial()
          AND public.pnp_get_header('x-pnp-lookup-cip') <> ''
          AND trim("CIP"::text) = public.pnp_get_header('x-pnp-lookup-cip')
        )
      );

    CREATE POLICY "rls_usuario_oficina_update"
      ON public.usuario_oficina
      FOR UPDATE
      TO anon, authenticated
      USING (
        public.pnp_es_usuario_autenticado()
        OR (
          public.pnp_es_cliente_oficial()
          AND public.pnp_get_header('x-pnp-lookup-cip') <> ''
          AND trim("CIP"::text) = public.pnp_get_header('x-pnp-lookup-cip')
        )
      )
      WITH CHECK (
        public.pnp_es_usuario_autenticado()
        OR (
          public.pnp_es_cliente_oficial()
          AND public.pnp_get_header('x-pnp-lookup-cip') <> ''
          AND trim("CIP"::text) = public.pnp_get_header('x-pnp-lookup-cip')
        )
      );

    CREATE POLICY "rls_usuario_oficina_insert"
      ON public.usuario_oficina
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (public.pnp_es_usuario_autenticado());

    CREATE POLICY "rls_usuario_oficina_delete"
      ON public.usuario_oficina
      FOR DELETE
      TO anon, authenticated
      USING (public.pnp_es_usuario_autenticado());
  END IF;
END $$;

-- =========================================================================================
-- PASO 4: POLÍTICAS DE SEGURIDAD PARA FORMULARIO QR (solicitudes_registro)
-- =========================================================================================
-- El personal policial que escanea el QR desde su celular solo puede ENVIAR (INSERT) su
-- solicitud desde la app oficial, pero NO puede leer, modificar ni eliminar solicitudes.
-- Solo los operadores autenticados en el sistema pueden leer o procesar la bandeja QR.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'solicitudes_registro') THEN
    CREATE POLICY "rls_solicitudes_qr_insert"
      ON public.solicitudes_registro
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (public.pnp_es_cliente_oficial());

    CREATE POLICY "rls_solicitudes_qr_select"
      ON public.solicitudes_registro
      FOR SELECT
      TO anon, authenticated
      USING (public.pnp_es_usuario_autenticado());

    CREATE POLICY "rls_solicitudes_qr_update"
      ON public.solicitudes_registro
      FOR UPDATE
      TO anon, authenticated
      USING (public.pnp_es_usuario_autenticado())
      WITH CHECK (public.pnp_es_usuario_autenticado());

    CREATE POLICY "rls_solicitudes_qr_delete"
      ON public.solicitudes_registro
      FOR DELETE
      TO anon, authenticated
      USING (public.pnp_es_usuario_autenticado());
  END IF;
END $$;

-- =========================================================================================
-- PASO 5: POLÍTICAS PARA CATÁLOGOS DE DESPLEGABLES (Unidades, Grados, etc.)
-- =========================================================================================
-- Lectura permitida para los clientes oficiales (incluyendo formulario QR de registro),
-- pero escritura/edición/eliminación restringida exclusivamente a usuarios autenticados.
DO $$
DECLARE
  t TEXT;
  catalog_tables TEXT[] := ARRAY[
    'unidades', 'grados', 'tipo_dni', 'jerarquía', 'especialidad',
    'condición', 'situación_actual', 'aptitud_psicosomático', 'sexo',
    'estado_civil', 'cargo', 'jefes'
  ];
BEGIN
  FOREACH t IN ARRAY catalog_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (public.pnp_es_cliente_oficial() OR public.pnp_es_usuario_autenticado());',
        'rls_cat_select_' || t, t
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (public.pnp_es_usuario_autenticado());',
        'rls_cat_insert_' || t, t
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated USING (public.pnp_es_usuario_autenticado()) WITH CHECK (public.pnp_es_usuario_autenticado());',
        'rls_cat_update_' || t, t
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO anon, authenticated USING (public.pnp_es_usuario_autenticado());',
        'rls_cat_delete_' || t, t
      );
    END IF;
  END LOOP;
END $$;

-- =========================================================================================
-- PASO 6: POLÍTICAS ESTRICTAS PARA TODAS LAS TABLAS OPERATIVAS DE PERSONAL Y DOCUMENTOS
-- =========================================================================================
-- Cualquier tabla operativa (personal_policial, referidos, en_curso, destacados,
-- reasignados, disponibilidad_retiro, sometido_ley, detenidos_sin_sentencia,
-- incorporados_reasignados, incorporados_destacados, historial_movimientos, oficios,
-- informes, memorandum, orden_incorporacion, orden_reincorporacion, etc.) exige
-- obligatoriamente sesión autenticada de un usuario registrado en usuario_oficina.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN (
        'usuario_oficina',
        'solicitudes_registro',
        'unidades', 'grados', 'tipo_dni', 'jerarquía', 'especialidad',
        'condición', 'situación_actual', 'aptitud_psicosomático', 'sexo',
        'estado_civil', 'cargo', 'jefes'
      )
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (public.pnp_es_usuario_autenticado()) WITH CHECK (public.pnp_es_usuario_autenticado());',
      'rls_protegido_' || r.tablename, r.tablename
    );
  END LOOP;
END $$;
