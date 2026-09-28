import { useState } from 'react';
import { ShieldAlert, ShieldCheck, History, Send, AlertTriangle } from 'lucide-react';
import { useLoginEvents, useBulkEmail } from '../../hooks/useAdmin';
import { useAuditLog } from '../../hooks/useAuditLog';
import TrendBars from './TrendBars';

const ACTION_LABEL = {
  'user.verified': 'Account verified',
  'user.rejected': 'Verification rejected',
  'user.suspended': 'User suspended',
  'user.reactivated': 'User reactivated',
  'user.role_changed': 'Role changed',
  'user.bulk_email_sent': 'Bulk email sent',
  'property.approved': 'Listing approved',
  'property.rejected': 'Listing rejected',
  'room.created': 'Room created',
  'room.updated': 'Room updated',
  'room.deleted': 'Room deleted',
  'announcement.created': 'Announcement posted',
  'announcement.updated': 'Announcement updated',
  'announcement.deleted': 'Announcement deleted',
};

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'landlords', label: 'Landlords' },
  { value: 'students', label: 'Students' },
  { value: 'unverified-landlords', label: 'Unverified landlords' },
];

function BulkEmailForm() {
  const { send, isSending, error } = useBulkEmail();
  const [form, setForm] = useState({ audience: 'all', subject: '', body: '' });
  const [result, setResult] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setResult(null);
    const audienceLabel = AUDIENCE_OPTIONS.find((o) => o.value === form.audience)?.label;
    if (!window.confirm(`Send this email to: ${audienceLabel}?`)) return;
    try {
      const res = await send(form);
      setResult(res);
    } catch {
      // error already on hook state
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5">
      <div className="flex items-center gap-2">
        <Send size={15} strokeWidth={1.8} className="text-text-muted" />
        <span className="text-[0.85rem] font-semibold text-text">Security reminder email</span>
      </div>
      <p className="text-[0.78rem] text-text-muted mt-1.5">
        Sends a plain outreach email you write to the audience below. This is
        not a password-reset link — Kwathu doesn't have a reset flow yet, so
        keep the message informational (e.g. a reminder to use a strong
        password), not a "click here to reset" instruction.
      </p>

      {error && (
        <div className="mt-3 text-[0.8rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 text-[0.8rem] text-green-dark bg-green/10 border border-green/20 rounded-lg px-3 py-2">
          Sent to {result.sent} of {result.matched} matched accounts
          {result.skippedNoEmail > 0 && ` · ${result.skippedNoEmail} skipped (no email on file)`}
          {result.failed > 0 && ` · ${result.failed} failed to send`}
          {result.truncated && ' · audience was capped at 500 recipients'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <select value={form.audience} onChange={update('audience')} className="input">
          {AUDIENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          required
          maxLength={200}
          placeholder="Subject"
          value={form.subject}
          onChange={update('subject')}
          className="input"
        />
        <textarea
          required
          maxLength={5000}
          rows={4}
          placeholder="Message body…"
          value={form.body}
          onChange={update('body')}
          className="input resize-none"
        />
        <button
          type="submit"
          disabled={isSending}
          className="rounded-full bg-ink px-5 py-2.5 text-[0.85rem] font-semibold text-text-inverse hover:bg-green-dark transition-colors disabled:opacity-50"
        >
          {isSending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default function SecurityCenterPanel() {
  const { trends, failures, isLoading, error } = useLoginEvents({ days: 14 });
  const { logs: recentActions, isLoading: actionsLoading } = useAuditLog({});

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-[0.82rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={15} strokeWidth={1.8} className="text-green-dark" />
            <span className="text-[0.85rem] font-semibold text-text">
              Successful logins · last 14 days
            </span>
          </div>
          {isLoading ? (
            <p className="text-[0.8rem] text-text-muted">Loading…</p>
          ) : (
            <TrendBars rows={trends} colorKey="successCount" />
          )}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={15} strokeWidth={1.8} className="text-clay" />
            <span className="text-[0.85rem] font-semibold text-text">
              Failed attempts · last 14 days
            </span>
          </div>
          {isLoading ? (
            <p className="text-[0.8rem] text-text-muted">Loading…</p>
          ) : (
            <TrendBars rows={trends} colorKey="failureCount" />
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} strokeWidth={1.8} className="text-clay" />
          <span className="text-[0.85rem] font-semibold text-text">Recent failed logins</span>
        </div>
        {isLoading ? (
          <p className="text-[0.8rem] text-text-muted">Loading…</p>
        ) : failures.length === 0 ? (
          <p className="text-[0.82rem] text-text-muted">No failed login attempts recorded.</p>
        ) : (
          <div className="space-y-1.5">
            {failures.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-line-dark px-4 py-2.5 text-[0.8rem]"
              >
                <span className="text-text font-medium">{f.identifier}</span>
                <span className="text-text-muted capitalize">{f.method}</span>
                <span className="text-text-muted">{f.failureReason?.replace(/_/g, ' ')}</span>
                <span className="text-text-muted">{new Date(f.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <History size={15} strokeWidth={1.8} className="text-text-muted" />
          <span className="text-[0.85rem] font-semibold text-text">Recent admin actions</span>
        </div>
        {actionsLoading ? (
          <p className="text-[0.8rem] text-text-muted">Loading…</p>
        ) : recentActions.length === 0 ? (
          <p className="text-[0.82rem] text-text-muted">No admin actions logged yet.</p>
        ) : (
          <div className="space-y-1.5">
            {recentActions.slice(0, 8).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-line-dark px-4 py-2.5 text-[0.8rem]"
              >
                <span className="text-text">
                  <span className="font-semibold">{a.actorName || 'An admin'}</span>{' '}
                  {ACTION_LABEL[a.action] || a.action}
                </span>
                <span className="text-text-muted">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BulkEmailForm />
    </div>
  );
}
