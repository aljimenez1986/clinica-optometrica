-- ============================================
-- Script SQL para crear la tabla de pacientes
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Ve a: https://app.supabase.com → Tu Proyecto → SQL Editor

-- Crear tabla de pacientes
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Si la tabla ya existe, agregar restricción única (ejecutar solo si es necesario)
-- ALTER TABLE pacientes ADD CONSTRAINT pacientes_id_paciente_unique UNIQUE (id_paciente);

-- Crear índices para mejorar el rendimiento
CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_id_paciente_unique ON pacientes(id_paciente);
CREATE INDEX IF NOT EXISTS idx_pacientes_created_at ON pacientes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pacientes_fecha_nacimiento ON pacientes(fecha_nacimiento);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_pacientes_updated_at 
    BEFORE UPDATE ON pacientes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEGURIDAD: Row Level Security (RLS)
-- ============================================

-- Habilitar Row Level Security
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden leer todos los pacientes
CREATE POLICY "Usuarios autenticados pueden leer pacientes"
  ON pacientes FOR SELECT
  TO authenticated
  USING (true);

-- Política: Usuarios autenticados pueden insertar pacientes
CREATE POLICY "Usuarios autenticados pueden insertar pacientes"
  ON pacientes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Usuarios autenticados pueden actualizar pacientes
CREATE POLICY "Usuarios autenticados pueden actualizar pacientes"
  ON pacientes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Usuarios autenticados pueden eliminar pacientes
CREATE POLICY "Usuarios autenticados pueden eliminar pacientes"
  ON pacientes FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- NOTAS:
-- ============================================
-- 1. El campo 'id_paciente' tiene restricción UNIQUE para evitar duplicados
--    La aplicación también valida esto en el frontend antes de guardar
--
-- 2. Después de ejecutar este script, ve a Authentication → Users
--    y crea un usuario administrador para poder iniciar sesión
--
-- 3. Si quieres permitir acceso sin autenticación (NO recomendado para producción),
--    puedes deshabilitar RLS o crear políticas más permisivas
--
-- 4. Para verificar que todo funciona:
--    SELECT * FROM pacientes;
--
-- 5. Si la tabla ya existe y necesitas agregar columnas faltantes:
--    Ejecuta el script 'migration.sql' en lugar de este
--
-- 6. Si la tabla ya existe y solo necesitas agregar la restricción única:
--    ALTER TABLE pacientes ADD CONSTRAINT pacientes_id_paciente_unique UNIQUE (id_paciente);

