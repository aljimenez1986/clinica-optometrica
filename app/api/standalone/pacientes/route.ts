import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/api-auth'

export async function GET() {
  try {
    const session = await requireAuth()
    const db = getDb()
    const userId = (session.user as any).id
    const isAdmin = (session.user as any).role === 'administrador'

    const r = await db.query(
      `SELECT * FROM pacientes 
       ${!isAdmin ? 'WHERE registrado_por = $1' : ''}
       ORDER BY created_at DESC`,
      isAdmin ? [] : [userId]
    )
    return NextResponse.json(r.rows)
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const db = getDb()
    const body = await request.json()
    const userId = (session.user as any).id
    const isAdmin = (session.user as any).role === 'administrador'

    const registradoPor = isAdmin ? (body.registrado_por || userId) : userId

    const r = await db.query(
      `INSERT INTO pacientes (id_paciente, nombre, genero, genero_otro, fecha_nacimiento, telefono, email, graduacion_od, graduacion_oi, observaciones, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        body.id_paciente,
        body.nombre || null,
        body.genero,
        body.genero === 'otro' ? body.genero_otro : null,
        body.fecha_nacimiento,
        body.telefono || null,
        body.email || null,
        body.graduacion_od || null,
        body.graduacion_oi || null,
        body.observaciones || null,
        registradoPor,
      ]
    )
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    if (e.code === '23505') return NextResponse.json({ error: 'ID de paciente duplicado' }, { status: 400 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
