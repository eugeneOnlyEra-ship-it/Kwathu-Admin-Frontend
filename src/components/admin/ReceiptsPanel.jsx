import { useEffect, useRef, useState } from 'react';
import {
  Search,
  FileText,
  Download,
  X,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ScanSearch,
} from 'lucide-react';
import {
  useAdminReceipts,
  useVerifyAllReceipts,
  downloadReceiptPdf,
} from '../../hooks/useReceipts';

const PAGE_SIZE = 25;

const VERIFIED_BY = [
  { value: '', label: 'All' },
  { value: 'lister', label: 'Verified by lister' },
  { value: 'paychangu', label: 'Confirmed by PayChangu' },
];

const CHANNEL_LABELS = {
  tnm_mpamba: 'TNM Mpamba',
  airtel_money: 'Airtel Money',
  national_bank: 'National Bank',
  manual: 'Paid directly to lister',
};

const INTEGRITY = {
  ok: {
    label: 'Intact',
    icon: ShieldCheck,
    cls: 'bg-green/15 text-green-dark',
    help: 'Matches the fingerprint recorded when it was issued.',
  },
  mismatch: {
    label: 'Altered',
    icon: ShieldAlert,
    cls: 'bg-clay/15 text-clay',
    help: 'Its contents no longer match the fingerprint recorded when it was issued — something was changed after issue.',
  },
  unsigned: {
    label: 'Not signed',
    icon: ShieldQuestion,
    cls: 'bg-paper-3 text-text-muted',
    help: 'Issued before fingerprints were recorded, so it cannot be checked.',
  },
};

const money = (n, currency = 'MWK') =>
  `${currency === 'MWK' ? 'MK' : currency} ${Number(n || 0).toLocaleString()}`;
const when = (d) =>
  new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function IntegrityBadge({ value }) {
  const meta = INTEGRITY[value] ?? INTEGRITY.unsigned;
  const Icon = meta.icon;
  return (
    <span
      title={meta.help}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${meta.cls}`}
    >
      <Icon size={12} strokeWidth={2.2} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-line-dark px-5 py-4">
      <div className="text-[0.7rem] uppercase tracking-[0.06em] text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-[1.35rem] font-semibold text-text">{value}</div>
    </div>
  );
}

function Detail({ label, children, mono = false }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div className="flex gap-4 py-2 text-[0.82rem]">
      <dt className="w-[130px] shrink-0 text-text-muted">{label}</dt>
      <dd className={`min-w-0 break-words text-text ${mono ? 'font-mono text-[0.76rem]' : ''}`}>{children}</dd>
    </div>
  );
}

function ReceiptModal({ receipt, onClose }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleDownload() {
    setError(null);
    setIsDownloading(true);
    try {
      await downloadReceiptPdf(receipt);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  }

  const meta = INTEGRITY[receipt.integrity] ?? INTEGRITY.unsigned;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <div onClick={onClose} className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-receipt-title"
        className="relative max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-[var(--radius-lg)] bg-paper p-6 shadow-card2"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="admin-receipt-title" className="font-display text-[1.2rem] font-semibold text-text">
              Receipt {receipt.receiptNumber}
            </h2>
            <div className="mt-1.5">
              <IntegrityBadge value={receipt.integrity} />
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-text-muted hover:bg-paper-2 hover:text-ink"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <p className={`mt-3 rounded-[var(--radius-md)] px-3.5 py-2.5 text-[0.78rem] leading-relaxed ${meta.cls}`}>
          {meta.help}
        </p>

        <div className="mt-4 rounded-[var(--radius-md)] bg-paper-2 px-4 py-3">
          <div className="text-[0.7rem] uppercase tracking-[0.06em] text-text-muted">Deposit</div>
          <div className="font-mono text-[1.5rem] font-semibold text-green-dark">
            {money(receipt.amount, receipt.currency)}
          </div>
        </div>

        <dl className="mt-3 divide-y divide-line-dark">
          <Detail label="Issued by">
            {receipt.verifiedBy === 'lister'
              ? `The lister — ${receipt.listerBusinessName || receipt.listerName} (marked the deposit as received)`
              : 'Confirmed automatically by PayChangu'}
          </Detail>
          <Detail label="Issued at">{when(receipt.issuedAt)}</Detail>
          <Detail label="Payment time">{when(receipt.paidAt)}</Detail>
          <Detail label="Lister">
            {receipt.listerName}
            {receipt.listerBusinessName ? ` (${receipt.listerBusinessName})` : ''}
            {receipt.listerPhone ? ` · ${receipt.listerPhone}` : ''}
          </Detail>
          <Detail label="Customer">
            {receipt.customerName}
            {receipt.customerPhone ? ` · ${receipt.customerPhone}` : ''}
          </Detail>
          <Detail label="Place">
            {receipt.propertyArea ? `${receipt.propertyName}, ${receipt.propertyArea}` : receipt.propertyName}
          </Detail>
          <Detail label="Room">
            {receipt.roomLabel ? `${receipt.roomLabel}${receipt.roomType ? ` (${receipt.roomType})` : ''}` : null}
          </Detail>
          <Detail label="Method">{CHANNEL_LABELS[receipt.channel] ?? receipt.channel}</Detail>
          <Detail label="Reference" mono>{receipt.providerReference}</Detail>
          <Detail label="Booking id" mono>{receipt.bookingId}</Detail>
          <Detail label="Payment id" mono>{receipt.paymentId}</Detail>
          <Detail label="Fingerprint" mono>{receipt.contentHash || 'none recorded'}</Detail>
        </dl>

        {error && <p role="alert" className="mt-3 text-[0.8rem] text-clay">{error}</p>}

        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[0.88rem] font-semibold text-text-inverse transition-colors hover:bg-green-dark disabled:opacity-50"
        >
          <Download size={15} strokeWidth={2} aria-hidden="true" />
          {isDownloading ? 'Preparing PDF…' : 'Download the receipt (PDF)'}
        </button>
        <p className="mt-2 text-center text-[0.72rem] text-text-muted">
          This is the same file the customer and the lister receive.
        </p>
      </div>
    </div>
  );
}

function VerifyAll() {
  const { result, isVerifying, error, verify } = useVerifyAllReceipts();
  const clean = result && result.mismatch === 0;

  return (
    <div className="rounded-[var(--radius-lg)] border border-line-dark px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[0.9rem] font-semibold text-text">Check every receipt</div>
          <p className="mt-0.5 text-[0.78rem] text-text-muted">
            Re-computes each receipt&apos;s fingerprint and compares it with the one recorded when it
            was issued, to show whether anything was changed afterwards.
          </p>
        </div>
        <button
          type="button"
          onClick={verify}
          disabled={isVerifying}
          className="inline-flex items-center gap-2 rounded-full border border-line-dark px-4 py-2 text-[0.8rem] font-semibold text-text transition-colors hover:bg-paper-2 disabled:opacity-50"
        >
          <ScanSearch size={14} strokeWidth={2} aria-hidden="true" />
          {isVerifying ? 'Checking…' : 'Run check'}
        </button>
      </div>

      {error && <p role="alert" className="mt-3 text-[0.8rem] text-clay">{error}</p>}

      {result && (
        <div
          role="status"
          className={`mt-3 rounded-[var(--radius-md)] px-4 py-3 text-[0.82rem] leading-relaxed ${
            clean ? 'bg-green/15 text-green-dark' : 'bg-clay/10 text-clay'
          }`}
        >
          <strong className="font-semibold">
            {clean
              ? `All good — ${result.ok} of ${result.checked} receipts match their fingerprint.`
              : `${result.mismatch} receipt${result.mismatch === 1 ? '' : 's'} no longer ${result.mismatch === 1 ? 'matches' : 'match'} the fingerprint recorded at issue.`}
          </strong>
          {result.unsigned > 0 && (
            <span> {result.unsigned} older receipt{result.unsigned === 1 ? '' : 's'} had no fingerprint and can&apos;t be checked.</span>
          )}
          {!clean && (
            <ul className="mt-2 list-disc pl-5">
              {result.mismatched.map((m) => (
                <li key={m.id} className="font-mono text-[0.76rem]">{m.receiptNumber}</li>
              ))}
            </ul>
          )}
          <div className="mt-1 text-[0.72rem] opacity-80">Checked {when(result.checkedAt)}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Admin audit trail of receipts. Every deposit that gets verified produces
 * a receipt; this lists them all — who issued it, to whom, for how much —
 * with the exact PDF copy, and checks each against its issue-time
 * fingerprint so any later change is visible.
 */
export default function ReceiptsPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  // Wait for a pause in typing before querying. Only touches the page when
  // the search text really changed — otherwise this timer (which also fires
  // shortly after the panel first appears) would throw away a page the
  // admin had already moved to.
  const appliedSearch = useRef('');
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== appliedSearch.current) {
        appliedSearch.current = next;
        setSearch(next);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: receipts, total, totals, isLoading, error } = useAdminReceipts({
    search,
    verifiedBy,
    from,
    to,
    page,
    limit: PAGE_SIZE,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(search || verifiedBy || from || to);
  const altered = receipts.filter((r) => r.integrity === 'mismatch').length;

  function clearFilters() {
    setSearchInput('');
    appliedSearch.current = '';
    setSearch('');
    setVerifiedBy('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  async function quickDownload(receipt) {
    setDownloadError(null);
    try {
      await downloadReceiptPdf(receipt);
    } catch (err) {
      setDownloadError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label={filtered ? 'Receipts matching' : 'Receipts issued'} value={totals.count.toLocaleString()} />
        <Stat label={filtered ? 'Deposits matching' : 'Deposits recorded'} value={money(totals.amount)} />
      </div>

      <VerifyAll />

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <label htmlFor="receipt-search" className="sr-only">
            Search receipts
          </label>
          <Search size={15} strokeWidth={1.8} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input
            id="receipt-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Receipt no., customer, lister, place or reference…"
            className="input !pl-10"
          />
        </div>
        <div>
          <label htmlFor="receipt-from" className="mb-1 block text-[0.68rem] uppercase tracking-[0.05em] text-text-muted">
            From
          </label>
          <input id="receipt-from" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="input" />
        </div>
        <div>
          <label htmlFor="receipt-to" className="mb-1 block text-[0.68rem] uppercase tracking-[0.05em] text-text-muted">
            To
          </label>
          <input id="receipt-to" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="input" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VERIFIED_BY.map((o) => (
          <button
            key={o.value || 'all'}
            type="button"
            onClick={() => { setVerifiedBy(o.value); setPage(1); }}
            aria-pressed={verifiedBy === o.value}
            className={`rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold transition-colors ${
              verifiedBy === o.value ? 'bg-ink text-text-inverse' : 'bg-paper-2 text-text-muted hover:bg-paper-3'
            }`}
          >
            {o.label}
          </button>
        ))}
        {filtered && (
          <button type="button" onClick={clearFilters} className="ml-1 text-[0.76rem] font-semibold text-text-muted underline hover:text-ink">
            Clear filters
          </button>
        )}
      </div>

      {altered > 0 && (
        <div role="alert" className="rounded-[var(--radius-md)] border border-clay/30 bg-clay/10 px-4 py-3 text-[0.82rem] text-clay">
          <strong className="font-semibold">
            {altered} receipt{altered === 1 ? '' : 's'} on this page {altered === 1 ? 'has' : 'have'} been altered since {altered === 1 ? 'it was' : 'they were'} issued.
          </strong>{' '}
          Open {altered === 1 ? 'it' : 'them'} to see details.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-[var(--radius-md)] border border-clay/20 bg-clay/10 px-4 py-3 text-[0.82rem] text-clay">{error}</div>
      )}
      {downloadError && (
        <div role="alert" className="rounded-[var(--radius-md)] border border-clay/20 bg-clay/10 px-4 py-3 text-[0.82rem] text-clay">{downloadError}</div>
      )}

      {isLoading && receipts.length === 0 ? (
        <p className="text-[0.88rem] text-text-muted">Loading receipts…</p>
      ) : receipts.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line-dark px-6 py-12 text-center">
          <FileText size={26} strokeWidth={1.5} className="mx-auto text-text-muted" aria-hidden="true" />
          <p className="mt-3 text-[0.9rem] text-text">
            {filtered ? 'No receipts match those filters.' : 'No receipts have been issued yet.'}
          </p>
          {!filtered && (
            <p className="mt-1 text-[0.8rem] text-text-muted">
              One is created automatically whenever a deposit is verified.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-line-dark rounded-[var(--radius-lg)] border border-line-dark">
          {receipts.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.84rem] font-semibold text-text">{r.receiptNumber}</span>
                  <IntegrityBadge value={r.integrity} />
                </div>
                <div className="mt-1 text-[0.82rem] text-text">
                  {r.propertyName}
                  {r.roomLabel ? <span className="text-text-muted"> · {r.roomLabel}</span> : null}
                </div>
                <div className="mt-0.5 text-[0.76rem] text-text-muted">
                  {r.listerBusinessName || r.listerName} → {r.customerName}
                </div>
                <div className="mt-0.5 text-[0.72rem] text-text-muted">
                  {CHANNEL_LABELS[r.channel] ?? r.channel} ·{' '}
                  {r.verifiedBy === 'lister' ? 'issued by the lister' : 'confirmed by PayChangu'} · {when(r.issuedAt)}
                </div>
              </div>
              <div className="font-mono text-[0.95rem] font-semibold text-text">{money(r.amount, r.currency)}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(r)}
                  aria-label={`View receipt ${r.receiptNumber}`}
                  className="rounded-full border border-line-dark px-3.5 py-1.5 text-[0.76rem] font-semibold text-text hover:bg-paper-2"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => quickDownload(r)}
                  aria-label={`Download receipt ${r.receiptNumber} as PDF`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line-dark px-3.5 py-1.5 text-[0.76rem] font-semibold text-text hover:bg-paper-2"
                >
                  <Download size={13} strokeWidth={2} aria-hidden="true" />
                  PDF
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <nav aria-label="Receipts pages" className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="rounded-full border border-line-dark px-4 py-2 text-[0.8rem] font-semibold text-text hover:bg-paper-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-[0.8rem] text-text-muted">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages || isLoading}
            className="rounded-full border border-line-dark px-4 py-2 text-[0.8rem] font-semibold text-text hover:bg-paper-2 disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}

      {selected && <ReceiptModal receipt={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
