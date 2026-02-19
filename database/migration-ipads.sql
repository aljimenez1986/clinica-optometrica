-- ============================================
-- Migración: Tabla iPads y vinculación con test_configs
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Después de ejecutar tests-schema.sql (tablas test_configs, test_pasos)

-- 1. Crear tabla ipads
CREATE TABLE IF NOT EXISTS ipads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ipads_created_at ON ipads(created_at DESC);

CREATE OR REPLACE FUNCTION update_ipads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ipads_updated_at
    BEFORE UPDATE ON ipads
    FOR EACH ROW
    EXECUTE FUNCTION update_ipads_updated_at();

ALTER TABLE ipads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer ipads"
  ON ipads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden insertar ipads"
  ON ipads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden actualizar ipads"
  ON ipads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden eliminar ipads"
  ON ipads FOR DELETE TO authenticated USING (true);

-- 2. Añadir ipad_id a test_configs
ALTER TABLE test_configs
  ADD COLUMN IF NOT EXISTS ipad_id UUID REFERENCES ipads(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_test_configs_ipad_id ON test_configs(ipad_id);

-- 3. Asignar configs existentes (ipad_id NULL) a un iPad por defecto
--    Crea un iPad "Por defecto" si no existe y asigna las configs huérfanas
INSERT INTO ipads (nombre, marca, modelo)
  SELECT 'Por defecto', 'Apple', 'Asignar después'
  WHERE EXISTS (SELECT 1 FROM test_configs WHERE ipad_id IS NULL LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM ipads WHERE nombre = 'Por defecto' LIMIT 1);

UPDATE test_configs
  SET ipad_id = (SELECT id FROM ipads WHERE nombre = 'Por defecto' LIMIT 1)
  WHERE ipad_id IS NULL;

-- 4. ipad_id obligatorio y unicidad por (ipad_id, tipo_test)
ALTER TABLE test_configs DROP CONSTRAINT IF EXISTS test_configs_tipo_test_key;
DROP INDEX IF EXISTS idx_test_configs_ipad_tipo;
DROP INDEX IF EXISTS idx_test_configs_tipo_sin_ipad;

ALTER TABLE test_configs ALTER COLUMN ipad_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_configs_ipad_tipo
  ON test_configs(ipad_id, tipo_test);

-- NOTA: No existe configuración global. Toda configuración de test pertenece a un iPad.
