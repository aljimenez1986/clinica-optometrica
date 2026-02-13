-- ============================================
-- Script de Migración: Agregar columnas faltantes
-- ============================================
-- Ejecuta este script si tu tabla 'pacientes' ya existe
-- pero le faltan algunas columnas
-- Ve a: https://app.supabase.com → Tu Proyecto → SQL Editor

-- Verificar y agregar columnas si no existen
-- (PostgreSQL no tiene IF NOT EXISTS para ALTER TABLE ADD COLUMN directamente)

-- Agregar columna 'id_paciente' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='id_paciente') THEN
        ALTER TABLE pacientes ADD COLUMN id_paciente TEXT;
    END IF;
END $$;

-- Agregar columna 'genero' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='genero') THEN
        ALTER TABLE pacientes ADD COLUMN genero TEXT;
    END IF;
END $$;

-- Agregar columna 'genero_otro' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='genero_otro') THEN
        ALTER TABLE pacientes ADD COLUMN genero_otro TEXT;
    END IF;
END $$;

-- Agregar columna 'fecha_nacimiento' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='fecha_nacimiento') THEN
        ALTER TABLE pacientes ADD COLUMN fecha_nacimiento DATE;
    END IF;
END $$;

-- Agregar columna 'telefono' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='telefono') THEN
        ALTER TABLE pacientes ADD COLUMN telefono TEXT;
    END IF;
END $$;

-- Agregar columna 'email' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='email') THEN
        ALTER TABLE pacientes ADD COLUMN email TEXT;
    END IF;
END $$;

-- Agregar columna 'graduacion_od' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='graduacion_od') THEN
        ALTER TABLE pacientes ADD COLUMN graduacion_od TEXT;
    END IF;
END $$;

-- Agregar columna 'graduacion_oi' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='graduacion_oi') THEN
        ALTER TABLE pacientes ADD COLUMN graduacion_oi TEXT;
    END IF;
END $$;

-- Agregar columna 'observaciones' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='observaciones') THEN
        ALTER TABLE pacientes ADD COLUMN observaciones TEXT;
    END IF;
END $$;

-- Agregar restricción UNIQUE a id_paciente si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'pacientes_id_paciente_unique'
    ) THEN
        ALTER TABLE pacientes ADD CONSTRAINT pacientes_id_paciente_unique UNIQUE (id_paciente);
    END IF;
END $$;

-- Crear índice único si no existe
CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_id_paciente_unique ON pacientes(id_paciente);

-- Verificar columnas existentes (para depuración)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pacientes' 
ORDER BY ordinal_position;

