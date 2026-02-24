-- Añadir columna nombre a app_usuario
ALTER TABLE app_usuario ADD COLUMN IF NOT EXISTS nombre TEXT;
