/**
 * Script para crear el usuario administrador inicial.
 * Ejecutar desde la raíz del proyecto: node scripts/create-admin.js
 *
 * Requiere: .env.local con NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')

const EMAIL = 'maria.j.luque@uv.es'
const PASSWORD = 'Mj1234'
const NOMBRE = 'María Luque'
const ROLE = 'administrador'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Error: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let authUserId

  console.log('Comprobando usuario en Auth...')
  const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('El usuario ya existe en Auth. Buscando id...')
      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const existing = listData?.users?.find(u => u.email === EMAIL)
      if (!existing) {
        console.error('No se pudo encontrar el usuario existente')
        process.exit(1)
      }
      authUserId = existing.id
      console.log('Usuario encontrado:', authUserId)
    } else {
      console.error('Error al crear usuario en Auth:', authError.message)
      process.exit(1)
    }
  } else if (newUser?.user) {
    authUserId = newUser.user.id
    console.log('Usuario creado en Auth:', authUserId)
  } else {
    console.error('Error: No se obtuvo el usuario')
    process.exit(1)
  }

  console.log('Insertando/actualizando en app_usuario...')
  const { data: existingApp } = await supabase.from('app_usuario').select('id').eq('auth_user_id', authUserId).single()
  if (existingApp) {
    const { error: updError } = await supabase.from('app_usuario').update({ nombre: NOMBRE, role: ROLE }).eq('auth_user_id', authUserId)
    if (updError) {
      console.error('Error al actualizar app_usuario:', updError.message)
      process.exit(1)
    }
    console.log('✓ Usuario actualizado en app_usuario (rol:', ROLE + ')')
  } else {
    const { error: dbError } = await supabase.from('app_usuario').insert([{
      auth_user_id: authUserId,
      email: EMAIL,
      nombre: NOMBRE,
      role: ROLE
    }])
    if (dbError) {
      console.error('Error al insertar en app_usuario:', dbError.message)
      process.exit(1)
    }
    console.log('✓ Usuario registrado en app_usuario')
  }
  console.log('  Nombre:', NOMBRE)
  console.log('  Email:', EMAIL)
  console.log('  Rol:', ROLE)
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
