import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function verificarAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return { error: 'No autorizado', status: 401 }
  const token = authHeader.replace('Bearer ', '')
  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user) return { error: 'Sesión inválida', status: 401 }
  // Cliente con el token del usuario para que RLS vea la sesión autenticada
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data } = await userClient.from('app_usuario').select('role').eq('auth_user_id', user.id).single()
  if (data?.role !== 'administrador') return { error: 'Solo administradores', status: 403 }
  return { user }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verificarAdmin(request)
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, { status: 500 })
    }

    const body = await request.json()
    const { email, password, role, nombre } = body
    if (!email?.trim() || !password?.trim() || !role) {
      return NextResponse.json({ error: 'Email, contraseña y rol son obligatorios' }, { status: 400 })
    }
    if (!['administrador', 'clinico'].includes(role)) {
      return NextResponse.json({ error: 'Rol debe ser administrador o clinico' }, { status: 400 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }
    if (!newUser.user) {
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    const { error: insertError } = await supabaseAdmin.from('app_usuario').insert([{
      auth_user_id: newUser.user.id,
      email: email.trim(),
      role,
      nombre: nombre?.trim() || null
    }])

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: newUser.user.id })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authCheck = await verificarAdmin(request)
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const authUserId = request.nextUrl.searchParams.get('authUserId')
    if (!authUserId) {
      return NextResponse.json({ error: 'authUserId requerido' }, { status: 400 })
    }

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(authUserId)
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
