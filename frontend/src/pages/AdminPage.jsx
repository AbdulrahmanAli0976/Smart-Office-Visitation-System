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

  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

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

  const refreshMaintenance = async (authToken, signal) => {
    if (!authToken || !user) return;
    setMaintenanceLoading(true);
    try {
      const status = await api.getMaintenanceAdmin(authToken, { signal });
      setMaintenance(Boolean(status.maintenance));
      setMaintenanceMessage(status.message || '');
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setMaintenanceLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !user) return;
    const controller = new AbortController();
    refreshOfficers(token, {}, controller.signal);
    refreshMaintenance(token, controller.signal);
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

  const handleMaintenancePost = async (enabled) => {
    setError('');
    if (!token || !user) return;
    setMaintenanceLoading(true);
    try {
      const payload = {
        enabled,
        message: maintenanceMessage.trim() || 'Kindly be patient with us. There\'s a maintenance going on, which will be resolved shortly.'
      };
      const status = await api.updateMaintenance(payload, token);
      setMaintenance(Boolean(status.maintenance));
      setMaintenanceMessage(status.message || '');
      toast.success(enabled ? 'Maintenance enabled' : 'Maintenance disabled');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message);
      }
    } finally {
      setMaintenanceLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">Administration</p>
        <h2 className="page-title">Officer management</h2>
        <p className="page-subtitle">Review access requests and manage the active staff directory.</p>
      </header>

      {error && (
        <div
          ref={noticeRef}
          className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section className="clay-card space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">System controls</p>
            <h2 className="section-title">Maintenance mode</h2>
          </div>
          <span className={`status-pill ${maintenance ? 'status-pill-danger' : 'status-pill-success'}`}>{maintenance ? 'MAINTENANCE ACTIVE' : 'SYSTEM OPERATIONAL'}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">Maintenance message</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner"
              rows="4"
              value={maintenanceMessage}
              onChange={(event) => setMaintenanceMessage(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch">
            <button
              type="button"
              className="button-primary"
              disabled={maintenanceLoading}
              onClick={() => handleMaintenancePost(true)}
            >
              Enable Maintenance
            </button>
            <button
              type="button"
              className="button-secondary"
              disabled={maintenanceLoading}
              onClick={() => handleMaintenancePost(false)}
            >
              Disable Maintenance
            </button>
          </div>
        </div>
      </section>

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








