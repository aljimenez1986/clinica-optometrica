import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/api-auth'

async function checkAccess(db: any, pacienteId: string, userId: string, isAdmin: boolean) {
  const r = await db.query('SELECT registrado_por FROM pacientes WHERE id = $1', [pacienteId])
  if (r.rows.length === 0) return false
  if (isAdmin) return true
  return r.rows[0].registrado_por === userId
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const db = getDb()
    const { id } = await params
    const userId = (session.user as any).id
    const isAdmin = (session.user as any).role === 'administrador'

    if (!(await checkAccess(db, id, userId, isAdmin))) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const body = await request.json()
    const updates: string[] = []
    const values: any[] = []
    let i = 1
    const fields = ['id_paciente', 'nombre', 'genero', 'genero_otro', 'fecha_nacimiento', 'telefono', 'email', 'graduacion_od', 'graduacion_oi', 'observaciones']
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = $${i}`)
        values.push(body[f])
        i++
      }
    }
    if (updates.length === 0) return NextResponse.json({ error: 'Sin campos' }, { status: 400 })
    values.push(id)
    const r = await db.query(
      `UPDATE pacientes SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    )
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const db = getDb()
    const { id } = await params
    const userId = (session.user as any).id
    const isAdmin = (session.user as any).role === 'administrador'

    if (!(await checkAccess(db, id, userId, isAdmin))) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    await db.query('DELETE FROM pacientes WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
