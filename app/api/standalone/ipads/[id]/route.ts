import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const db = getDb()
    const { id } = await params
    const body = await request.json()

    const r = await db.query(
      'UPDATE ipads SET nombre = $1, marca = $2, modelo = $3 WHERE id = $4 RETURNING *',
      [body.nombre?.trim(), body.marca?.trim(), body.modelo?.trim(), id]
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

    await db.query('DELETE FROM ipads WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    if (e.message === 'Solo administradores') return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
