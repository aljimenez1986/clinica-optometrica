import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const db = getDb()
    const role = request.nextUrl.searchParams.get('role')

    let query = 'SELECT id, email, nombre, role, created_at FROM usuarios'
    const params: string[] = []
    if (role) {
      query += ' WHERE role = $1'
      params.push(role)
    }
    query += ' ORDER BY email'

    const r = await db.query(query, params)
    return NextResponse.json(r.rows)
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    if (e.message === 'Solo administradores') return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const db = getDb()
    const body = await request.json()
    const { email, password, role, nombre } = body

    if (!email?.trim() || !password?.trim() || !role) {
      return NextResponse.json({ error: 'Email, contraseña y rol son obligatorios' }, { status: 400 })
    }
    if (!['administrador', 'clinico'].includes(role)) {
      return NextResponse.json({ error: 'Rol debe ser administrador o clinico' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password.trim(), 12)
    const r = await db.query(
      'INSERT INTO usuarios (email, password_hash, nombre, role) VALUES ($1, $2, $3, $4) RETURNING id, email, nombre, role, created_at',
      [email.trim(), passwordHash, nombre?.trim() || null, role]
    )
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    if (e.message === 'Solo administradores') return NextResponse.json({ error: e.message }, { status: 403 })
    if (e.code === '23505') return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
