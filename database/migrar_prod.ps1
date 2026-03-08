<#
.SYNOPSIS
    Migra datos de la base de datos de desarrollo (PostgreSQL) a producción.

.DESCRIPTION
    Exporta datos de la BD local y los importa en la BD de producción.
    Usa túnel SSH para conectar a producción (puerto 5432 no expuesto).
    Guarda el backup en UTF-8 sin BOM para evitar errores de codificación.
#>

# --- CONFIGURACIÓN ---
# Desarrollo: PostgreSQL local (Windows)
$URL_DEV = "postgresql://optopad:optopad@localhost:5432/optopad"

# Producción: se conecta vía túnel SSH (ver abajo)
$PG_USER = "optopad"
$PG_PASSWORD = "optopad"
$PG_DATABASE = "optopad"

# Túnel SSH: producción solo permite conexión por SSH
# Requiere: autenticación por clave SSH (ssh-copy-id) para que no pida contraseña
$SSH_USER = "root"           # Usuario SSH en el servidor de producción
$SSH_HOST = "147.156.4.143"        # IP o hostname del servidor
$SSH_PORT = 22                     # Puerto SSH (por defecto 22)
$REMOTE_PG_PORT = 5432             # Puerto de PostgreSQL en el servidor remoto
$LOCAL_TUNNEL_PORT = 3308         # Puerto local que hará de túnel (debe estar libre)

# Archivo de backup temporal
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackupFile = Join-Path $ScriptDir "backup_migracion.sql"

# Modo: "data" = solo datos | "full" = esquema + datos
$Modo = "data"

# Túnel: true = script lo gestiona automáticamente | false = tú abres el túnel en otra terminal
$TunelAutomatico = $false

# Reemplazar: true = vaciar tablas de prod antes de importar (datos de dev reemplazan prod)
$ReemplazarProd = $true

# --- SCRIPT ---
$TunnelProcess = $null

try {
    Write-Host ""
    Write-Host "Migración: Desarrollo (Windows) -> Producción (via SSH tunnel)" -ForegroundColor Cyan
    Write-Host "Archivo: $BackupFile" -ForegroundColor Gray
    Write-Host ""

    if (-not $TunelAutomatico) {
        Write-Host "Modo: TÚNEL MANUAL" -ForegroundColor Magenta
        Write-Host "Antes de continuar, abre OTRA terminal y ejecuta:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  ssh -L ${LOCAL_TUNNEL_PORT}:127.0.0.1:${REMOTE_PG_PORT} ${SSH_USER}@${SSH_HOST} -N" -ForegroundColor White
        Write-Host ""
        Write-Host "Mantén esa terminal abierta. Luego pulsa Enter aquí para continuar..." -ForegroundColor Yellow
        Read-Host
    }

    if ($TunelAutomatico) {
        # 0. Iniciar túnel SSH
        Write-Host "[0/4] Iniciando túnel SSH hacia $SSH_HOST..." -ForegroundColor Yellow
        $TunnelProcess = Start-Process -FilePath "ssh" -ArgumentList `
            "-L", "${LOCAL_TUNNEL_PORT}:127.0.0.1:${REMOTE_PG_PORT}",
            "-o", "StrictHostKeyChecking=no",
            "-o", "BatchMode=yes",
            "-N",
            "${SSH_USER}@${SSH_HOST}" `
            -PassThru -WindowStyle Hidden

        $maxWait = 15
        $elapsed = 0
        $portOpen = $false
        while ($elapsed -lt $maxWait) {
            Start-Sleep -Seconds 1
            $elapsed++
            if ($TunnelProcess.HasExited) {
                throw "El túnel SSH falló (¿clave SSH configurada? Ejecuta: ssh-copy-id ${SSH_USER}@${SSH_HOST})"
            }
            try {
                $tcp = New-Object System.Net.Sockets.TcpClient
                $tcp.Connect("127.0.0.1", $LOCAL_TUNNEL_PORT)
                $tcp.Close()
                $portOpen = $true
                break
            } catch { }
        }
        if (-not $portOpen) {
            throw "El puerto $LOCAL_TUNNEL_PORT no respondió a tiempo."
        }
        Write-Host "   Túnel activo (localhost:$LOCAL_TUNNEL_PORT -> $SSH_HOST:5432)" -ForegroundColor Green
    }

    # URL de producción a través del túnel
    $URL_PROD = "postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${LOCAL_TUNNEL_PORT}/${PG_DATABASE}"

    # 1. Exportar desde desarrollo
    Write-Host "[1/4] Exportando desde base de datos local..." -ForegroundColor Yellow
    if ($Modo -eq "data") {
        pg_dump --data-only --no-owner --no-privileges -d $URL_DEV -f $BackupFile
    } else {
        pg_dump --clean --if-exists --no-owner --no-privileges -d $URL_DEV -f $BackupFile
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Fallo al exportar. Verifica pg_dump y la BD local."
    }
    Write-Host "   Exportación completada." -ForegroundColor Green

    # 2. Convertir a UTF-8 sin BOM y compatibilidad con PostgreSQL < 17
    Write-Host "[2/4] Procesando backup (UTF-8, compatibilidad PG)..." -ForegroundColor Yellow
    try {
        $content = Get-Content -Path $BackupFile -Raw -Encoding UTF8
        # Quitar transaction_timeout (PG 17+): producción puede tener versión anterior
        $content = $content -replace "SET transaction_timeout = 0;\r?\n", ""
        # Quitar \restrict si existe
        $content = $content -replace "\\restrict [^\r\n]+\r?\n", ""
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($BackupFile, $content, $utf8NoBom)
    } catch {
        Write-Host "   Advertencia: No se pudo procesar." -ForegroundColor DarkYellow
    }
    Write-Host "   Listo." -ForegroundColor Green

    # 3. Vaciar prod (opcional) antes de importar
    if ($ReemplazarProd) {
        Write-Host "[3/4] Vaciando tablas en producción..." -ForegroundColor Yellow
        psql -d $URL_PROD -c "TRUNCATE usuarios, ipads, pacientes, ipad_clinico, test_configs, test_pasos, test_resultados RESTART IDENTITY CASCADE;"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   Advertencia: Truncate falló (¿tablas existen?). Continuando..." -ForegroundColor DarkYellow
        } else {
            Write-Host "   Tablas vaciadas." -ForegroundColor Green
        }
    }

    # 4. Importar en producción (via túnel)
    Write-Host "[4/4] Importando en producción (via túnel SSH)..." -ForegroundColor Yellow
    psql -d $URL_PROD -f $BackupFile

    if ($LASTEXITCODE -ne 0) {
        throw "Fallo al importar. Revisa credenciales y que el túnel esté activo en localhost:$LOCAL_TUNNEL_PORT"
    }

    Write-Host "Migración completada correctamente." -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
finally {
    if ($TunnelProcess -and !$TunnelProcess.HasExited) {
        Write-Host "Cerrando túnel SSH..." -ForegroundColor Gray
        Stop-Process -Id $TunnelProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
