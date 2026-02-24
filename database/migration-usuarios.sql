-- ============================================
-- Migración: Usuarios de la aplicación y roles
-- ============================================
-- Ejecuta en Supabase SQL Editor
-- Requiere: auth.users (Supabase Auth)

-- 1. Tabla app_usuario (perfil extendido de auth.users)
CREATE TABLE IF NOT EXISTS app_usuario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrador', 'clinico')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_usuario_auth_user_id ON app_usuario(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_app_usuario_role ON app_usuario(role);

CREATE OR REPLACE FUNCTION update_app_usuario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_usuario_updated_at ON app_usuario;
CREATE TRIGGER update_app_usuario_updated_at
  BEFORE UPDATE ON app_usuario
  FOR EACH ROW
  EXECUTE FUNCTION update_app_usuario_updated_at();

ALTER TABLE app_usuario ENABLE ROW LEVEL SECURITY;

-- Bootstrap: primer insert si tabla vacía. Luego solo admins.
CREATE POLICY "Insert app_usuario: bootstrap o admin"
  ON app_usuario FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT COUNT(*) FROM app_usuario) = 0
    OR EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
  );

CREATE POLICY "Lectura app_usuario"
  ON app_usuario FOR SELECT TO authenticated USING (true);

CREATE POLICY "Update app_usuario: solo admin"
  ON app_usuario FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador'))
  WITH CHECK (true);

CREATE POLICY "Delete app_usuario: solo admin"
  ON app_usuario FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador'));

-- 2. Tabla ipad_clinico (asociación iPad <-> Clínico)
CREATE TABLE IF NOT EXISTS ipad_clinico (
  ipad_id UUID NOT NULL REFERENCES ipads(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES app_usuario(id) ON DELETE CASCADE,
  PRIMARY KEY (ipad_id, usuario_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ipad_clinico_usuario_id ON ipad_clinico(usuario_id);

ALTER TABLE ipad_clinico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura ipad_clinico"
  ON ipad_clinico FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert ipad_clinico: solo admin"
  ON ipad_clinico FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
  );

CREATE POLICY "Delete ipad_clinico: solo admin"
  ON ipad_clinico FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
  );

-- 3. Actualizar RLS de ipads: admin ve todo, clinico solo sus asignados
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer ipads" ON ipads;
CREATE POLICY "Lectura ipads: admin todo, clinico asignados"
  ON ipads FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
    OR id IN (
      SELECT ic.ipad_id FROM ipad_clinico ic
      JOIN app_usuario au ON au.id = ic.usuario_id
      WHERE au.auth_user_id = auth.uid()
    )
  );

-- Insert/Update/Delete ipads: solo admin
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar ipads" ON ipads;
CREATE POLICY "Insert ipads: solo admin"
  ON ipads FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador')
  );

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar ipads" ON ipads;
CREATE POLICY "Update ipads: solo admin"
  ON ipads FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador'))
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar ipads" ON ipads;
CREATE POLICY "Delete ipads: solo admin"
  ON ipads FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_usuario au WHERE au.auth_user_id = auth.uid() AND au.role = 'administrador'));
