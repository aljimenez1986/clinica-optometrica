# Guía de Despliegue en Servidor Propio

Esta guía explica todo lo que necesitas para desplegar tu aplicación Next.js de Clínica Optométrica en un servidor propio usando PostgreSQL standalone.

## 📋 Requisitos del Servidor

### 1. **Requisitos de Hardware/Software**
- **Sistema Operativo**: Linux (Ubuntu 20.04/22.04 recomendado) o Windows Server
- **RAM**: Mínimo 2GB (4GB recomendado)
- **CPU**: 2+ núcleos
- **Almacenamiento**: 10GB+ de espacio libre
- **Node.js**: Versión 18.x o superior
- **npm** o **yarn**: Para gestionar dependencias

### 2. **Servicios Necesarios**

#### A. **Base de Datos (PostgreSQL standalone)**
Tu aplicación utiliza PostgreSQL en modo standalone. Debes tener un servidor PostgreSQL disponible y configurado con la base de datos correcta.

- Puedes usar PostgreSQL local o un servicio de base de datos en la nube
- La aplicación requiere `DATABASE_URL` en `.env.local`
- El esquema debe crearse desde `database/schema-standalone.sql`

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
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/optopad
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secreto-largo

# Puerto para producción (opcional, por defecto 3000)
PORT=3000
```

**⚠️ IMPORTANTE**: 
- No subas `.env.local` a Git
- Usa permisos restrictivos: `chmod 600 .env.local`

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

### Requisitos de PostgreSQL
- PostgreSQL instalado y accesible desde el servidor
- `DATABASE_URL` definido en `.env.local`
- Esquema creado con `database/schema-standalone.sql`

### Variables de entorno básicas
Asegúrate de que `.env.local` contenga al menos:

```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/optopad
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secreto-largo
```

### Crear el esquema de base de datos
Ejecuta el script en PostgreSQL:

```bash
psql "$DATABASE_URL" -f database/schema-standalone.sql
```

### Crear el primer usuario administrador
Ejecuta:

```bash
node scripts/create-admin-standalone.js
```

### Ajustes de seguridad
- **NUNCA** subas el archivo `.env.local` a Git
- Asegúrate de que `.env.local` está en `.gitignore`
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
Configura backups regulares de PostgreSQL con `pg_dump` o la solución de tu proveedor.

## 🐛 Solución de Problemas

### La aplicación no inicia:
1. Verifica las variables de entorno: `cat .env.local`
2. Revisa los logs: `pm2 logs` o `sudo journalctl -u clinica-optometrica`
3. Verifica que el puerto 3000 esté libre: `sudo netstat -tulpn | grep 3000`

### Error de conexión a la base de datos:
1. Verifica que `DATABASE_URL` en `.env.local` sea correcta
2. Verifica que el servidor PostgreSQL esté en ejecución
3. Prueba la conexión desde el servidor: `psql "$DATABASE_URL" -c '\l'`

### Error 502 Bad Gateway:
1. Verifica que la aplicación esté corriendo: `pm2 list`
2. Verifica los logs de Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Verifica que el proxy apunte al puerto correcto

## 📝 Checklist de Despliegue

- [ ] Servidor con Node.js 18+ instalado
- [ ] Código subido al servidor
- [ ] Archivo `.env.local` configurado con `DATABASE_URL`, `NEXTAUTH_URL` y `NEXTAUTH_SECRET`
- [ ] Dependencias instaladas (`npm install`)
- [ ] Aplicación compilada (`npm run build`)
- [ ] Aplicación corriendo con PM2 o systemd
- [ ] Nginx configurado como proxy reverso
- [ ] SSL/HTTPS configurado con Let's Encrypt
- [ ] Esquema de PostgreSQL creado con `database/schema-standalone.sql`
- [ ] Usuario administrador creado con `node scripts/create-admin-standalone.js`
- [ ] Firewall configurado
- [ ] Dominio apuntando al servidor (DNS configurado)

## 🆘 Recursos Adicionales

- **Documentación Next.js**: https://nextjs.org/docs/deployment
- **Documentación PostgreSQL**: https://www.postgresql.org/docs/
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

