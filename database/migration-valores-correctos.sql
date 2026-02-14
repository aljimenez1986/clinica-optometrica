-- ============================================
-- Script de Migración: Agregar valores_correctos
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Ve a: https://app.supabase.com → Tu Proyecto → SQL Editor
--
-- Este script agrega la columna valores_correctos a la tabla test_pasos
-- si no existe ya.

-- Agregar columna valores_correctos si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'test_pasos' 
        AND column_name = 'valores_correctos'
    ) THEN
        ALTER TABLE test_pasos 
    ADD COLUMN valores_correctos JSONB;
    
    RAISE NOTICE 'Columna valores_correctos agregada exitosamente';
ELSE
    RAISE NOTICE 'La columna valores_correctos ya existe';
END IF;
END $$;

-- ============================================
-- Verificación
-- ============================================
-- Para verificar que la columna se agregó correctamente, ejecuta:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'test_pasos' 
-- AND column_name = 'valores_correctos';


