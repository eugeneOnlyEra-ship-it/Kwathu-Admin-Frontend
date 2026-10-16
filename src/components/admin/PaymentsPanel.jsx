import { useMemo, useState } from 'react';
import {
  Link2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertOctagon,
  Search,
} from 'lucide-react';
import { useAdminPayments, useAdminConnections } from '../../hooks/usePayments';
import { useAdminProperties } from '../../hooks/useAdmin';

const STATUS_INFO = {
  pending: { label: 'Pending', color: 'bg-gold/15 text-gold', icon: Clock },
  success: { label: 'Success', color: 'bg-green/15 text-green-dark', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-clay/10 text-clay', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-paper-3 text-text-muted', icon: AlertOctagon },
};

const CHANNEL_LABEL = {
  tnm_mpamba: 'TNM Mpamba',
  airtel_money: 'Airtel Money',
  national_bank: 'National Bank',
  manual: 'Paid directly',
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'expired', label: 'Expired' },
];

const SUB_TABS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'connections', label: 'Connected accounts' },
];

export default function PaymentsPanel() {
  const [subTab, setSubTab] = useState('transactions');
  // Resolves a propertyId into a name/lister for the transactions list.
  const { properties } = useAdminProperties({ status: 'all' });
  const propertyMap = useMemo(() => {
    const map = new Map();
    properties.forEach((p) => map.set(p.id, p));
    return map;
  }, [properties]);

  return (
    <div>
      <div className="flex items-center gap-1 mb-6 border-b border-line-dark">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2.5 text-[0.82rem] font-semibold border-b-2 -mb-px transition-colors ${
              subTab === t.key
                ? 'border-green-dark text-ink'
                : 'border-transparent text-text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'transactions' ? (
        <TransactionsTab propertyMap={propertyMap} />
      ) : (
        <ConnectionsTab />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Transactions — every deposit collected platform-wide, for transparency
// to admins (and, scoped to their own properties, landlords on their own
// dashboard). Read-only: deposits are charged on each lister's own
// PayChangu account and settle straight to them, so there is nothing for
// an admin to forward or mark.
// ---------------------------------------------------------------------

function TransactionsTab({ propertyMap }) {
  const [status, setStatus] = useState('');
  const { payments, total, isLoading, error } = useAdminPayments({
    status: status || undefined,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold transition-colors ${
                status === f.value
                  ? 'bg-ink text-text-inverse'
                  : 'bg-paper-2 text-text-muted hover:bg-paper-3'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {total > 0 && <span className="text-[0.78rem] text-text-muted">{total} total</span>}
      </div>

      {error && (
        <div className="mb-4 text-[0.82rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-[0.9rem] text-text-muted">Loading payments…</p>
      ) : payments.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line-dark px-6 py-14 text-center">
          <p className="text-[0.95rem] text-text">No payments match this filter.</p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper divide-y divide-line-dark overflow-hidden">
          {payments.map((p) => {
            const info = STATUS_INFO[p.status] || STATUS_INFO.pending;
            const Icon = info.icon;
            const property = propertyMap.get(p.propertyId);
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${info.color}`}>
                      <Icon size={12} strokeWidth={2} />
                      {info.label}
                    </span>
                    <span className="font-mono font-semibold text-[0.95rem] text-text">
                      MK {Number(p.amount).toLocaleString()}
                    </span>
                    <span className="text-[0.76rem] text-text-muted">
                      via {CHANNEL_LABEL[p.channel] || p.channel}
                    </span>
                  </div>
                  <div className="text-[0.78rem] text-text-muted mt-1">
                    {property ? property.name : p.propertyId}
                    {property?.landlord && (
                      <> · {property.landlord.businessName || property.landlord.fullName}</>
                    )}
                  </div>
                  <div className="text-[0.7rem] text-text-muted mt-0.5 font-mono">
                    {p.providerReference}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[0.72rem] text-text-muted">
                    {new Date(p.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Connected accounts — which listers have linked their own PayChangu
// account (PayChangu Connect). Read-only: only the lister can connect or
// disconnect, so admins can't redirect anyone's money. Tokens are never
// returned by the API.
// ---------------------------------------------------------------------

const CONNECTION_BADGE = {
  active: { label: 'Connected', color: 'bg-green/15 text-green-dark' },
  pending: { label: 'Started, not finished', color: 'bg-gold/15 text-gold' },
  revoked: { label: 'Disconnected', color: 'bg-paper-3 text-text-muted' },
};

function ConnectionsTab() {
  const { connections, isLoading, error } = useAdminConnections();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(
      (c) =>
        c.userName?.toLowerCase().includes(q) || c.accountName?.toLowerCase().includes(q),
    );
  }, [connections, search]);

  return (
    <div>
      <p className="text-[0.82rem] text-text-muted mb-4 max-w-[620px]">
        Customers' deposits go straight into the PayChangu account each landlord or agent connects
        here. Admins can see who is connected but can't change where anyone's money is sent.
      </p>

      <div className="relative max-w-[320px] mb-5">
        <Search size={14} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search landlords or agents…"
          className="input pl-8 py-2 text-[0.85rem]"
        />
      </div>

      {error && (
        <div className="mb-4 text-[0.82rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-[0.9rem] text-text-muted">Loading connected accounts…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line-dark px-6 py-14 text-center">
          <p className="text-[0.95rem] text-text">No connected accounts yet.</p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper divide-y divide-line-dark overflow-hidden">
          {filtered.map((c) => {
            const badge = CONNECTION_BADGE[c.status] || CONNECTION_BADGE.revoked;
            return (
              <div key={c.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <div className="font-display font-semibold text-[0.92rem] text-text">
                    {c.userName || c.userId}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[0.78rem] text-text-muted">
                    <Link2 size={13} strokeWidth={1.8} />
                    {c.accountName || 'PayChangu account'}
                    {c.mode === 'test' && <span className="font-mono text-[0.68rem]">(test mode)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.connectedAt && (
                    <span className="text-[0.72rem] text-text-muted">
                      {new Date(c.connectedAt).toLocaleDateString()}
                    </span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
