-- ============================================
-- Migración: Clínico que registra cada paciente
-- ============================================
-- Ejecuta en Supabase SQL Editor
-- Requiere: app_usuario, pacientes

-- 1. Añadir columna registrado_por (usuario app_usuario que creó el paciente)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES app_usuario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pacientes_registrado_por ON pacientes(registrado_por);

-- 2. Actualizar RLS: admin ve todo, clínico solo los que registró
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer pacientes" ON pacientes;
CREATE POLICY "Lectura pacientes: admin todo, clinico los suyos"
  ON pacientes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
    OR registrado_por IN (
      SELECT au.id FROM app_usuario au WHERE au.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar pacientes" ON pacientes;
CREATE POLICY "Insert pacientes: autenticados (registrado_por se asigna)"
  ON pacientes FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar pacientes" ON pacientes;
CREATE POLICY "Update pacientes: admin todo, clinico los suyos"
  ON pacientes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
    OR registrado_por IN (
      SELECT au.id FROM app_usuario au WHERE au.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar pacientes" ON pacientes;
CREATE POLICY "Delete pacientes: admin todo, clinico los suyos"
  ON pacientes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
    OR registrado_por IN (
      SELECT au.id FROM app_usuario au WHERE au.auth_user_id = auth.uid()
    )
  );

-- 3. test_resultados: admin ve todo, clínico solo resultados de sus pacientes
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer resultados de tests" ON test_resultados;
CREATE POLICY "Lectura test_resultados: admin todo, clinico sus pacientes"
  ON test_resultados FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
    OR EXISTS (
      SELECT 1 FROM pacientes p
      JOIN app_usuario au ON au.auth_user_id = auth.uid() AND p.registrado_por = au.id
      WHERE p.id = test_resultados.paciente_id
    )
  );

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar resultados de tests" ON test_resultados;
CREATE POLICY "Update test_resultados: admin todo, clinico sus pacientes"
  ON test_resultados FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
    OR EXISTS (
      SELECT 1 FROM pacientes p
      JOIN app_usuario au ON au.auth_user_id = auth.uid() AND p.registrado_por = au.id
      WHERE p.id = test_resultados.paciente_id
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar resultados de tests" ON test_resultados;
CREATE POLICY "Delete test_resultados: admin todo, clinico sus pacientes"
  ON test_resultados FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
    OR EXISTS (
      SELECT 1 FROM pacientes p
      JOIN app_usuario au ON au.auth_user_id = auth.uid() AND p.registrado_por = au.id
      WHERE p.id = test_resultados.paciente_id
    )
  );
