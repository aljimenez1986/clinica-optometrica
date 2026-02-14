-- ============================================
-- Script SQL para crear las tablas de tests
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Ve a: https://app.supabase.com → Tu Proyecto → SQL Editor

-- Tabla: Configuración de Tests (plantillas)
CREATE TABLE IF NOT EXISTS test_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_test TEXT NOT NULL UNIQUE CHECK (tipo_test IN ('rejilla_amsler', 'agudeza_visual', 'optopad_color', 'optopad_csf')),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla: Pasos de cada Test (imágenes en orden)
CREATE TABLE IF NOT EXISTS test_pasos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_config_id UUID NOT NULL REFERENCES test_configs(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  nombre_archivo TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  url_publica TEXT NOT NULL,
  descripcion TEXT,
  valores_correctos JSONB, -- Array de valores correctos (solo para agudeza_visual, entre 3 y 5 valores)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(test_config_id, orden)
);

-- Tabla: Resultados de Tests realizados por pacientes
CREATE TABLE IF NOT EXISTS test_resultados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  test_config_id UUID NOT NULL REFERENCES test_configs(id) ON DELETE CASCADE,
  paso_actual INTEGER NOT NULL,
  datos_respuesta JSONB, -- Almacena las respuestas del paciente en formato JSON
  fecha_realizacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_test_pasos_test_config_id ON test_pasos(test_config_id);
CREATE INDEX IF NOT EXISTS idx_test_pasos_orden ON test_pasos(test_config_id, orden);
CREATE INDEX IF NOT EXISTS idx_test_resultados_paciente_id ON test_resultados(paciente_id);
CREATE INDEX IF NOT EXISTS idx_test_resultados_test_config_id ON test_resultados(test_config_id);
CREATE INDEX IF NOT EXISTS idx_test_resultados_fecha ON test_resultados(fecha_realizacion DESC);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_test_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_test_configs_updated_at 
    BEFORE UPDATE ON test_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_test_configs_updated_at();

CREATE OR REPLACE FUNCTION update_test_resultados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_test_resultados_updated_at 
    BEFORE UPDATE ON test_resultados 
    FOR EACH ROW 
    EXECUTE FUNCTION update_test_resultados_updated_at();

-- ============================================
-- SEGURIDAD: Row Level Security (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE test_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_pasos ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_resultados ENABLE ROW LEVEL SECURITY;

-- Políticas para test_configs
CREATE POLICY "Usuarios autenticados pueden leer configuraciones de tests"
  ON test_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar configuraciones de tests"
  ON test_configs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar configuraciones de tests"
  ON test_configs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar configuraciones de tests"
  ON test_configs FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para test_pasos
CREATE POLICY "Usuarios autenticados pueden leer pasos de tests"
  ON test_pasos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar pasos de tests"
  ON test_pasos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar pasos de tests"
  ON test_pasos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar pasos de tests"
  ON test_pasos FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para test_resultados
CREATE POLICY "Usuarios autenticados pueden leer resultados de tests"
  ON test_resultados FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar resultados de tests"
  ON test_resultados FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar resultados de tests"
  ON test_resultados FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar resultados de tests"
  ON test_resultados FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- DATOS INICIALES: Crear configuraciones de tests
-- ============================================

-- Insertar configuraciones iniciales para cada tipo de test
INSERT INTO test_configs (tipo_test, nombre, descripcion) VALUES
  ('rejilla_amsler', 'Rejilla de Amsler', 'Test para detectar distorsiones en la visión central'),
  ('agudeza_visual', 'Agudeza Visual', 'Medición de la agudeza visual'),
  ('optopad_color', 'Optopad Color', 'Test de percepción de colores'),
  ('optopad_csf', 'Optopad CSF', 'Test de sensibilidad al contraste')
ON CONFLICT (tipo_test) DO NOTHING;

-- ============================================
-- NOTAS:
-- ============================================
-- 1. test_configs: Define los tipos de tests disponibles
-- 2. test_pasos: Define las imágenes y su orden para cada test
-- 3. test_resultados: Almacena los datos registrados por los pacientes
--
-- 4. Para configurar Storage:
--    a) Ve a Storage en Supabase
--    b) Crea un bucket llamado "tests"
--    c) Configura las políticas según necesites
--
-- 5. Estructura de almacenamiento:
--    tests/
--      └── {tipo_test}/
--          └── paso_{orden}_{timestamp}.{extension}
