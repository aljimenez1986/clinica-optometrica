import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/api-auth'

export async function GET() {
  try {
    const session = await requireAuth()
    const db = getDb()
    const userId = (session.user as any).id
    const isAdmin = (session.user as any).role === 'administrador'

    let r
    if (isAdmin) {
      r = await db.query(
        `SELECT i.*, COALESCE(
          (SELECT json_agg(json_build_object('usuario_id', ic.usuario_id)) FROM ipad_clinico ic WHERE ic.ipad_id = i.id)::text,
          '[]'
        ) as ipad_clinico
         FROM ipads i ORDER BY i.created_at DESC`
      )
    } else {
      r = await db.query(
        `SELECT i.*, COALESCE(
          (SELECT json_agg(json_build_object('usuario_id', ic.usuario_id)) FROM ipad_clinico ic WHERE ic.ipad_id = i.id)::text,
          '[]'
        ) as ipad_clinico
         FROM ipads i
         INNER JOIN ipad_clinico ic ON ic.ipad_id = i.id AND ic.usuario_id = $1
         ORDER BY i.created_at DESC`,
        [userId]
      )
    }
    const rows = (r.rows || []).map((row: any) => {
      let ic = row.ipad_clinico
      if (typeof ic === 'string') ic = ic === '[]' ? [] : JSON.parse(ic)
      return { ...row, ipad_clinico: ic || [] }
    })
    return NextResponse.json(rows)
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const db = getDb()
    const body = await request.json()

    const r = await db.query(
      'INSERT INTO ipads (nombre, marca, modelo) VALUES ($1, $2, $3) RETURNING *',
      [body.nombre?.trim(), body.marca?.trim(), body.modelo?.trim()]
    )
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    if (e.message === 'Solo administradores') return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
