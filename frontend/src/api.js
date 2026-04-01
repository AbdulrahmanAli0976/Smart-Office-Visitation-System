import { toast } from 'react-hot-toast';

let isLoggingOut = false;
let failureCount = 0;
let lastFailureAt = 0;
const FAILURE_WINDOW_MS = 30000;
const FAILURE_THRESHOLD = 3;

export function setLoggingOut(value) {
  isLoggingOut = value;
}

function dispatchSystemError(message) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('system:error', { detail: { message } }));
  }
}

function clearSystemError() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('system:clear'));
  }
}

function recordFailure(message) {
  const now = Date.now();
  if (now - lastFailureAt > FAILURE_WINDOW_MS) {
    failureCount = 0;
  }
  failureCount += 1;
  lastFailureAt = now;
  if (failureCount >= FAILURE_THRESHOLD) {
    dispatchSystemError(message || 'Server unreachable. Please check connection.');
  }
}

function recordSuccess() {
  if (failureCount > 0) {
    failureCount = 0;
    clearSystemError();
  }
}

function createBlockedError() {
  const err = new Error('Request blocked during logout');
  err.isAuthError = true;
  return err;
}

function assertNotLoggingOut() {
  if (isLoggingOut) {
    throw createBlockedError();
  }
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

function fireAuthLogout(reason) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason } }));
  }
}

async function request(path, { method = 'GET', body, token, signal } = {}) {
  assertNotLoggingOut();
  const url = `${API_BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal
    });
  } catch (error) {
    recordFailure('Server unreachable. Please check connection.');
    console.error('API_ERROR', {
      url,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }

  if (res.status >= 500) {
    recordFailure('Server unreachable. Please check connection.');
  } else {
    recordSuccess();
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    const error = data?.error || 'Unauthorized';
    toast.error(error);
    fireAuthLogout(error);
    const err = new Error(error);
    err.status = 401;
    err.isAuthError = true;
    throw err;
  }

  if (!res.ok || data?.success === false) {
    const error = data?.error || 'Request failed';
    toast.error(error);
    const err = new Error(error);
    err.status = res.status;
    throw err;
  }
  if (data && Object.prototype.hasOwnProperty.call(data, 'data')) {
    return data.data;
  }
  return data;
}

async function requestWithPagination(path, { method = 'GET', body, token, signal } = {}) {
  assertNotLoggingOut();
  const url = `${API_BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal
    });
  } catch (error) {
    recordFailure('Server unreachable. Please check connection.');
    console.error('API_ERROR', {
      url,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }

  if (res.status >= 500) {
    recordFailure('Server unreachable. Please check connection.');
  } else {
    recordSuccess();
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    const error = data?.error || 'Unauthorized';
    toast.error(error);
    fireAuthLogout(error);
    const err = new Error(error);
    err.status = 401;
    err.isAuthError = true;
    throw err;
  }

  if (!res.ok || data?.success === false) {
    const error = data?.error || 'Request failed';
    toast.error(error);
    const err = new Error(error);
    err.status = res.status;
    throw err;
  }

  const rows = data?.data || [];
  const pagination = data?.pagination || data?.meta || {
    page: 1,
    limit: rows.length,
    total: rows.length,
    totalPages: 1,
    pages: 1
  };
  const meta = data?.meta || {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    pages: pagination.totalPages || pagination.pages || 1
  };

  return { data: rows, pagination, meta };
}

export const api = {
  login(payload) {
    return request('/auth/login', { method: 'POST', body: payload });
  },
  register(payload) {
    return request('/auth/register', { method: 'POST', body: payload });
  },
  listVisitors(params = {}, token, options = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    if (params.type) qs.set('type', params.type);
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    const suffix = qs.toString();
    return requestWithPagination(`/visitors${suffix ? `?${suffix}` : ''}`, { token, signal: options.signal });
  },
  searchVisitors(q, token, options = {}) {
    const params = new URLSearchParams({ q });
    return request(`/visitors/search?${params.toString()}`, { token, signal: options.signal });
  },
  getVisitorHistory(visitorId, token, options = {}) {
    return request(`/visitors/${visitorId}/history`, { token, signal: options.signal });
  },
  getActiveVisits(token, options = {}) {
    return request('/visits/active', { token, signal: options.signal });
  },
  getVisitHistory(params = {}, token, options = {}) {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.date_from) qs.set('date_from', params.date_from);
    if (params.date_to) qs.set('date_to', params.date_to);
    if (params.visitor_type) qs.set('visitor_type', params.visitor_type);
    if (params.type) qs.set('type', params.type);
    if (params.officer_id) qs.set('officer_id', params.officer_id);
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    const suffix = qs.toString();
    return requestWithPagination(`/visits${suffix ? `?${suffix}` : ''}`, { token, signal: options.signal });
  },
  async exportVisits(params = {}, token) {
    assertNotLoggingOut();
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.visitor_type) qs.set('visitor_type', params.visitor_type);
    if (params.officer_id) qs.set('officer_id', params.officer_id);
    qs.set('format', 'csv');
    const suffix = qs.toString();
    const url = `${API_BASE}/visits/export?${suffix}`;

    let res;
    try {
      res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
    } catch (error) {
      recordFailure('Server unreachable. Please check connection.');
      console.error('API_ERROR', {
        url,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }

    if (res.status >= 500) {
      recordFailure('Server unreachable. Please check connection.');
    } else {
      recordSuccess();
    }

    const text = await res.text();
    if (res.status === 401) {
      const error = 'Unauthorized';
      toast.error(error);
      fireAuthLogout(error);
      const err = new Error(error);
      err.status = 401;
      err.isAuthError = true;
      throw err;
    }
    if (!res.ok) {
      const error = 'Export failed';
      toast.error(error);
      const err = new Error(error);
      err.status = res.status;
      throw err;
    }
    return text;
  },
  checkIn(payload, token) {
    return request('/visits/checkin', { method: 'POST', body: payload, token });
  },
  checkOut(visitId, token) {
    return request(`/visits/${visitId}/checkout`, { method: 'PUT', token });
  },
  bulkCheckIn(payload, token) {
    return request('/visits/bulk-checkin', { method: 'POST', body: payload, token });
  },
  bulkCheckOut(payload, token) {
    return request('/visits/bulk-checkout', { method: 'POST', body: payload, token });
  },
  getSummaryReport(params = {}, token, options = {}) {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const suffix = qs.toString();
    return request(`/reports/summary${suffix ? `?${suffix}` : ''}`, { token, signal: options.signal });
  },
  getDashboardMetrics(token, options = {}) {
    return request('/reports/dashboard', { token, signal: options.signal });
  },
  getVisitorsPerDay(params = {}, token, options = {}) {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const suffix = qs.toString();
    return request(`/reports/visitors-per-day${suffix ? `?${suffix}` : ''}`, { token, signal: options.signal });
  },
  getVisitorTypeDistribution(params = {}, token, options = {}) {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const suffix = qs.toString();
    return request(`/reports/visitor-types${suffix ? `?${suffix}` : ''}`, { token, signal: options.signal });
  },
  getOfficers(params = {}, token, options = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    const suffix = qs.toString();
    return requestWithPagination(`/admin/officers${suffix ? `?${suffix}` : ''}`, { token, signal: options.signal });
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
