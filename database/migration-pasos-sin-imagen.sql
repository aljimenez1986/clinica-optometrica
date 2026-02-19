-- ============================================
-- Permitir pasos sin imagen (p. ej. Optopad Color: solo respuesta correcta)
-- ============================================
-- Ejecuta en el SQL Editor de Supabase si ya tienes test_pasos creada

ALTER TABLE test_pasos
  ALTER COLUMN nombre_archivo DROP NOT NULL,
  ALTER COLUMN ruta_archivo DROP NOT NULL,
  ALTER COLUMN url_publica DROP NOT NULL;
