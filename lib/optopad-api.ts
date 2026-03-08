/**
 * Cliente API para modo standalone (PostgreSQL local, sin Supabase).
 * Usar cuando DATABASE_URL está configurada.
 */

async function fetchApi(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, { ...opts, credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  pacientes: {
    list: () => fetchApi('/api/standalone/pacientes'),
    create: (data: Record<string, unknown>) =>
      fetchApi('/api/standalone/pacientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/api/standalone/pacientes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`/api/standalone/pacientes/${id}`, { method: 'DELETE' }),
    checkId: (idPaciente: string, excludeId?: string) => {
      const url = new URL('/api/standalone/pacientes/check-id', window.location.origin)
      url.searchParams.set('id_paciente', idPaciente)
      if (excludeId) url.searchParams.set('exclude_id', excludeId)
      return fetchApi(url.toString())
    },
  },
  ipads: {
    list: () => fetchApi('/api/standalone/ipads'),
    create: (data: Record<string, unknown>) =>
      fetchApi('/api/standalone/ipads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/api/standalone/ipads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`/api/standalone/ipads/${id}`, { method: 'DELETE' }),
    getClinicos: (ipadId: string) =>
      fetchApi(`/api/standalone/ipad-clinico?ipad_id=${encodeURIComponent(ipadId)}`),
    setClinicos: (ipadId: string, usuarioIds: string[]) =>
      fetchApi('/api/standalone/ipad-clinico', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipad_id: ipadId, usuario_ids: usuarioIds }),
      }),
  },
  usuarios: {
    list: (role?: string) => {
      const url = role ? `/api/standalone/usuarios?role=${encodeURIComponent(role)}` : '/api/standalone/usuarios'
      return fetchApi(url)
    },
    create: (data: Record<string, unknown>) =>
      fetchApi('/api/standalone/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/api/standalone/usuarios/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`/api/standalone/usuarios/${id}`, { method: 'DELETE' }),
  },
  testConfigs: {
    list: (ipadId?: string, tipoTest?: string) => {
      let url = '/api/standalone/test-configs'
      if (ipadId) {
        url += `?ipad_id=${encodeURIComponent(ipadId)}`
        if (tipoTest) url += `&tipo_test=${encodeURIComponent(tipoTest)}`
      }
      return fetchApi(url)
    },
    get: (ipadId: string, tipoTest: string) =>
      fetchApi(`/api/standalone/test-configs?ipad_id=${encodeURIComponent(ipadId)}&tipo_test=${encodeURIComponent(tipoTest)}`),
    create: (data: Record<string, unknown>) =>
      fetchApi('/api/standalone/test-configs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  testPasos: {
    list: (testConfigId: string) =>
      fetchApi(`/api/standalone/test-pasos?test_config_id=${encodeURIComponent(testConfigId)}`),
    create: (data: Record<string, unknown>) =>
      fetchApi('/api/standalone/test-pasos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/api/standalone/test-pasos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`/api/standalone/test-pasos/${id}`, { method: 'DELETE' }),
  },
  testResultados: {
    list: (pacienteId?: string, opts?: { all?: boolean }) => {
      const params = new URLSearchParams()
      if (pacienteId) params.set('paciente_id', pacienteId)
      if (opts?.all) params.set('all', '1')
      const qs = params.toString()
      return fetchApi(`/api/standalone/test-resultados${qs ? '?' + qs : ''}`)
    },
    create: (data: Record<string, unknown>) =>
      fetchApi('/api/standalone/test-resultados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/api/standalone/test-resultados/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  upload: async (file: File, subpath: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('subpath', subpath)
    const res = await fetch('/api/standalone/upload', { method: 'POST', credentials: 'include', body: formData })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  },
}
