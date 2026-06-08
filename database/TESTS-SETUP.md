# Configuración de Tests - Guía de Instalación

Esta guía explica cómo configurar el sistema de tests para definir las imágenes y su orden en modo standalone.

## 📋 Concepto

Los **tests son plantillas configurables** que definen:
- Qué imágenes mostrar
- En qué orden mostrarlas (pasos)
- Los pacientes luego registran datos cuando realizan estos tests

## 🔧 Pasos de Configuración

### 1. Crear las Tablas en la Base de Datos

Ejecuta el script `tests-schema.sql` en PostgreSQL:

```bash
psql "$DATABASE_URL" -f database/tests-schema.sql
```

Este script creará:
- `test_configs`: Configuraciones de cada tipo de test
- `test_pasos`: Imágenes y su orden para cada test
- `test_resultados`: Datos registrados por los pacientes

### 2. Uso de Archivos de Imagen

Las imágenes de cada paso se almacenan en el servidor local bajo `public/uploads`.

- La API de upload escribe archivos en `public/uploads`
- En producción, configura `UPLOAD_DIR` y `NEXT_PUBLIC_UPLOAD_BASE_URL` si necesitas rutas personalizadas

### 3. Configurar Tests en la Aplicación

1. Ve a la página de Tests en la aplicación (`/admin/tests`)
2. Selecciona un tipo de test (ej: "Rejilla de Amsler")
3. Agrega pasos (imágenes) en el orden deseado
4. Cada paso puede tener una descripción opcional

## 🎯 Tipos de Tests Disponibles

- **Rejilla de Amsler** 📐
- **Agudeza Visual** 👁️
- **Optopad Color** 🎨
- **Optopad CSF** 📊

## 📁 Estructura de Almacenamiento

Las imágenes se organizan en el storage de la siguiente manera:

```
tests/
  └── {tipo_test}/
      └── paso_{orden}_{timestamp}.{extension}
```

Ejemplo:
```
tests/
  └── rejilla_amsler/
      ├── paso_1_1705234567890.jpg
      ├── paso_2_1705234567891.jpg
      └── paso_3_1705234567892.png
```

## 🔄 Flujo de Trabajo

1. **Configuración (Admin)**: 
   - Selecciona un tipo de test
   - Agrega imágenes en orden (paso 1, paso 2, etc.)
   - Puede reordenar los pasos usando las flechas
   - Puede editar o eliminar pasos

2. **Uso (Pacientes)**:
   - Los pacientes realizan los tests configurados
   - Registran sus datos/respuestas (esto se implementará después)
   - Los datos se guardan en `test_resultados`

## ⚠️ Solución de Problemas

### Error: "Bucket not found"
- Verifica que el bucket `tests` existe en Storage
- Asegúrate de que el nombre sea exactamente `tests` (en minúsculas)

### Error: "Permission denied"
- Verifica las políticas de Storage
- Asegúrate de que el usuario esté autenticado
- Revisa que las políticas RLS estén configuradas correctamente

### Las imágenes no se muestran
- Verifica que el bucket sea público o que las políticas permitan lectura
- Revisa la URL pública en la consola del navegador
- Asegúrate de que la tabla `test_pasos` tenga la columna `url_publica` correctamente

### Error al reordenar
- Verifica que el orden sea un número válido
- Asegúrate de que no haya conflictos de orden (dos pasos con el mismo orden)

## 📝 Notas Adicionales

- Los tests son los mismos para todos los pacientes (configuración global)
- Cada test puede tener múltiples pasos (imágenes) en orden específico
- Los pasos se pueden reordenar usando las flechas arriba/abajo
- Los archivos se nombran automáticamente con timestamp para evitar duplicados
- El tamaño máximo por defecto es 10MB (configurable en el bucket)
- Los pacientes registran datos cuando realizan los tests (tabla `test_resultados`)
