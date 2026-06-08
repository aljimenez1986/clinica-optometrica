# Clínica Optométrica

Aplicación web para la gestión de pacientes en una clínica optométrica, desarrollada con Next.js y PostgreSQL en modo standalone.

## 🚀 Características

- **Gestión de Pacientes**: Registro completo con datos personales y ópticos
- **Autenticación**: Sistema de login seguro con NextAuth
- **Base de Datos**: PostgreSQL en modo standalone
- **Interfaz Moderna**: Diseño responsive con Tailwind CSS

## 📋 Requisitos

- Node.js 18.x o superior
- npm o yarn
- PostgreSQL

## 🛠️ Instalación Local

1. **Clonar el repositorio**
```bash
git clone <tu-repositorio>
cd clinica-optometrica
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
# Copia el archivo de ejemplo si existe
# cp .env.example .env.local

# Edita .env.local y agrega tus variables
# DATABASE_URL=postgresql://usuario:pass@localhost:5432/optopad
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=tu-secreto-largo
```

4. **Configurar la base de datos**
   - Ejecuta el script `database/schema-standalone.sql` en PostgreSQL

5. **Crear usuario administrador**
   - Ejecuta `node scripts/create-admin-standalone.js`

6. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

7. **Abrir en el navegador**
   - Aplicación: http://localhost:3000
   - Panel Admin: http://localhost:3000/admin

## 📦 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Compila la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## 🚀 Despliegue en Servidor Propio

Para desplegar en tu propio servidor, consulta la guía completa en **[DEPLOY.md](./DEPLOY.md)**

**Resumen rápido:**
1. Servidor con Node.js 18+ y npm
2. Configurar variables de entorno (`.env.local`)
3. Compilar: `npm run build`
4. Ejecutar con PM2: `pm2 start npm --name "clinica-optometrica" -- start`
5. Configurar Nginx como proxy reverso
6. Configurar SSL con Let's Encrypt

## 📁 Estructura del Proyecto

```
clinica-optometrica/
├── app/
│   ├── admin/          # Panel de administración
│   ├── page.tsx        # Página principal
│   └── layout.tsx      # Layout principal
├── lib/
│   ├── db.ts           # Conexión PostgreSQL standalone
│   └── optopad-api.ts  # Cliente API standalone
├── database/
│   └── schema-standalone.sql     # Script SQL para crear tablas en modo standalone
├── scripts/
│   └── create-admin-standalone.js  # Script para crear el primer admin
│   └── deploy.sh      # Script de despliegue
└── DEPLOY.md          # Guía completa de despliegue
```

## 🔒 Seguridad

- Las variables de entorno nunca deben subirse a Git
- El archivo `.env.local` está en `.gitignore`
- Solo usuarios autenticados pueden acceder al panel admin

## 📝 Campos del Formulario

### Obligatorios:
- ID del Paciente (alfanumérico)
- Género (Masculino, Femenino, Otro)
- Fecha de Nacimiento

### Opcionales:
- Nombre Completo
- Teléfono
- Email
- Graduación Ojo Derecho
- Graduación Ojo Izquierdo
- Observaciones

## 🆘 Solución de Problemas

**Error de conexión a la base de datos:**
- Verifica que `DATABASE_URL` en `.env.local` sea correcta
- Asegúrate de que PostgreSQL esté en ejecución

**Error al iniciar sesión:**
- Verifica que el usuario exista en la tabla `usuarios`
- Revisa que `NEXTAUTH_SECRET` esté configurado correctamente

**La aplicación no compila:**
- Verifica que todas las dependencias estén instaladas: `npm install`
- Revisa los logs de error para más detalles

## 📚 Recursos

- [Documentación Next.js](https://nextjs.org/docs)
- [Documentación PostgreSQL](https://www.postgresql.org/docs/)
- [Guía de Despliegue](./DEPLOY.md)

## 📄 Licencia

Este proyecto es privado y de uso interno.
