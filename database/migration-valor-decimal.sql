-- ============================================
-- Migración: Agregar valor_decimal a test_pasos
-- ============================================
-- Ejecuta en el SQL Editor de Supabase
-- Para Optopad Color: campo decimal hasta 20 decimales

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_pasos' AND column_name = 'valor_decimal'
    ) THEN
        ALTER TABLE test_pasos ADD COLUMN valor_decimal NUMERIC(40, 20);
        RAISE NOTICE 'Columna valor_decimal agregada';
    ELSE
        RAISE NOTICE 'La columna valor_decimal ya existe';
    END IF;
END $$;
