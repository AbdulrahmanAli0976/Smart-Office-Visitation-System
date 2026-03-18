const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = data?.error || 'Request failed';
    throw new Error(error);
  }
  return data;
}

export const api = {
  login(payload) {
    return request('/auth/login', { method: 'POST', body: payload });
  },
  register(payload) {
    return request('/auth/register', { method: 'POST', body: payload });
  },
  searchVisitors(q, token) {
    const params = new URLSearchParams({ q });
    return request(`/visitors/search?${params.toString()}`, { token });
  },
  getActiveVisits(token) {
    return request('/visits/active', { token });
  },
  checkIn(payload, token) {
    return request('/visits/checkin', { method: 'POST', body: payload, token });
  },
  checkOut(visitId, token) {
    return request(`/visits/${visitId}/checkout`, { method: 'PUT', token });
  },
  getOfficers(token) {
    return request('/admin/officers', { token });
  },
  approveOfficer(id, token) {
    return request(`/admin/officers/${id}/approve`, { method: 'PUT', token });
  },
  deactivateOfficer(id, token) {
    return request(`/admin/officers/${id}/deactivate`, { method: 'PUT', token });
  },
  deleteOfficer(id, token) {
    return request(`/admin/officers/${id}`, { method: 'DELETE', token });
  }
};
