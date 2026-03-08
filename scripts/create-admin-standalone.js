/**
 * Crea el usuario administrador inicial (modo standalone, PostgreSQL local).
 * Ejecutar: node scripts/create-admin-standalone.js
 *
 * Requiere: .env.local con DATABASE_URL
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') })

const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const EMAIL = process.env.ADMIN_EMAIL || 'admin@optopad.local'
const PASSWORD = process.env.ADMIN_PASSWORD || 'CambiarPassword123!'
const NOMBRE = process.env.ADMIN_NOMBRE || 'Administrador'
const ROLE = 'administrador'

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('Error: DATABASE_URL no configurada en .env.local')
    process.exit(1)
  }

  const pool = new Pool({ connectionString })
  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  try {
    const existente = await pool.query('SELECT id FROM usuarios WHERE email = $1', [EMAIL])
    if (existente.rows.length > 0) {
      await pool.query(
        'UPDATE usuarios SET password_hash = $1, nombre = $2, role = $3 WHERE email = $4',
        [passwordHash, NOMBRE, ROLE, EMAIL]
      )
      console.log('✓ Usuario actualizado:', EMAIL, '| Rol:', ROLE)
    } else {
      await pool.query(
        'INSERT INTO usuarios (email, password_hash, nombre, role) VALUES ($1, $2, $3, $4)',
        [EMAIL, passwordHash, NOMBRE, ROLE]
      )
      console.log('✓ Usuario creado:', EMAIL, '| Rol:', ROLE)
    }
    console.log('  Nombre:', NOMBRE)
    console.log('  Para cambiar credenciales: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE en .env.local')
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
