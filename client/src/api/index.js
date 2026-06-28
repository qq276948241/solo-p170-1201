const BASE = '/api'

function getToken() {
  return localStorage.getItem('coffee_token') || ''
}

async function request(path, { method = 'GET', body, ...opts } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  }
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...opts
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || ('请求失败 ' + res.status))
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me'),

  getDrinks: () => request('/drinks'),
  addDrink: (d) => request('/drinks', { method: 'POST', body: d }),
  updateDrink: (id, d) => request('/drinks/' + id, { method: 'PUT', body: d }),
  removeDrink: (id) => request('/drinks/' + id, { method: 'DELETE' }),

  getIngredients: () => request('/ingredients'),
  addIngredient: (d) => request('/ingredients', { method: 'POST', body: d }),
  updateIngredient: (id, d) => request('/ingredients/' + id, { method: 'PUT', body: d }),

  getTodayRecord: () => request('/records/today', { method: 'POST' }),
  submitRecord: (data) => request('/records/submit', { method: 'POST', body: data }),
  getRecordsRange: (start, end) =>
    request(`/records/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
  getRecordItems: (id) => request('/records/' + id + '/items'),

  getWeeklyReport: () => request('/reports/weekly')
}
