import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import AdminPanel from '../components/AdminPanel.jsx';
import useScrollToError from '../hooks/useScrollToError.js';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'react-hot-toast';

export default function AdminPage() {
  const { token, user, handleAuthFailure } = useAuth();
  const [adminOfficers, setAdminOfficers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [officerPage, setOfficerPage] = useState(1);
  const [officerLimit] = useState(10);
  const [officerTotalPages, setOfficerTotalPages] = useState(1);
  const [officerTotal, setOfficerTotal] = useState(0);
  const [officerSearch, setOfficerSearch] = useState('');
  const [officerStatus, setOfficerStatus] = useState('');
  const [error, setError] = useState('');

  const noticeRef = useScrollToError(error);

  const refreshOfficers = async (authToken, overrides = {}, signal) => {
    if (!authToken || !user) return;
    setAdminLoading(true);
    try {
      const page = overrides.page ?? officerPage;
      const search = overrides.search ?? officerSearch;
      const status = overrides.status ?? officerStatus;
      const { data, pagination } = await api.getOfficers({
        page,
        limit: officerLimit,
        search,
        status
      }, authToken, { signal });
      setAdminOfficers(data);
      setOfficerPage(pagination.page || page);
      setOfficerTotalPages(pagination.totalPages || 1);
      setOfficerTotal(pagination.total || data.length);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !user) return;
    const controller = new AbortController();
    refreshOfficers(token, {}, controller.signal);
    return () => controller.abort();
  }, [token, user, officerPage, officerSearch, officerStatus]);

  const handleOfficerSearch = (value) => {
    setOfficerSearch(value);
    setOfficerPage(1);
  };

  const handleOfficerStatus = (value) => {
    setOfficerStatus(value);
    setOfficerPage(1);
  };

  const handleOfficerPageChange = (nextPage) => {
    if (!officerTotalPages) return;
    const page = Math.max(1, Math.min(nextPage, officerTotalPages));
    setOfficerPage(page);
  };

  const handleApprove = async (id) => {
    setError('');
    if (!token || !user) return;
    setAdminLoading(true);
    try {
      await api.approveOfficer(id, token);
      await refreshOfficers(token);
      toast.success('Officer approved');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeactivate = async (id) => {
    setError('');
    if (!window.confirm('Are you sure?')) return;
    if (!token || !user) return;
    setAdminLoading(true);
    try {
      await api.deactivateOfficer(id, token);
      await refreshOfficers(token);
      toast.success('Officer deactivated');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    if (!window.confirm('Are you sure?')) return;
    if (!token || !user) return;
    setAdminLoading(true);
    try {
      await api.deleteOfficer(id, token);
      await refreshOfficers(token);
      toast.success('Officer deleted');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-clay-600">Admin</p>
        <h2 className="text-2xl font-semibold text-clay-900">Officer Management</h2>
        <p className="text-sm text-clay-600">Approve, deactivate, or remove officer accounts.</p>
      </header>

      {error && (
        <div
          ref={noticeRef}
          className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <AdminPanel
        officers={adminOfficers}
        onApprove={handleApprove}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
        loading={adminLoading}
        search={officerSearch}
        status={officerStatus}
        page={officerPage}
        totalPages={officerTotalPages}
        total={officerTotal}
        onSearchChange={handleOfficerSearch}
        onStatusChange={handleOfficerStatus}
        onPrev={() => handleOfficerPageChange(officerPage - 1)}
        onNext={() => handleOfficerPageChange(officerPage + 1)}
      />
    </div>
  );
}








