# Guía de Despliegue en Servidor Propio

Esta guía explica todo lo que necesitas para desplegar tu aplicación Next.js de Clínica Optométrica en un servidor propio.

## 📋 Requisitos del Servidor

### 1. **Requisitos de Hardware/Software**
- **Sistema Operativo**: Linux (Ubuntu 20.04/22.04 recomendado) o Windows Server
- **RAM**: Mínimo 2GB (4GB recomendado)
- **CPU**: 2+ núcleos
- **Almacenamiento**: 10GB+ de espacio libre
- **Node.js**: Versión 18.x o superior
- **npm** o **yarn**: Para gestionar dependencias

### 2. **Servicios Necesarios**

#### A. **Base de Datos (Supabase)**
Tu aplicación usa Supabase como backend. Tienes dos opciones:

**Opción 1: Continuar usando Supabase Cloud (Recomendado para empezar)**
- No necesitas instalar nada adicional
- Solo necesitas las credenciales de tu proyecto Supabase
- Ventaja: Gestión automática, backups, escalabilidad

**Opción 2: Instalar Supabase Self-Hosted**
- Requiere Docker y Docker Compose
- Más complejo pero tienes control total
- Necesitas: PostgreSQL, PostgREST, GoTrue (auth), Storage, etc.
- Documentación: https://supabase.com/docs/guides/self-hosting

#### B. **Servidor Web (Opcional pero recomendado)**
- **Nginx** o **Apache**: Para servir la aplicación y manejar SSL
- **PM2** o **systemd**: Para mantener la aplicación corriendo

## 🔧 Pasos de Despliegue

### Paso 1: Preparar el Servidor

```bash
# Actualizar el sistema (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2
```

### Paso 2: Subir el Código al Servidor

**Opción A: Usando Git (Recomendado)**
```bash
# En el servidor
cd /var/www
git clone https://tu-repositorio.git clinica-optometrica
cd clinica-optometrica
```

**Opción B: Usando SCP/SFTP**
```bash
# Desde tu máquina local
scp -r ./clinica-optometrica usuario@tu-servidor:/var/www/
```

### Paso 3: Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# En el servidor
cd /var/www/clinica-optometrica
nano .env.local
```

Agrega las siguientes variables:

```env
# Variables de Supabase (obligatorias)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-de-supabase

# Puerto para producción (opcional, por defecto 3000)
PORT=3000

# URL de la aplicación (para producción)
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

**⚠️ IMPORTANTE**: 
- Obtén estas credenciales desde tu panel de Supabase: https://app.supabase.com
- Ve a tu proyecto → Settings → API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key

### Paso 4: Instalar Dependencias y Compilar

```bash
# Instalar dependencias
npm install

# Compilar la aplicación para producción
npm run build
```

### Paso 5: Ejecutar la Aplicación

**Opción A: Con PM2 (Recomendado)**
```bash
# Iniciar con PM2
pm2 start npm --name "clinica-optometrica" -- start

# Configurar PM2 para iniciar al arrancar el servidor
pm2 startup
pm2 save

# Ver logs
pm2 logs clinica-optometrica

# Comandos útiles
pm2 restart clinica-optometrica  # Reiniciar
pm2 stop clinica-optometrica      # Detener
pm2 delete clinica-optometrica    # Eliminar
```

**Opción B: Con systemd (Alternativa)**
```bash
# Crear archivo de servicio
sudo nano /etc/systemd/system/clinica-optometrica.service
```

Contenido del archivo:
```ini
[Unit]
Description=Clinica Optometrica Next.js App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/clinica-optometrica
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Activar y iniciar el servicio
sudo systemctl daemon-reload
sudo systemctl enable clinica-optometrica
sudo systemctl start clinica-optometrica

# Ver estado
sudo systemctl status clinica-optometrica
```

### Paso 6: Configurar Nginx como Proxy Reverso (Recomendado)

```bash
# Instalar Nginx
sudo apt install nginx -y

# Crear configuración
sudo nano /etc/nginx/sites-available/clinica-optometrica
```

Contenido de la configuración:
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activar el sitio
sudo ln -s /etc/nginx/sites-available/clinica-optometrica /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Paso 7: Configurar SSL con Let's Encrypt (HTTPS)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Renovación automática (ya está configurada)
sudo certbot renew --dry-run
```

## 🗄️ Configuración de la Base de Datos

### Si usas Supabase Cloud:
1. Ve a https://app.supabase.com
2. Crea o selecciona tu proyecto
3. Ve a SQL Editor y ejecuta este script para crear la tabla:

```sql
-- Crear tabla de pacientes
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_paciente TEXT NOT NULL,
  nombre TEXT,
  genero TEXT NOT NULL,
  genero_otro TEXT,
  fecha_nacimiento DATE NOT NULL,
  telefono TEXT,
  email TEXT,
  graduacion_od TEXT,
  graduacion_oi TEXT,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_pacientes_id_paciente ON pacientes(id_paciente);
CREATE INDEX IF NOT EXISTS idx_pacientes_created_at ON pacientes(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

-- Política: Solo usuarios autenticados pueden leer/escribir
CREATE POLICY "Usuarios autenticados pueden leer pacientes"
  ON pacientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar pacientes"
  ON pacientes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar pacientes"
  ON pacientes FOR DELETE
  TO authenticated
  USING (true);
```

4. Ve a Authentication → Users y crea un usuario administrador

### Si instalas Supabase Self-Hosted:
Sigue la documentación oficial: https://supabase.com/docs/guides/self-hosting

## 🔒 Seguridad

### 1. Firewall
```bash
# Configurar UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Actualizaciones de Seguridad
```bash
# Configurar actualizaciones automáticas
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 3. Variables de Entorno
- **NUNCA** subas el archivo `.env.local` a Git
- Asegúrate de que esté en `.gitignore`
- Usa permisos restrictivos: `chmod 600 .env.local`

## 📊 Monitoreo y Mantenimiento

### Ver logs de la aplicación:
```bash
# Con PM2
pm2 logs clinica-optometrica

# Con systemd
sudo journalctl -u clinica-optometrica -f
```

### Actualizar la aplicación:
```bash
cd /var/www/clinica-optometrica
git pull origin main
npm install
npm run build
pm2 restart clinica-optometrica
```

### Backup de la base de datos:
Si usas Supabase Cloud, los backups son automáticos. Si usas self-hosted, configura backups regulares de PostgreSQL.

## 🐛 Solución de Problemas

### La aplicación no inicia:
1. Verifica las variables de entorno: `cat .env.local`
2. Revisa los logs: `pm2 logs` o `sudo journalctl -u clinica-optometrica`
3. Verifica que el puerto 3000 esté libre: `sudo netstat -tulpn | grep 3000`

### Error de conexión a Supabase:
1. Verifica que las credenciales en `.env.local` sean correctas
2. Verifica que tu IP del servidor esté permitida en Supabase (si usas restricciones)
3. Prueba la conexión desde el servidor: `curl https://tu-proyecto.supabase.co`

### Error 502 Bad Gateway:
1. Verifica que la aplicación esté corriendo: `pm2 list`
2. Verifica los logs de Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Verifica que el proxy apunte al puerto correcto

## 📝 Checklist de Despliegue

- [ ] Servidor con Node.js 18+ instalado
- [ ] Código subido al servidor
- [ ] Archivo `.env.local` configurado con credenciales de Supabase
- [ ] Dependencias instaladas (`npm install`)
- [ ] Aplicación compilada (`npm run build`)
- [ ] Aplicación corriendo con PM2 o systemd
- [ ] Nginx configurado como proxy reverso
- [ ] SSL/HTTPS configurado con Let's Encrypt
- [ ] Tabla `pacientes` creada en Supabase
- [ ] Usuario administrador creado en Supabase
- [ ] Firewall configurado
- [ ] Dominio apuntando al servidor (DNS configurado)

## 🆘 Recursos Adicionales

- **Documentación Next.js**: https://nextjs.org/docs/deployment
- **Documentación Supabase**: https://supabase.com/docs
- **PM2**: https://pm2.keymetrics.io/docs/
- **Nginx**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/

## 💡 Alternativas de Despliegue

Si prefieres no gestionar un servidor propio, considera:
- **Vercel** (recomendado para Next.js): https://vercel.com
- **Netlify**: https://netlify.com
- **Railway**: https://railway.app
- **DigitalOcean App Platform**: https://www.digitalocean.com/products/app-platform

Estas plataformas simplifican mucho el despliegue pero requieren un plan de pago para producción.

