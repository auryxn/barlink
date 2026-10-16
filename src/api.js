const BASE = '/api'

async function req(path, opts = {}) {
  const token = localStorage.getItem('barlink_token')
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-auth': token } : {}),
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  health: () => req('/health'),
  users: () => req('/users'),
  login: (body) => req('/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => req('/me'),
  updateMe: (body) => req('/me', { method: 'PATCH', body: JSON.stringify(body) }),
  addBeer: () => req('/me/beer', { method: 'POST' }),
  addMeeting: () => req('/me/meeting', { method: 'POST' }),
  venues: () => req('/venues'),
  venue: (id) => req(`/venues/${id}`),
  barlinks: (venueId) => req(`/barlinks${venueId ? `?venueId=${venueId}` : ''}`),
  createBarlink: (body) => req('/barlinks', { method: 'POST', body: JSON.stringify(body) }),
  barlink: (id) => req(`/barlinks/${id}`),
  join: (id) => req(`/barlinks/${id}/join`, { method: 'POST' }),
  leave: (id) => req(`/barlinks/${id}/leave`, { method: 'POST' }),
  messages: (id) => req(`/barlinks/${id}/messages`),
  sendMessage: (id, text) => req(`/barlinks/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  myBarlinks: () => req('/my/barlinks'),
}

export function setToken(t) {
  if (t) localStorage.setItem('barlink_token', t)
  else localStorage.removeItem('barlink_token')
}
