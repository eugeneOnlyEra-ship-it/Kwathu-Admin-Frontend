import { useMemo, useState } from 'react';
import {
  Banknote,
  Smartphone,
  Landmark,
  CheckCircle2,
  Clock,
  XCircle,
  AlertOctagon,
  Search,
} from 'lucide-react';
import { useAdminPayments, useAdminPayoutDetails } from '../../hooks/usePayments';
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
  { key: 'payouts', label: 'Payout destinations' },
];

export default function PaymentsPanel() {
  const [subTab, setSubTab] = useState('transactions');
  // Shared across both sub-tabs: every property, used to resolve a
  // propertyId into a name/landlord and to drive the payout-destinations
  // list (every property needs exactly one PropertyPayoutDetails row).
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
        <PayoutDestinationsTab properties={properties} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Transactions — every deposit collected platform-wide, for transparency
// to admins (and, scoped to their own properties, landlords on their own
// dashboard). This view never edits a payment, only records that a
// SUCCESS one has actually been forwarded to the landlord outside the
// platform (markDisbursed).
// ---------------------------------------------------------------------

function TransactionsTab({ propertyMap }) {
  const [status, setStatus] = useState('');
  const { payments, total, isLoading, error, markDisbursed, clearError } = useAdminPayments({
    status: status || undefined,
  });
  const [busyId, setBusyId] = useState(null);

  async function handleDisburse(id) {
    setBusyId(id);
    clearError();
    try {
      await markDisbursed(id);
    } catch {
      // error already on state
    } finally {
      setBusyId(null);
    }
  }

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
                  {p.status === 'success' &&
                    (p.disbursedAt ? (
                      <span className="rounded-full bg-green/15 text-green-dark px-3 py-1.5 text-[0.74rem] font-semibold">
                        Disbursed {new Date(p.disbursedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handleDisburse(p.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[0.76rem] font-semibold text-text-inverse hover:bg-green-dark transition-colors disabled:opacity-40"
                      >
                        <Banknote size={13} strokeWidth={1.8} />
                        {busyId === p.id ? 'Marking…' : 'Mark disbursed'}
                      </button>
                    ))}
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
// Payout destinations — one record per property, admin-only to set or
// change, shared by every room on that property (see the product
// decision this mirrors: all rooms on a listing pay out to the same
// place, and only an admin can change where that is).
// ---------------------------------------------------------------------

function PayoutDestinationsTab({ properties }) {
  const { details, isLoading, error, isSaving, save, clearError } = useAdminPayoutDetails();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // property object or null

  const detailsByProperty = useMemo(() => {
    const map = new Map();
    details.forEach((d) => map.set(d.propertyId, d));
    return map;
  }, [details]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.landlord?.fullName?.toLowerCase().includes(q) ||
        p.landlord?.businessName?.toLowerCase().includes(q),
    );
  }, [properties, search]);

  return (
    <div>
      <div className="relative max-w-[320px] mb-5">
        <Search size={14} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search properties or landlords…"
          className="input pl-8 py-2 text-[0.85rem]"
        />
      </div>

      {error && (
        <div className="mb-4 text-[0.82rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-[0.9rem] text-text-muted">Loading payout destinations…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line-dark px-6 py-14 text-center">
          <p className="text-[0.95rem] text-text">No properties match this search.</p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper divide-y divide-line-dark overflow-hidden">
          {filtered.map((p) => {
            const d = detailsByProperty.get(p.id);
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <div className="font-display font-semibold text-[0.92rem] text-text">{p.name}</div>
                  <div className="text-[0.78rem] text-text-muted mt-0.5">
                    {p.landlord?.businessName || p.landlord?.fullName}
                  </div>
                  {d ? (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[0.78rem] text-text">
                      {d.payoutMethod === 'mobile_money' ? (
                        <Smartphone size={13} strokeWidth={1.8} className="text-green-dark" />
                      ) : (
                        <Landmark size={13} strokeWidth={1.8} className="text-green-dark" />
                      )}
                      {d.payoutMethod === 'mobile_money'
                        ? `${CHANNEL_LABEL[d.mobileMoneyProvider] || 'Mobile money'} · ${d.mobileMoneyNumber}`
                        : `${d.bankName} · ${d.bankAccountNumber}`}
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[0.78rem] text-gold font-semibold">
                      Not configured — deposits can't be collected yet
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="shrink-0 rounded-full border border-line-dark px-3.5 py-1.5 text-[0.78rem] font-semibold text-text hover:bg-paper-2 transition-colors"
                >
                  {d ? 'Edit' : 'Set destination'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <PayoutDetailsModal
          property={editing}
          existing={detailsByProperty.get(editing.id)}
          isSaving={isSaving}
          onClose={() => {
            setEditing(null);
            clearError();
          }}
          onSave={async (payload) => {
            await save(editing.id, payload);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PayoutDetailsModal({ property, existing, isSaving, onClose, onSave }) {
  const [form, setForm] = useState({
    payoutMethod: existing?.payoutMethod || 'mobile_money',
    mobileMoneyProvider: existing?.mobileMoneyProvider || 'tnm_mpamba',
    mobileMoneyNumber: existing?.mobileMoneyNumber || '',
    mobileMoneyAccountName: existing?.mobileMoneyAccountName || '',
    bankName: existing?.bankName || '',
    bankAccountName: existing?.bankAccountName || '',
    bankAccountNumber: existing?.bankAccountNumber || '',
    bankBranch: existing?.bankBranch || '',
  });
  const [localError, setLocalError] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);
    const payload =
      form.payoutMethod === 'mobile_money'
        ? {
            payoutMethod: 'mobile_money',
            mobileMoneyProvider: form.mobileMoneyProvider,
            mobileMoneyNumber: form.mobileMoneyNumber,
            mobileMoneyAccountName: form.mobileMoneyAccountName,
            bankBranch: form.bankBranch || undefined,
          }
        : {
            payoutMethod: 'bank',
            bankName: form.bankName,
            bankAccountName: form.bankAccountName,
            bankAccountNumber: form.bankAccountNumber,
            bankBranch: form.bankBranch || undefined,
          };
    try {
      await onSave(payload);
    } catch (err) {
      setLocalError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <div onClick={onClose} className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" aria-hidden="true" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-[460px] rounded-[var(--radius-lg)] bg-paper p-6 shadow-card2 space-y-3.5"
      >
        <h3 className="font-display font-semibold text-[1.1rem] text-text">
          Payout destination — {property.name}
        </h3>
        <p className="text-[0.8rem] text-text-muted">
          Every room on this listing sends its reservation deposit to this same destination.
          Only an admin can change it.
        </p>

        {localError && (
          <div className="text-[0.8rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3 py-2">
            {localError}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, payoutMethod: 'mobile_money' }))}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-[0.8rem] font-semibold transition-colors ${
              form.payoutMethod === 'mobile_money'
                ? 'border-green-dark bg-green/10 text-green-dark'
                : 'border-line-dark text-text-muted hover:bg-paper-2'
            }`}
          >
            <Smartphone size={14} strokeWidth={1.8} />
            Mobile money
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, payoutMethod: 'bank' }))}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-[0.8rem] font-semibold transition-colors ${
              form.payoutMethod === 'bank'
                ? 'border-green-dark bg-green/10 text-green-dark'
                : 'border-line-dark text-text-muted hover:bg-paper-2'
            }`}
          >
            <Landmark size={14} strokeWidth={1.8} />
            Bank
          </button>
        </div>

        {form.payoutMethod === 'mobile_money' ? (
          <>
            <select value={form.mobileMoneyProvider} onChange={update('mobileMoneyProvider')} className="input">
              <option value="tnm_mpamba">TNM Mpamba</option>
              <option value="airtel_money">Airtel Money</option>
            </select>
            <input
              type="text"
              required
              value={form.mobileMoneyNumber}
              onChange={update('mobileMoneyNumber')}
              placeholder="Mobile money number"
              className="input"
            />
            <input
              type="text"
              required
              value={form.mobileMoneyAccountName}
              onChange={update('mobileMoneyAccountName')}
              placeholder="Registered account name"
              className="input"
            />
          </>
        ) : (
          <>
            <input
              type="text"
              required
              value={form.bankName}
              onChange={update('bankName')}
              placeholder="Bank name"
              className="input"
            />
            <input
              type="text"
              required
              value={form.bankAccountName}
              onChange={update('bankAccountName')}
              placeholder="Account name"
              className="input"
            />
            <input
              type="text"
              required
              value={form.bankAccountNumber}
              onChange={update('bankAccountNumber')}
              placeholder="Account number"
              className="input"
            />
            <input
              type="text"
              value={form.bankBranch}
              onChange={update('bankBranch')}
              placeholder="Branch (optional)"
              className="input"
            />
          </>
        )}

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-line-dark py-2.5 text-[0.85rem] font-semibold text-text hover:bg-paper-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 rounded-full bg-ink py-2.5 text-[0.85rem] font-semibold text-text-inverse hover:bg-green-dark disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save destination'}
          </button>
        </div>
      </form>
    </div>
  );
}
