import { useMemo, useState } from 'react';
import { Building2, Archive, TrendingUp } from 'lucide-react';
import { useAdminProperties, useAdminUsers, useAdminBookings } from '../../hooks/useAdmin';

const TABS = [
  { key: 'listings', label: 'Listings', icon: Building2 },
  { key: 'bookings', label: 'Bookings', icon: Archive },
  { key: 'growth', label: 'Growth', icon: TrendingUp },
];

// Plain divs, not a charting library — nothing else in this app pulls in
// recharts/etc, so a lightweight horizontal bar keeps the bundle small
// and matches the rest of the UI instead of looking like a bolted-on
// widget.
function BarRow({ label, value, max, color = 'bg-green-dark' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 text-[0.78rem] text-text-muted truncate">{label}</div>
      <div className="flex-1 h-6 rounded-full bg-paper-2 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }} />
      </div>
      <div className="w-10 shrink-0 text-right text-[0.78rem] font-semibold text-text">{value}</div>
    </div>
  );
}

function BarChartCard({ title, rows, color }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5">
      <div className="text-[0.85rem] font-semibold text-text mb-4">{title}</div>
      {rows.length === 0 ? (
        <p className="text-[0.8rem] text-text-muted">No data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <BarRow key={r.label} label={r.label} value={r.value} max={max} color={color} />
          ))}
        </div>
      )}
    </div>
  );
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  });
}

function last6Months() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }
  return months;
}

export default function ReportsPanel() {
  const [tab, setTab] = useState('listings');
  const { properties, isLoading: propertiesLoading } = useAdminProperties({ status: 'all' });
  const { users, isLoading: usersLoading } = useAdminUsers({ verificationStatus: 'all', accountStatus: 'active' });
  const { bookings, isLoading: bookingsLoading } = useAdminBookings({ limit: 500 });

  const listingsByStatus = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    properties.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return [
      { label: 'Approved', value: counts.approved },
      { label: 'Pending', value: counts.pending },
      { label: 'Rejected', value: counts.rejected },
    ];
  }, [properties]);

  const listingsByArea = useMemo(() => {
    const counts = {};
    properties.forEach((p) => {
      counts[p.area] = (counts[p.area] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));
  }, [properties]);

  const bookingsByStatus = useMemo(() => {
    const counts = { pending: 0, accepted: 0, rejected: 0, cancelled: 0 };
    bookings.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    return [
      { label: 'Pending', value: counts.pending },
      { label: 'Accepted', value: counts.accepted },
      { label: 'Rejected', value: counts.rejected },
      { label: 'Cancelled', value: counts.cancelled },
    ];
  }, [bookings]);

  const signups = useMemo(() => {
    const months = last6Months();
    const students = Object.fromEntries(months.map((m) => [m, 0]));
    const landlords = Object.fromEntries(months.map((m) => [m, 0]));
    users.forEach((u) => {
      const key = monthKey(u.createdAt);
      if (u.role === 'student' && key in students) students[key] += 1;
      if (u.role === 'landlord' && key in landlords) landlords[key] += 1;
    });
    return months.map((m) => ({
      label: monthLabel(m),
      students: students[m],
      landlords: landlords[m],
    }));
  }, [users]);

  const isLoading = propertiesLoading || usersLoading || bookingsLoading;

  return (
    <div>
      <div className="flex gap-1.5 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold transition-colors ${
              tab === t.key ? 'bg-ink text-text-inverse' : 'bg-paper-2 text-text-muted hover:bg-paper-3'
            }`}
          >
            <t.icon size={13} strokeWidth={1.8} />
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-[0.9rem] text-text-muted">Loading data…</p>
      ) : (
        <>
          {tab === 'listings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BarChartCard title="Listings by status" rows={listingsByStatus} />
              <BarChartCard title="Listings by area" rows={listingsByArea} color="bg-gold" />
            </div>
          )}

          {tab === 'bookings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BarChartCard title="Bookings by status" rows={bookingsByStatus} color="bg-green-dark" />
              <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5 flex flex-col items-center justify-center text-center">
                <Archive size={22} strokeWidth={1.8} className="text-text-muted" />
                <p className="text-[1.6rem] font-display font-semibold text-text mt-2">
                  {bookings.length}
                </p>
                <p className="text-[0.8rem] text-text-muted mt-0.5">total booking requests</p>
              </div>
            </div>
          )}

          {tab === 'growth' && (
            <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5">
              <div className="text-[0.85rem] font-semibold text-text mb-4">
                New signups — last 6 months
              </div>
              <div className="space-y-3">
                {signups.map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <div className="w-14 shrink-0 text-[0.76rem] text-text-muted">{m.label}</div>
                    <div className="flex-1 flex items-center gap-1.5">
                      <div
                        className="h-5 rounded-l-full bg-green-dark"
                        style={{ width: `${Math.max(m.students * 8, m.students > 0 ? 6 : 0)}px` }}
                        title={`${m.students} students`}
                      />
                      <div
                        className="h-5 rounded-r-full bg-gold"
                        style={{ width: `${Math.max(m.landlords * 8, m.landlords > 0 ? 6 : 0)}px` }}
                        title={`${m.landlords} landlords`}
                      />
                    </div>
                    <div className="w-20 shrink-0 text-right text-[0.74rem] text-text-muted">
                      {m.students}s · {m.landlords}l
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-dashed border-line-dark text-[0.76rem] text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-dark" /> Students
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gold" /> Landlords
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
