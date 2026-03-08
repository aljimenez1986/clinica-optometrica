import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')
const BASE_URL = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || ''

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const subpath = (formData.get('subpath') as string) || ''

    if (!file) return NextResponse.json({ error: 'No hay archivo' }, { status: 400 })

    const ext = file.name.split('.').pop() || 'bin'
    const filename = `paso_${Date.now()}.${ext}`
    const relPath = subpath ? path.join(subpath, filename) : filename
    const fullPath = path.join(UPLOAD_DIR, relPath)
    const dir = path.dirname(fullPath)

    await mkdir(dir, { recursive: true })
    const buf = Buffer.from(await file.arrayBuffer())
    await writeFile(fullPath, buf)

    const publicUrl = BASE_URL ? `${BASE_URL.replace(/\/$/, '')}/${relPath.replace(/\\/g, '/')}` : `/uploads/${relPath.replace(/\\/g, '/')}`
    return NextResponse.json({
      nombre_archivo: filename,
      ruta_archivo: relPath,
      url_publica: publicUrl,
    })
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
