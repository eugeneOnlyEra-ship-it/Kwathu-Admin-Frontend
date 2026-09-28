import { useState } from 'react';
import { Crown, GraduationCap, User as UserIcon, CheckCircle2, Search, AlertTriangle } from 'lucide-react';
import { useAdminUsers } from '../../hooks/useAdmin';

const ROLE_INFO = {
  admin: {
    icon: Crown,
    label: 'Admin',
    color: 'bg-clay/10 text-clay border-clay/20',
    // Reflects what @Roles(UserRole.ADMIN) actually gates across the API —
    // not an aspirational list, this is what the guards enforce today.
    perms: [
      'Verify or reject landlord identity',
      'Approve or reject listings',
      'Suspend / reactivate any account',
      'Change any user\u2019s role',
      'Post platform-wide announcements',
      'View the full audit log',
    ],
  },
  landlord: {
    icon: GraduationCap,
    label: 'Landlord',
    color: 'bg-gold/15 text-gold border-gold/25',
    perms: [
      'Create, edit, and delete own listings',
      'Manage rooms on own listings',
      'Accept or reject booking requests',
      'Upload ID + proof of ownership for review',
    ],
  },
  student: {
    icon: UserIcon,
    label: 'Student',
    color: 'bg-green/15 text-green-dark border-green/25',
    perms: ['Browse and search listings', 'Request to book a room', 'Cancel a pending request'],
  },
};

export default function RolesPanel() {
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const { users, isLoading, error, changeRole, clearError } = useAdminUsers({
    verificationStatus: 'all',
    accountStatus: 'active',
    role: role || undefined,
    search,
  });

  // { userId, newRole, userLabel } while a change is pending confirmation
  const [pending, setPending] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function confirmChange() {
    if (!pending) return;
    setBusyId(pending.userId);
    clearError();
    try {
      await changeRole(pending.userId, pending.newRole);
      setPending(null);
    } catch {
      // error already on state
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-8">
        {Object.entries(ROLE_INFO).map(([key, { icon: Icon, label, color, perms }]) => (
          <div key={key} className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-4">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold ${color}`}>
              <Icon size={12} strokeWidth={2} />
              {label}
            </span>
            <ul className="mt-3 space-y-1.5">
              {perms.map((p) => (
                <li key={p} className="flex items-start gap-1.5 text-[0.78rem] text-text-muted">
                  <CheckCircle2 size={12} strokeWidth={2} className="text-green-dark shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 text-[0.82rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="input pl-9 py-2"
          />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="input w-auto py-2">
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="landlord">Landlords</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-[0.9rem] text-text-muted">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-[0.9rem] text-text-muted">No users match this filter.</p>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper divide-y divide-line-dark overflow-hidden">
          {users.map((u) => {
            const info = ROLE_INFO[u.role];
            const Icon = info?.icon || UserIcon;
            return (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-[0.88rem] font-semibold text-text">
                    {u.fullName || u.businessName || u.email}
                  </div>
                  <div className="text-[0.76rem] text-text-muted">{u.email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold ${info?.color || ''}`}>
                    <Icon size={12} strokeWidth={2} />
                    {info?.label || u.role}
                  </span>
                  <select
                    value=""
                    disabled={busyId === u.id}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      if (!newRole || newRole === u.role) return;
                      setPending({
                        userId: u.id,
                        newRole,
                        userLabel: u.fullName || u.email,
                        fromLabel: info?.label || u.role,
                        toLabel: ROLE_INFO[newRole]?.label || newRole,
                      });
                    }}
                    className="rounded-full border border-line-dark bg-paper px-3 py-1.5 text-[0.76rem] font-semibold text-text disabled:opacity-40"
                  >
                    <option value="">Change role…</option>
                    {Object.entries(ROLE_INFO)
                      .filter(([key]) => key !== u.role)
                      .map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
          <div
            onClick={() => setPending(null)}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <div className="relative w-full max-w-[420px] rounded-[var(--radius-lg)] bg-paper p-6 shadow-card2">
            <AlertTriangle size={22} strokeWidth={1.8} className="text-gold" />
            <h3 className="font-display font-semibold text-[1.1rem] text-text mt-3">
              Change {pending.userLabel}'s role?
            </h3>
            <p className="text-[0.85rem] text-text-muted mt-1.5">
              This moves them from <strong className="text-text">{pending.fromLabel}</strong> to{' '}
              <strong className="text-text">{pending.toLabel}</strong> immediately — their access
              changes right away, and this is recorded in the audit log.
            </p>
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="flex-1 rounded-full border border-line-dark py-2.5 text-[0.85rem] font-semibold text-text hover:bg-paper-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmChange}
                disabled={busyId === pending.userId}
                className="flex-1 rounded-full bg-ink py-2.5 text-[0.85rem] font-semibold text-text-inverse hover:bg-green-dark disabled:opacity-50"
              >
                {busyId === pending.userId ? 'Changing…' : 'Confirm change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
