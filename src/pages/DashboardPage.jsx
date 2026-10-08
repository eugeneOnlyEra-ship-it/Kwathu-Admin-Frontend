import { useEffect, useState } from 'react';
import {
  FileText,
  MapPin,
  ShieldCheck,
  ShieldX,
  Users,
  Building2,
  Clock,
  Ban,
  RotateCcw,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Megaphone,
  ScrollText,
  Plus,
} from 'lucide-react';
import { useAdminUsers, useAdminProperties, useAdminStats } from '../hooks/useAdmin';
import { useAdminAnnouncements } from '../hooks/useAnnouncements';
import { useAuditLog } from '../hooks/useAuditLog';
import SystemHealthPanel from '../components/admin/SystemHealthPanel';
import ReportsPanel from '../components/admin/ReportsPanel';
import DataExportPanel from '../components/admin/DataExportPanel';
import RolesPanel from '../components/admin/RolesPanel';
import SecurityCenterPanel from '../components/admin/SecurityCenterPanel';
import SearchAnalyticsPanel from '../components/admin/SearchAnalyticsPanel';
import PaymentsPanel from '../components/admin/PaymentsPanel';

const TABS = [
  { key: 'landlords', label: 'Landlords' },
  { key: 'students', label: 'Students' },
  { key: 'listings', label: 'Listings' },
  { key: 'payments', label: 'Payments' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'audit-log', label: 'Audit log' },
  { key: 'health', label: 'System health' },
  { key: 'reports', label: 'Reports' },
  { key: 'export', label: 'Data export' },
  { key: 'roles', label: 'Roles' },
  { key: 'security', label: 'Security center' },
  { key: 'search-analytics', label: 'Search analytics' },
];

export default function DashboardPage() {
  const [tab, setTab] = useState('landlords');
  const stats = useAdminStats();

  return (
    <div className="min-h-dvh bg-paper px-6 py-16">
      <div className="mx-auto max-w-[1100px]">
        <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-text-muted">
          Admin
        </div>
        <h1 className="font-display font-semibold text-[1.8rem] text-text mt-1">
          Review queue
        </h1>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            <StatCard icon={Users} label="Landlords pending" value={stats.users.pending} />
            <StatCard icon={Building2} label="Total listings" value={stats.properties.total} />
            <StatCard icon={Clock} label="Listings pending" value={stats.properties.pending} />
            <StatCard icon={ShieldCheck} label="Listings approved" value={stats.properties.approved} />
          </div>
        )}

        <div className="flex items-center gap-1 mt-10 border-b border-line-dark overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-[0.85rem] font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-green-dark text-ink'
                  : 'border-transparent text-text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'landlords' && <PeopleQueue role="landlord" showVerification showDocuments />}
          {tab === 'students' && <PeopleQueue role="student" showVerification />}
          {tab === 'listings' && <ListingQueue />}
          {tab === 'payments' && <PaymentsPanel />}
          {tab === 'announcements' && <AnnouncementsPanel />}
          {tab === 'audit-log' && <AuditLogPanel />}
          {tab === 'health' && <SystemHealthPanel onNavigate={setTab} />}
          {tab === 'reports' && <ReportsPanel />}
          {tab === 'export' && <DataExportPanel />}
          {tab === 'roles' && <RolesPanel />}
          {tab === 'security' && <SecurityCenterPanel />}
          {tab === 'search-analytics' && <SearchAnalyticsPanel />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line-dark bg-paper px-4 py-3.5">
      <Icon size={16} strokeWidth={1.8} className="text-green-dark" />
      <div className="font-display font-semibold text-[1.3rem] text-text mt-2">{value}</div>
      <div className="text-[0.72rem] text-text-muted mt-0.5">{label}</div>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mb-5 text-[0.82rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3.5 py-2.5">
      {message}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-line-dark px-6 py-14 text-center">
      <p className="text-[0.95rem] text-text">{text}</p>
    </div>
  );
}

const STATUS_BADGE = {
  pending: 'bg-gold/15 text-gold',
  approved: 'bg-green/15 text-green-dark',
  rejected: 'bg-clay/10 text-clay',
  suspended: 'bg-paper-3 text-text-muted',
};

function StatusFilterBar({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold transition-colors ${
            value === opt.value
              ? 'bg-ink text-text-inverse'
              : 'bg-paper-2 text-text-muted hover:bg-paper-3'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function useDebouncedSearch(delay = 350) {
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input), delay);
    return () => clearTimeout(timer);
  }, [input, delay]);

  return [input, setInput, debounced];
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search
        size={14}
        strokeWidth={1.8}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-8 py-2 text-[0.85rem]"
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Landlords / Students — shared component, verification actions are
// landlord-only (students don't go through ID/proof-of-ownership review)
// ---------------------------------------------------------------------

const PEOPLE_FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'all', label: 'All' },
];

function PeopleQueue({ role, showVerification = false, showDocuments = false }) {
  const [filter, setFilter] = useState('pending');
  const [searchInput, setSearchInput, search] = useDebouncedSearch();

  const verificationStatus = filter === 'suspended' || filter === 'all' ? 'all' : filter;
  const accountStatus = filter === 'suspended' ? 'suspended' : 'active';

  const { users, isLoading, error, verify, reject, suspend, reactivate, clearError } =
    useAdminUsers({ role, verificationStatus, accountStatus, search });
  const [busyId, setBusyId] = useState(null);

  async function handle(action, id) {
    setBusyId(id);
    clearError();
    try {
      await action(id);
    } catch {
      // error already on state
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <StatusFilterBar options={PEOPLE_FILTERS} value={filter} onChange={setFilter} />
        <SearchBox
          value={searchInput}
          onChange={setSearchInput}
          placeholder={`Search ${role}s by name, email, phone…`}
        />
      </div>

      <ErrorBanner message={error} />

      {isLoading ? (
        <p className="text-[0.9rem] text-text-muted">Loading {role}s…</p>
      ) : users.length === 0 ? (
        <EmptyState text={`No ${role}s match this filter.`} />
      ) : (
        <div className="space-y-4">
          {users.map((u) => {
            const suspended = filter === 'suspended';
            return (
              <div
                key={u.id}
                className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5 flex flex-wrap items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-display font-semibold text-[1.05rem] text-text">
                      {u.businessName || u.fullName}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold capitalize ${STATUS_BADGE[suspended ? 'suspended' : u.verificationStatus]}`}
                    >
                      {suspended ? 'Suspended' : u.verificationStatus}
                    </span>
                  </div>
                  <div className="text-[0.82rem] text-text-muted mt-0.5">
                    {u.fullName} · {u.email || u.phone}
                  </div>
                  {showDocuments && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      <DocLink label="ID document" url={u.idDocumentUrl} />
                      <DocLink label="Proof of ownership" url={u.proofOfOwnershipUrl} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {suspended ? (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => handle(reactivate, u.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[0.8rem] font-semibold text-text-inverse hover:bg-green-dark transition-colors disabled:opacity-40"
                    >
                      <RotateCcw size={14} strokeWidth={2} />
                      Reactivate
                    </button>
                  ) : (
                    <>
                      {showVerification && u.verificationStatus === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => handle(reject, u.id)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line-dark px-4 py-2 text-[0.8rem] font-semibold text-clay hover:bg-clay/10 transition-colors disabled:opacity-40"
                          >
                            <ShieldX size={14} strokeWidth={2} />
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => handle(verify, u.id)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[0.8rem] font-semibold text-text-inverse hover:bg-green-dark transition-colors disabled:opacity-40"
                          >
                            <ShieldCheck size={14} strokeWidth={2} />
                            Approve
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => handle(suspend, u.id)}
                        title="Suspend account"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-line-dark text-text-muted hover:bg-clay/10 hover:text-clay transition-colors disabled:opacity-40"
                      >
                        <Ban size={14} strokeWidth={2} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocLink({ label, url }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1.5 text-[0.75rem] font-semibold text-text hover:bg-paper-3 transition-colors"
    >
      <FileText size={13} strokeWidth={1.8} />
      {label}
    </a>
  );
}

// ---------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------

const LISTING_FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

function ListingQueue() {
  const [filter, setFilter] = useState('pending');
  const [searchInput, setSearchInput, search] = useDebouncedSearch();

  const { properties, isLoading, error, approve, reject, activate, deactivate, remove, clearError } =
    useAdminProperties({ status: filter, search });
  const [busyId, setBusyId] = useState(null);

  async function handle(action, id) {
    setBusyId(id);
    clearError();
    try {
      await action(id);
    } catch {
      // error already on state
    } finally {
      setBusyId(null);
    }
  }

  function handleRemove(property) {
    if (!window.confirm(`Delete "${property.name}"? This can't be undone.`)) return;
    handle(remove, property.id);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <StatusFilterBar options={LISTING_FILTERS} value={filter} onChange={setFilter} />
        <SearchBox value={searchInput} onChange={setSearchInput} placeholder="Search listings…" />
      </div>

      <ErrorBanner message={error} />

      {isLoading ? (
        <p className="text-[0.9rem] text-text-muted">Loading listings…</p>
      ) : properties.length === 0 ? (
        <EmptyState text="No listings match this filter." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {properties.map((p) => (
            <div
              key={p.id}
              className="rounded-[var(--radius-lg)] border border-line-dark bg-paper overflow-hidden shadow-card1"
            >
              <div className="h-[130px] bg-paper-2 relative">
                {p.images?.[0]?.url && (
                  <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                )}
                <span
                  className={`absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 text-[0.66rem] font-semibold capitalize ${STATUS_BADGE[p.status]}`}
                >
                  {p.status}
                </span>
              </div>
              <div className="p-4">
                <div className="font-display font-semibold text-[1rem] text-text leading-tight">
                  {p.name}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-[0.8rem] text-text-muted">
                  <MapPin size={13} strokeWidth={1.8} />
                  {p.area} · {p.university}
                </div>
                <div className="text-[0.8rem] text-text-muted mt-1">
                  Listed by {p.landlord?.businessName || p.landlord?.fullName}
                </div>
                <div className="font-mono font-semibold text-[0.95rem] text-text mt-3">
                  MK {Number(p.price).toLocaleString()}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-dashed border-line-dark">
                  {p.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handle(reject, p.id)}
                        className="flex-1 rounded-full border border-line-dark px-3 py-2 text-[0.78rem] font-semibold text-clay hover:bg-clay/10 transition-colors disabled:opacity-40"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handle(approve, p.id)}
                        className="flex-1 rounded-full bg-ink px-3 py-2 text-[0.78rem] font-semibold text-text-inverse hover:bg-green-dark transition-colors disabled:opacity-40"
                      >
                        Approve
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handle(p.isActive ? deactivate : activate, p.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-line-dark px-3 py-2 text-[0.78rem] font-semibold text-text hover:bg-paper-2 transition-colors disabled:opacity-40"
                      >
                        {p.isActive ? (
                          <>
                            <EyeOff size={13} strokeWidth={1.8} /> Deactivate
                          </>
                        ) : (
                          <>
                            <Eye size={13} strokeWidth={1.8} /> Activate
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handleRemove(p)}
                        title="Delete listing"
                        className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-line-dark text-text-muted hover:bg-clay/10 hover:text-clay transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'landlords', label: 'Landlords' },
  { value: 'students', label: 'Students' },
];

const emptyAnnouncementForm = { title: '', body: '', audience: 'all', expiresAt: '' };

function AnnouncementsPanel() {
  const {
    announcements,
    isLoading,
    isSaving,
    error,
    createAnnouncement,
    setActive,
    removeAnnouncement,
    clearError,
  } = useAdminAnnouncements();
  const [form, setForm] = useState(emptyAnnouncementForm);
  const [busyId, setBusyId] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    clearError();
    try {
      await createAnnouncement({
        title: form.title,
        body: form.body,
        audience: form.audience,
        expiresAt: form.expiresAt || undefined,
      });
      setForm(emptyAnnouncementForm);
    } catch {
      // error already on state
    }
  }

  async function handle(action, id) {
    setBusyId(id);
    clearError();
    try {
      await action(id);
    } catch {
      // error already on state
    } finally {
      setBusyId(null);
    }
  }

  function handleRemove(a) {
    if (!window.confirm(`Delete "${a.title}"? This can't be undone.`)) return;
    handle((id) => removeAnnouncement(id), a.id);
  }

  return (
    <div>
      <ErrorBanner message={error} />

      <form
        onSubmit={handleCreate}
        className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5 space-y-3"
      >
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.03em] text-text-muted">
          New announcement
        </div>

        <input
          type="text"
          required
          maxLength={200}
          value={form.title}
          onChange={update('title')}
          placeholder="Title"
          className="input"
        />
        <textarea
          required
          maxLength={5000}
          rows={3}
          value={form.body}
          onChange={update('body')}
          placeholder="What should they know?"
          className="input resize-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <select value={form.audience} onChange={update('audience')} className="input">
            {AUDIENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.expiresAt}
            onChange={update('expiresAt')}
            className="input"
            title="Expires on (optional)"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.85rem] font-semibold text-text-inverse hover:bg-green-dark transition-colors disabled:opacity-50"
        >
          <Plus size={15} strokeWidth={2} />
          {isSaving ? 'Posting…' : 'Post announcement'}
        </button>
      </form>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-[0.9rem] text-text-muted">Loading announcements…</p>
        ) : announcements.length === 0 ? (
          <EmptyState text="No announcements posted yet." />
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-4 flex flex-wrap items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Megaphone size={14} strokeWidth={1.8} className="text-green-dark shrink-0" />
                    <span className="font-display font-semibold text-[0.95rem] text-text">
                      {a.title}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold capitalize ${
                        a.isActive ? 'bg-green/15 text-green-dark' : 'bg-paper-2 text-text-muted'
                      }`}
                    >
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="rounded-full bg-paper-2 px-2.5 py-0.5 text-[0.68rem] font-semibold capitalize text-text-muted">
                      {a.audience}
                    </span>
                  </div>
                  <p className="text-[0.82rem] text-text-muted mt-1.5">{a.body}</p>
                  {a.expiresAt && (
                    <div className="text-[0.72rem] text-text-muted mt-1.5">
                      Expires {new Date(a.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => handle((id) => setActive(id, !a.isActive), a.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line-dark px-3.5 py-2 text-[0.78rem] font-semibold text-text hover:bg-paper-2 transition-colors disabled:opacity-40"
                  >
                    {a.isActive ? (
                      <>
                        <EyeOff size={13} strokeWidth={1.8} /> Deactivate
                      </>
                    ) : (
                      <>
                        <Eye size={13} strokeWidth={1.8} /> Activate
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => handleRemove(a)}
                    aria-label="Delete announcement"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-line-dark text-text-muted hover:bg-clay/10 hover:text-clay transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------

const AUDIT_TARGET_TYPES = ['user', 'property', 'room', 'announcement'];

const AUDIT_ACTION_LABEL = {
  'user.verified': 'Account verified',
  'user.rejected': 'Verification rejected',
  'user.suspended': 'User suspended',
  'user.reactivated': 'User reactivated',
  'property.approved': 'Listing approved',
  'property.rejected': 'Listing rejected',
  'room.created': 'Room created',
  'room.updated': 'Room updated',
  'room.deleted': 'Room deleted',
  'announcement.created': 'Announcement posted',
  'announcement.updated': 'Announcement updated',
  'announcement.deleted': 'Announcement deleted',
};

function AuditLogPanel() {
  const [targetType, setTargetType] = useState('');
  const { logs, total, isLoading, error } = useAuditLog({ targetType: targetType || undefined });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTargetType('')}
            className={`rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold transition-colors ${
              targetType === ''
                ? 'bg-ink text-text-inverse'
                : 'bg-paper-2 text-text-muted hover:bg-paper-3'
            }`}
          >
            All
          </button>
          {AUDIT_TARGET_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTargetType(t)}
              className={`rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold capitalize transition-colors ${
                targetType === t
                  ? 'bg-ink text-text-inverse'
                  : 'bg-paper-2 text-text-muted hover:bg-paper-3'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {total > 0 && (
          <span className="text-[0.78rem] text-text-muted">{total} total entries</span>
        )}
      </div>

      <ErrorBanner message={error} />

      {isLoading ? (
        <p className="text-[0.9rem] text-text-muted">Loading audit log…</p>
      ) : logs.length === 0 ? (
        <EmptyState text="No audit log entries match this filter." />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper divide-y divide-line-dark overflow-hidden">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <ScrollText size={13} strokeWidth={1.8} className="text-green-dark shrink-0" />
                  <span className="text-[0.85rem] font-semibold text-text">
                    {AUDIT_ACTION_LABEL[log.action] || log.action}
                  </span>
                  <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[0.68rem] font-semibold capitalize text-text-muted">
                    {log.targetType}
                  </span>
                </div>
                <div className="text-[0.78rem] text-text-muted mt-1">
                  by {log.actorName || 'System'}
                  {log.actorRole ? ` (${log.actorRole})` : ''}
                </div>
              </div>
              <div className="text-[0.72rem] text-text-muted shrink-0">
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
