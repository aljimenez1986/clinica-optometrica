-- ============================================
-- FIX: Eliminar TODAS las políticas de pacientes y recrear
-- ============================================
-- Si los clínicos siguen viendo todos los pacientes, ejecuta este script.
-- Elimina todas las políticas existentes (pueden tener nombres distintos)
-- y crea las correctas.

-- 1. Asegurar que existe la columna registrado_por
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES app_usuario(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pacientes_registrado_por ON pacientes(registrado_por);

-- 2. ELIMINAR TODAS las políticas de la tabla pacientes (por nombre)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT polname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pacientes'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pacientes', r.polname);
  END LOOP;
END $$;

-- 3. Crear las políticas correctas
CREATE POLICY "pacientes_select_admin_o_propios"
  ON pacientes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
    OR registrado_por IN (SELECT au.id FROM app_usuario au WHERE au.auth_user_id = auth.uid())
  );

CREATE POLICY "pacientes_insert_authenticated"
  ON pacientes FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "pacientes_update_admin_o_propios"
  ON pacientes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
    OR registrado_por IN (SELECT au.id FROM app_usuario au WHERE au.auth_user_id = auth.uid())
  )
  WITH CHECK (true);

CREATE POLICY "pacientes_delete_admin_o_propios"
  ON pacientes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
    OR registrado_por IN (SELECT au.id FROM app_usuario au WHERE au.auth_user_id = auth.uid())
  );
