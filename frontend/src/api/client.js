const BASE = '/api'

function getHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: getHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    return
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') return null

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`)
  }

  return data
}

export const api = {
  auth: {
    register: (d) => request('POST', '/auth/register', d),
    login: (d) => request('POST', '/auth/login', d),
    me: () => request('GET', '/auth/me'),
  },
  projects: {
    list: () => request('GET', '/projects'),
    create: (d) => request('POST', '/projects', d),
    get: (id) => request('GET', `/projects/${id}`),
    update: (id, d) => request('PUT', `/projects/${id}`, d),
    delete: (id) => request('DELETE', `/projects/${id}`),
  },
  tasks: {
    create: (projectId, d) => request('POST', `/projects/${projectId}/tasks`, d),
    update: (id, d) => request('PUT', `/tasks/${id}`, d),
    delete: (id) => request('DELETE', `/tasks/${id}`),
  },
}
