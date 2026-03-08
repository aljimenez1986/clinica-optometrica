import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const db = getDb()
    const { id } = await params
    const body = await request.json()

    const updates: string[] = []
    const values: any[] = []
    let i = 1
    if (body.nombre !== undefined) {
      updates.push(`nombre = $${i}`)
      values.push(body.nombre?.trim() || null)
      i++
    }
    if (body.role !== undefined) {
      if (!['administrador', 'clinico'].includes(body.role)) {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
      }
      updates.push(`role = $${i}`)
      values.push(body.role)
      i++
    }
    if (updates.length === 0) return NextResponse.json({ error: 'Sin campos' }, { status: 400 })
    values.push(id)
    const r = await db.query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, nombre, role, created_at`,
      values
    )
    if (r.rows.length === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    if (e.message === 'Solo administradores') return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const db = getDb()
    const { id } = await params

    await db.query('DELETE FROM usuarios WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    if (e.message === 'Solo administradores') return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
