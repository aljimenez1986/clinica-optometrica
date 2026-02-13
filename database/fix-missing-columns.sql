-- ============================================
-- Script Rápido: Agregar columna 'email' faltante
-- ============================================
-- Si recibes el error: "Could not find the 'email' column"
-- Ejecuta este script en el SQL Editor de Supabase

-- Agregar columna 'email' si no existe
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Agregar otras columnas que puedan faltar
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS id_paciente TEXT,
ADD COLUMN IF NOT EXISTS genero TEXT,
ADD COLUMN IF NOT EXISTS genero_otro TEXT,
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS telefono TEXT,
ADD COLUMN IF NOT EXISTS graduacion_od TEXT,
ADD COLUMN IF NOT EXISTS graduacion_oi TEXT,
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Verificar que todas las columnas existen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pacientes' 
ORDER BY ordinal_position;

