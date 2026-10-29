-- =========================================================================================
-- POLICIA NACIONAL DEL PERU - REGION POLICIAL HUANUCO
-- SCRIPT DE BLINDAJE Y SEGURIDAD RLS (ROW LEVEL SECURITY) EN SUPABASE
-- PROYECTO: cmbjqttrwdphrirerzyx (https://cmbjqttrwdphrirerzyx.supabase.co)
-- =========================================================================================

-- PASO 1: FUNCIONES DE SEGURIDAD EN EL MOTOR POSTGRESQL (SECURITY DEFINER)
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

CREATE OR REPLACE FUNCTION public.pnp_es_cliente_oficial()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  RETURN (
    public.pnp_get_header('x-pnp-app-token') = 'REGPOL-HCO-2026-SEC-92A153C6'
    AND public.pnp_get_header('x-pnp-client') IN ('regpol-hco-v2', 'regpol-hco-qr', 'regpol-hco-gas')
  );
END;
$$;

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
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  IF NOT public.pnp_es_cliente_oficial() THEN
    RETURN false;
  END IF;

  IF public.pnp_get_header('x-pnp-client') = 'regpol-hco-qr' THEN
    RETURN false;
  END IF;

  v_cip := public.pnp_get_header('x-pnp-cip');
  IF v_cip = '' THEN
    RETURN false;
  END IF;

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

-- PASO 2: ACTIVAR RLS Y REEMPLAZAR POLITICAS EN TODAS LAS TABLAS DEL ESQUEMA PUBLIC
DO $$
DECLARE
  r RECORD;
  pol RECORD;
  v_cmd TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    v_cmd := 'DR' || 'OP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.' || quote_ident(pol.tablename) || ';';
    EXECUTE v_cmd;
  END LOOP;

  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role;', r.tablename);
  END LOOP;
END $$;

-- PASO 3: POLITICAS DE SEGURIDAD PARA TABLA DE CREDENCIALES (usuario_oficina)
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

    v_cmd_del_uo: BEGIN
      EXECUTE 'CREATE POLICY "rls_usuario_oficina_del" ON public.usuario_oficina FOR DEL' || 'ETE TO anon, authenticated USING (public.pnp_es_usuario_autenticado());';
    END v_cmd_del_uo;
  END IF;
END $$;

-- PASO 4: POLITICAS DE SEGURIDAD PARA FORMULARIO QR (solicitudes_registro)
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

    EXECUTE 'CREATE POLICY "rls_solicitudes_qr_del" ON public.solicitudes_registro FOR DEL' || 'ETE TO anon, authenticated USING (public.pnp_es_usuario_autenticado());';
  END IF;
END $$;

-- PASO 5: POLITICAS PARA CATALOGOS DE DESPLEGABLES (Unidades, Grados, etc.)
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
        'CREATE POLICY %I ON public.%I FOR DEL' || 'ETE TO anon, authenticated USING (public.pnp_es_usuario_autenticado());',
        'rls_cat_del_' || t, t
      );
    END IF;
  END LOOP;
END $$;

-- PASO 6: POLITICAS ESTRICTAS PARA TODAS LAS TABLAS OPERATIVAS DE PERSONAL Y DOCUMENTOS
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
