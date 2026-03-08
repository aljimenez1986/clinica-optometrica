import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const db = getDb()
    const { id } = await params
    const body = await request.json()

    const updates: string[] = []
    const values: any[] = []
    let i = 1
    const fields = ['orden', 'nombre_archivo', 'ruta_archivo', 'url_publica', 'descripcion', 'valor_decimal']
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = $${i}`)
        values.push(f === 'valor_decimal' && body[f] !== null ? parseFloat(body[f]) : body[f])
        i++
      }
    }
    if (body.valores_correctos !== undefined) {
      updates.push(`valores_correctos = $${i}`)
      values.push(JSON.stringify(body.valores_correctos))
      i++
    }
    if (updates.length === 0) return NextResponse.json({ error: 'Sin campos' }, { status: 400 })
    values.push(id)
    const r = await db.query(
      `UPDATE test_pasos SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    )
    if (r.rows.length === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const db = getDb()
    const { id } = await params

    await db.query('DELETE FROM test_pasos WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
