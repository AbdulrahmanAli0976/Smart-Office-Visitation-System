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
  if (!res.ok || data?.success === false) {
    const error = data?.error || 'Request failed';
    throw new Error(error);
  }
  if (data && Object.prototype.hasOwnProperty.call(data, 'data')) {
    return data.data;
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
  getVisitorHistory(visitorId, token) {
    return request(`/visitors/${visitorId}/history`, { token });
  },
  getActiveVisits(token) {
    return request('/visits/active', { token });
  },
  getVisitHistory(params = {}, token) {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.visitor_type) qs.set('visitor_type', params.visitor_type);
    if (params.officer_id) qs.set('officer_id', params.officer_id);
    const suffix = qs.toString();
    return request(`/visits/history${suffix ? `?${suffix}` : ''}`, { token });
  },
  exportVisits(params = {}, token) {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.visitor_type) qs.set('visitor_type', params.visitor_type);
    if (params.officer_id) qs.set('officer_id', params.officer_id);
    qs.set('format', 'csv');
    const suffix = qs.toString();
    return fetch(`${API_BASE}/visits/export?${suffix}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }).then(async (res) => {
      const text = await res.text();
      if (!res.ok) {
        throw new Error('Export failed');
      }
      return text;
    });
  },
  checkIn(payload, token) {
    return request('/visits/checkin', { method: 'POST', body: payload, token });
  },
  checkOut(visitId, token) {
    return request(`/visits/${visitId}/checkout`, { method: 'PUT', token });
  },
  getSummaryReport(params = {}, token) {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const suffix = qs.toString();
    return request(`/reports/summary${suffix ? `?${suffix}` : ''}`, { token });
  },
  getDashboardMetrics(token) {
    return request('/reports/dashboard', { token });
  },
  getVisitorsPerDay(params = {}, token) {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const suffix = qs.toString();
    return request(`/reports/visitors-per-day${suffix ? `?${suffix}` : ''}`, { token });
  },
  getVisitorTypeDistribution(params = {}, token) {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const suffix = qs.toString();
    return request(`/reports/visitor-types${suffix ? `?${suffix}` : ''}`, { token });
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
