#!/bin/bash

# Script de despliegue rápido para servidor propio
# Uso: ./scripts/deploy.sh

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue de Clínica Optométrica..."

# Verificar que existe .env.local
if [ ! -f .env.local ]; then
    echo "❌ Error: No se encontró el archivo .env.local"
    echo "   Copia .env.example a .env.local y completa las variables"
    exit 1
fi

# Verificar variables de entorno críticas
source .env.local

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Faltan variables de entorno obligatorias"
    echo "   NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas"
    exit 1
fi

echo "✅ Variables de entorno verificadas"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Compilar la aplicación
echo "🔨 Compilando aplicación..."
npm run build

echo "✅ Compilación completada"

# Verificar si PM2 está instalado
if command -v pm2 &> /dev/null; then
    echo "🔄 Reiniciando aplicación con PM2..."
    
    # Detener si ya está corriendo
    pm2 stop clinica-optometrica 2>/dev/null || true
    pm2 delete clinica-optometrica 2>/dev/null || true
    
    # Iniciar
    pm2 start npm --name "clinica-optometrica" -- start
    pm2 save
    
    echo "✅ Aplicación iniciada con PM2"
    echo "   Ver logs: pm2 logs clinica-optometrica"
    echo "   Estado: pm2 status"
else
    echo "⚠️  PM2 no está instalado. Instálalo con: npm install -g pm2"
    echo "   O inicia manualmente con: npm start"
fi

echo ""
echo "🎉 ¡Despliegue completado!"
echo "   La aplicación debería estar disponible en http://localhost:3000"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Configura Nginx como proxy reverso (ver DEPLOY.md)"
echo "   2. Configura SSL con Let's Encrypt"
echo "   3. Verifica que la base de datos esté configurada correctamente"

