#!/bin/bash

# --- CONFIGURACIÓN ---
$URL_LOCAL="postgresql://optopad:optopad@localhost:5432/optopad"
$URL_PROD="postgresql://optopad:optopad@147.156.4.143:5432/optopad"
$ARCHIVO_BACKUP = "C:\temp\backup_migracion.sql"
# Crear carpeta temporal si no existe
if (!(Test-Path "C:\temp")) { New-Item -ItemType Directory -Path "C:\temp" }

Write-Host "🐘 Iniciando migración desde Windows (Local) hacia Ubuntu (Producción)..." -ForegroundColor Cyan

# 1. Exportar datos de Local (Windows)
Write-Host "📥 Extrayendo datos de la DB local..." -ForegroundColor Yellow
& pg_dump --clean --if-exists --no-owner --no-privileges --dbname=$URL_LOCAL -f $ARCHIVO_BACKUP

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Exportación completada." -ForegroundColor Green
} else {
    Write-Host "❌ Error al exportar localmente. Revisa tus credenciales o si pg_dump está en el PATH." -ForegroundColor Red
    exit
}

