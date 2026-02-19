'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminEjecucionRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/ejecucion')
  }, [router])
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <p className="text-gray-500">Redirigiendo a Ejecución de tests...</p>
    </div>
  )
}
