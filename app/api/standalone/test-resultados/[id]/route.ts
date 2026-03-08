import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const db = getDb()
    const { id } = await params
    const body = await request.json()

    if (body.datos_respuesta === undefined) return NextResponse.json({ error: 'Sin campos' }, { status: 400 })

    const r = await db.query(
      'UPDATE test_resultados SET datos_respuesta = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(body.datos_respuesta), id]
    )
    if (r.rows.length === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
