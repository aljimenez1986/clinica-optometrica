-- ============================================
-- Esquema PostgreSQL STANDALONE (sin Supabase)
-- ============================================
-- Para despliegue en VM con PostgreSQL local.
-- Ejecutar como usuario con permisos sobre la base de datos.

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. Tabla de usuarios (reemplaza auth.users + app_usuario)
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre TEXT,
  role TEXT NOT NULL CHECK (role IN ('administrador', 'clinico')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);

CREATE OR REPLACE FUNCTION update_usuarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_usuarios_updated_at();

-- ============================================
-- 2. Tabla pacientes
-- ============================================
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_paciente TEXT NOT NULL UNIQUE,
  nombre TEXT,
  genero TEXT NOT NULL,
  genero_otro TEXT,
  fecha_nacimiento DATE NOT NULL,
  telefono TEXT,
  email TEXT,
  graduacion_od TEXT,
  graduacion_oi TEXT,
  observaciones TEXT,
  registrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_id_paciente_unique ON pacientes(id_paciente);
CREATE INDEX IF NOT EXISTS idx_pacientes_created_at ON pacientes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pacientes_fecha_nacimiento ON pacientes(fecha_nacimiento);
CREATE INDEX IF NOT EXISTS idx_pacientes_registrado_por ON pacientes(registrado_por);

CREATE OR REPLACE FUNCTION update_pacientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pacientes_updated_at ON pacientes;
CREATE TRIGGER update_pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW
  EXECUTE FUNCTION update_pacientes_updated_at();

-- ============================================
-- 3. Tabla iPads
-- ============================================
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

DROP TRIGGER IF EXISTS update_ipads_updated_at ON ipads;
CREATE TRIGGER update_ipads_updated_at
  BEFORE UPDATE ON ipads
  FOR EACH ROW
  EXECUTE FUNCTION update_ipads_updated_at();

-- ============================================
-- 4. Tabla ipad_clinico
-- ============================================
CREATE TABLE IF NOT EXISTS ipad_clinico (
  ipad_id UUID NOT NULL REFERENCES ipads(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (ipad_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_ipad_clinico_usuario_id ON ipad_clinico(usuario_id);

-- ============================================
-- 5. Tablas de tests
-- ============================================
CREATE TABLE IF NOT EXISTS test_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_test TEXT NOT NULL CHECK (tipo_test IN ('rejilla_amsler', 'agudeza_visual', 'optopad_color', 'optopad_csf')),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  ipad_id UUID NOT NULL REFERENCES ipads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_configs_ipad_tipo ON test_configs(ipad_id, tipo_test);

CREATE TABLE IF NOT EXISTS test_pasos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_config_id UUID NOT NULL REFERENCES test_configs(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  nombre_archivo TEXT,
  ruta_archivo TEXT,
  url_publica TEXT,
  descripcion TEXT,
  valores_correctos JSONB,
  valor_decimal NUMERIC(40, 20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(test_config_id, orden)
);

CREATE INDEX IF NOT EXISTS idx_test_pasos_test_config_id ON test_pasos(test_config_id);
CREATE INDEX IF NOT EXISTS idx_test_pasos_orden ON test_pasos(test_config_id, orden);

CREATE TABLE IF NOT EXISTS test_resultados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  test_config_id UUID NOT NULL REFERENCES test_configs(id) ON DELETE CASCADE,
  paso_actual INTEGER NOT NULL,
  datos_respuesta JSONB,
  fecha_realizacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_test_resultados_paciente_id ON test_resultados(paciente_id);
CREATE INDEX IF NOT EXISTS idx_test_resultados_test_config_id ON test_resultados(test_config_id);
CREATE INDEX IF NOT EXISTS idx_test_resultados_fecha ON test_resultados(fecha_realizacion DESC);

-- Triggers updated_at para test_configs y test_resultados
CREATE OR REPLACE FUNCTION update_test_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_test_configs_updated_at ON test_configs;
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

DROP TRIGGER IF EXISTS update_test_resultados_updated_at ON test_resultados;
CREATE TRIGGER update_test_resultados_updated_at
  BEFORE UPDATE ON test_resultados
  FOR EACH ROW
  EXECUTE FUNCTION update_test_resultados_updated_at();

-- ============================================
-- Datos iniciales: configuraciones de tests
-- ============================================
-- Requiere que exista al menos un iPad. Crear uno "Por defecto" si no hay.
INSERT INTO ipads (id, nombre, marca, modelo)
  SELECT gen_random_uuid(), 'Por defecto', 'Apple', 'Asignar después'
  WHERE NOT EXISTS (SELECT 1 FROM ipads LIMIT 1);

INSERT INTO test_configs (tipo_test, nombre, descripcion, ipad_id)
  SELECT 'rejilla_amsler', 'Rejilla de Amsler', 'Test para detectar distorsiones en la visión central', id FROM ipads WHERE nombre = 'Por defecto' LIMIT 1
  WHERE NOT EXISTS (SELECT 1 FROM test_configs WHERE tipo_test = 'rejilla_amsler');
INSERT INTO test_configs (tipo_test, nombre, descripcion, ipad_id)
  SELECT 'agudeza_visual', 'Agudeza Visual', 'Medición de la agudeza visual', id FROM ipads WHERE nombre = 'Por defecto' LIMIT 1
  WHERE NOT EXISTS (SELECT 1 FROM test_configs WHERE tipo_test = 'agudeza_visual');
INSERT INTO test_configs (tipo_test, nombre, descripcion, ipad_id)
  SELECT 'optopad_color', 'Optopad Color', 'Test de percepción de colores', id FROM ipads WHERE nombre = 'Por defecto' LIMIT 1
  WHERE NOT EXISTS (SELECT 1 FROM test_configs WHERE tipo_test = 'optopad_color');
INSERT INTO test_configs (tipo_test, nombre, descripcion, ipad_id)
  SELECT 'optopad_csf', 'Optopad CSF', 'Test de sensibilidad al contraste', id FROM ipads WHERE nombre = 'Por defecto' LIMIT 1
  WHERE NOT EXISTS (SELECT 1 FROM test_configs WHERE tipo_test = 'optopad_csf');
