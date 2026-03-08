# Guía de Despliegue - Optopad en VM Ubuntu 22.04

Esta guía cubre el despliegue de la aplicación **clinica-optometrica** en una máquina virtual Ubuntu 22.04 con acceso desde Internet, utilizando PostgreSQL y almacenamiento local (sin Supabase).

---

## 1. Solicitudes de Firewall / Red

Debes solicitar que se habiliten los siguientes puertos hacia la IP de tu VM:

| Puerto | Protocolo | Servicio   | Uso                                              |
|--------|-----------|------------|--------------------------------------------------|
| **22** | TCP       | SSH        | Acceso administrativo remoto                     |
| **80** | TCP       | HTTP       | Acceso público a la aplicación                  |
| **443**| TCP       | HTTPS      | Acceso seguro a la aplicación (recomendado)     |

### Texto sugerido para la solicitud

> **Asunto:** Apertura de puertos para despliegue de Optopad
>
> Solicitamos habilitar los siguientes puertos hacia la VM [IP_O_HOSTNAME]:
>
> - **22/TCP (SSH):** Para administración remota. Restringir origen a las IPs: [TU_IP_ADMIN o RANGO_CORPORATIVO]
> - **80/TCP (HTTP):** Acceso web desde Internet
> - **443/TCP (HTTPS):** Acceso web seguro desde Internet
>
> La VM ejecutará una aplicación web (Next.js) detrás de Nginx como reverse proxy.

### Recomendaciones de seguridad

- **SSH:** Restringir el puerto 22 solo a IPs de administración o VPN corporativa.
- **HTTP/HTTPS:** Si la app es solo para uso interno, considerar restringir origen.
- **PostgreSQL (puerto 5432):** NO exponer a Internet. Solo escuchar en `127.0.0.1`.

---

## 2. Arquitectura del Sistema

```
Internet
    ↓
[Firewall] → Puertos 80, 443
    ↓
[Nginx] reverse proxy
    ↓
[Next.js] (Node.js) → Puerto 3000
    ↓
[PostgreSQL] (localhost:5432)
[Almacenamiento local] → /var/opt/optopad/uploads
```

---

## 3. Preparación del Servidor (Ubuntu 22.04)

### 3.1 Conectarse por SSH

```bash
ssh usuario@IP_DE_LA_VM
```

### 3.2 Actualizar sistema e instalar dependencias base

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

### 3.3 Instalar Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # Debe mostrar v20.x
```

### 3.4 Instalar PostgreSQL 16

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Crear base de datos y usuario:

```bash
sudo -u postgres psql -c "CREATE USER optopad WITH PASSWORD 'optopad';"
sudo -u postgres psql -c "CREATE DATABASE optopad OWNER optopad;"
```

### 3.5 Crear directorio para uploads

```bash
sudo mkdir -p /var/opt/optopad/uploads
sudo chown -R $USER:$USER /var/opt/optopad
```

### 3.6 Instalar Nginx

```bash
sudo apt install -y nginx
```

---

## 4. Configuración de la Aplicación

### 4.1 Clonar o copiar el proyecto

```bash
cd /opt  # o /home/usuario
git clone <URL_REPOSITORIO> optopad
cd optopad/clinica-optometrica
```

### 4.2 Variables de entorno

Crear `.env.local` (ver `.env.example` como referencia):

```env
# Base de datos PostgreSQL local
DATABASE_URL=postgresql://optopad:optopad@localhost:5432/optopad

# NextAuth
NEXTAUTH_URL=http://optopad.uv.es/
NEXTAUTH_SECRET=9ZwjTMBX0zGUDLIMr31/fgLy1+OzRrKpeuAjIx+8YFg=

# Activar modo standalone (obligatorio para este despliegue)
NEXT_PUBLIC_USE_STANDALONE=true

# Almacenamiento local (ruta absoluta en producción)
UPLOAD_DIR=/var/opt/optopad/uploads
NEXT_PUBLIC_UPLOAD_BASE_URL=http://optopad.uv.es/uploads
```

Para generar `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4.3 Inicializar la base de datos

```bash
# Ejecutar los scripts SQL en orden (desde el directorio del proyecto)
psql $DATABASE_URL -f database/schema-standalone.sql
# Si hay migraciones adicionales, ejecutarlas después
```

### 4.4 Crear usuario administrador inicial

```bash
node scripts/create-admin-standalone.js
```

### 4.5 Compilar y ejecutar

```bash
npm install
npm run build
npm run start
```

---

## 5. PM2 (Producción)

Para que la aplicación se mantenga activa y se reinicie automáticamente:

```bash
sudo npm install -g pm2
cd /opt/optopad/clinica-optometrica
pm2 start npm --name "optopad" -- start
pm2 startup   # Seguir las instrucciones
pm2 save
pm2 status
```

---

## 6. Nginx como Reverse Proxy

### ¿Qué es y para qué sirve?

Tu aplicación Next.js corre en el **puerto 3000** dentro del servidor. Sin Nginx:
- Tendrías que acceder con `http://tu-servidor:3000`
- El puerto 3000 tendría que estar abierto en el firewall
- No podrías usar HTTPS ni el puerto 80 (el estándar de la web)

Con Nginx como **reverse proxy**:
- Los usuarios entran por `http://tu-dominio.com` (puerto 80, el habitual)
- Nginx recibe la petición y la **redirige internamente** a tu app en `localhost:3000`
- La app sigue escuchando solo en el servidor; Nginx actúa como intermediario

```
Usuario → http://tu-dominio.com (puerto 80) → Nginx → http://127.0.0.1:3000 (tu app)
```

### Paso a paso

**1. Crear el archivo de configuración**

Edita (o crea) el archivo con tu editor:

```bash
sudo nano /etc/nginx/sites-available/optopad
```

**2. Pega esta configuración** (cambia `tu-dominio.com` por tu dominio o IP real, p. ej. `optopad.uv.es` o `192.168.1.100`):

```nginx
server {
    listen 80;
    server_name tu-dominio.com;  # Cambiar: optopad.uv.es, o la IP (ej. 192.168.1.100), o _ para aceptar cualquier host

    location / {
        proxy_pass http://127.0.0.1:3000;   # Redirige todo a tu app Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /var/opt/optopad/uploads/;    # Archivos subidos (imágenes, etc.)
    }
}
```

Guarda con `Ctrl+O`, Enter, y sale con `Ctrl+X`.

**3. Activar el sitio** (Nginx solo usa archivos que estén en `sites-enabled`):

```bash
# Crear enlace simbólico para activar el sitio
sudo ln -s /etc/nginx/sites-available/optopad /etc/nginx/sites-enabled/

# Opcional: desactivar la página por defecto de Nginx
sudo rm /etc/nginx/sites-enabled/default

# Comprobar que la configuración es válida
sudo nginx -t

# Aplicar cambios
sudo systemctl reload nginx
```

---

## 7. HTTPS con Let's Encrypt (opcional pero recomendado)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

## 8. Orden de Ejecución de Scripts SQL

Para una instalación nueva, ejecutar en este orden:

1. `database/schema-standalone.sql` - Esquema completo
2. Cualquier migración adicional si aplica

---

## 9. Resumen de Puertos

| Componente | Puerto | Bindeado a      |
|------------|--------|-----------------|
| SSH        | 22     | 0.0.0.0         |
| Nginx HTTP | 80     | 0.0.0.0         |
| Nginx HTTPS| 443    | 0.0.0.0         |
| Next.js    | 3000   | 127.0.0.1       |
| PostgreSQL | 5432   | 127.0.0.1       |

---

## 10. Comandos Útiles

```bash
# Ver logs de la aplicación
pm2 logs optopad

# Reiniciar aplicación
pm2 restart optopad

# Ver estado
pm2 status

# Logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```
