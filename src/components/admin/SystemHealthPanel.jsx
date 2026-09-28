import {
  CheckCircle2,
  AlertTriangle,
  Activity,
  RefreshCw,
  ShieldCheck,
  Search,
  ArrowRight,
  Database,
  Cpu,
  Plug,
  ShieldOff,
  Wrench,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSystemHealth } from '../../hooks/useAdmin';
import { useAdminSystem } from '../../hooks/useSystem';
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

// The most drastic control on this page — locks the whole app to everyone
// except admins — so it gets its own clearly-bordered block rather than
// blending into the StatusCard grid below.
function MaintenanceControl() {
  const { maintenance, isSaving, error, setMaintenanceMode } = useAdminSystem();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (maintenance) setMessage(maintenance.message || '');
  }, [maintenance?.isEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle() {
    try {
      await setMaintenanceMode(!maintenance.isEnabled, message);
    } catch {
      // error already surfaced via the hook's error state below
    }
  }

  return (
    <div
      className={`mb-6 rounded-[var(--radius-lg)] border-2 p-4 ${
        maintenance?.isEnabled ? 'border-clay/40 bg-clay/8' : 'border-line-dark bg-paper'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Wrench size={16} strokeWidth={1.8} className={maintenance?.isEnabled ? 'text-clay' : 'text-text-muted'} />
        <span className="text-[0.88rem] font-semibold text-text">Maintenance mode</span>
        {maintenance?.isEnabled && (
          <span className="rounded-full bg-clay text-text-inverse px-2 py-0.5 text-[0.68rem] font-semibold">
            LIVE — site is locked
          </span>
        )}
      </div>
      <p className="text-[0.8rem] text-text-muted mb-3">
        When on, everyone except admins is blocked and shown a "down for maintenance" screen.
        You keep full access so you can always turn it back off.
      </p>

      {error && (
        <div className="mb-3 text-[0.82rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message shown to visitors while maintenance is on"
        rows={2}
        className="input py-2 text-[0.85rem] w-full mb-3"
      />
      <button
        type="button"
        onClick={toggle}
        disabled={isSaving || !maintenance}
        className={`rounded-full font-semibold text-[0.82rem] px-5 py-2.5 transition disabled:opacity-50 disabled:pointer-events-none ${
          maintenance?.isEnabled
            ? 'bg-paper text-text border border-line-dark hover:bg-paper-2'
            : 'bg-ink text-text-inverse hover:bg-ink-2'
        }`}
      >
        {isSaving
          ? 'Saving…'
          : maintenance?.isEnabled
            ? 'Turn maintenance mode off'
            : 'Turn maintenance mode on'}
      </button>
    </div>
  );
}

function StatusCard({ ok, label, value, sub }) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border-l-4 border border-line-dark bg-paper p-4 ${
        ok ? 'border-l-green-dark' : 'border-l-clay'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-text-muted">
            {label}
          </p>
          <p className="text-[1.3rem] font-display font-semibold text-text mt-1">{value}</p>
          {sub && <p className="text-[0.76rem] text-text-muted mt-0.5">{sub}</p>}
        </div>
        {ok ? (
          <CheckCircle2 size={22} strokeWidth={1.8} className="text-green-dark shrink-0" />
        ) : (
          <AlertTriangle size={22} strokeWidth={1.8} className="text-clay shrink-0" />
        )}
      </div>
    </div>
  );
}

// A callout for something that's real, current, and actually actionable —
// as opposed to the StatusCards above, which are "is this number fine",
// these are "here's a number that means go do something".
function ActionCallout({ count, label, actionLabel, onAction }) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onAction}
      className="w-full flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-gold/25 bg-gold/8 px-4 py-3.5 text-left hover:bg-gold/12 transition-colors"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle size={17} strokeWidth={1.8} className="text-gold shrink-0" />
        <span className="text-[0.85rem] text-text">
          <strong className="font-semibold">{count}</strong> {label}
        </span>
      </div>
      <span className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-text-muted shrink-0">
        {actionLabel}
        <ArrowRight size={13} strokeWidth={2} />
      </span>
    </button>
  );
}

export default function SystemHealthPanel({ onNavigate }) {
  const {
    userStats,
    propertyStats,
    recentActivity,
    loginTrends,
    searchStats,
    pendingLandlordsCount,
    systemInfo,
    latencyMs,
    checkedAt,
    isLoading,
    error,
    refresh,
  } = useSystemHealth();

  const apiHealthy = latencyMs != null && latencyMs < 2000;
  const failedLoginsToday = loginTrends?.length
    ? loginTrends[loginTrends.length - 1].failureCount
    : 0;
  const zeroResultRate =
    searchStats && searchStats.totalSearches > 0
      ? Math.round((searchStats.zeroResultSearches / searchStats.totalSearches) * 100)
      : 0;

  const activeDevFlags = systemInfo?.devFlags.filter((f) => f.active) ?? [];
  const db = systemInfo?.database;
  const connectionsPct = db ? Math.round((db.activeConnections / db.maxConnections) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[0.8rem] text-text-muted">
          {checkedAt ? `Last checked ${checkedAt.toLocaleTimeString()}` : 'Checking…'}
        </p>
        <button
          type="button"
          onClick={() => refresh().catch(() => {})}
          className="inline-flex items-center gap-1.5 rounded-full border border-line-dark px-3.5 py-1.5 text-[0.78rem] font-semibold text-text hover:bg-paper-2 transition-colors"
        >
          <RefreshCw size={13} strokeWidth={1.8} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-5 text-[0.82rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      <MaintenanceControl />

      {/* The most urgent thing this page can tell you — a dev bypass flag
          that's actually live right now, not just present in a file
          somewhere. Shown above everything else on purpose. */}
      {activeDevFlags.length > 0 && (
        <div className="mb-6 rounded-[var(--radius-lg)] border-2 border-clay/40 bg-clay/8 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <ShieldOff size={18} strokeWidth={1.8} className="text-clay shrink-0" />
            <span className="text-[0.88rem] font-semibold text-text">
              Verification bypass active
            </span>
          </div>
          <ul className="mt-2 space-y-1 pl-6 list-disc text-[0.8rem] text-text-muted">
            {activeDevFlags.map((f) => (
              <li key={f.name}>
                <code className="font-mono text-[0.76rem]">{f.name}</code> is currently{' '}
                <strong className="text-clay">active</strong> — new accounts/listings are being
                auto-approved with no review.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatusCard
          ok={apiHealthy}
          label="API response"
          value={latencyMs != null ? `${latencyMs}ms` : '—'}
          sub={apiHealthy ? 'Responding normally' : 'Slower than expected'}
        />
        <StatusCard
          ok
          label="Total listings"
          value={propertyStats?.total ?? '—'}
          sub={propertyStats ? `${propertyStats.approved} approved · ${propertyStats.pending} pending` : ''}
        />
        <StatusCard
          ok
          label="Total users"
          value={userStats?.total ?? '—'}
          sub={userStats ? `${userStats.students} students · ${userStats.landlords} landlords` : ''}
        />
      </div>

      {/* Real, current, actionable — not just "is this fine", but "go do
          something about this specific number". */}
      <div className="mt-4 space-y-2.5">
        <ActionCallout
          count={propertyStats?.pending ?? 0}
          label="listings waiting for approval"
          actionLabel="Review listings"
          onAction={() => onNavigate?.('listings')}
        />
        <ActionCallout
          count={pendingLandlordsCount ?? 0}
          label="landlords waiting for identity verification"
          actionLabel="Review landlords"
          onAction={() => onNavigate?.('landlords')}
        />
        <ActionCallout
          count={failedLoginsToday}
          label="failed login attempts today"
          actionLabel="Open security center"
          onAction={() => onNavigate?.('security')}
        />
      </div>

      {/* Database — real Postgres system-catalog numbers, not a general
          request/error monitor (Kwathu doesn't have one of those yet). */}
      <div className="mt-8">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.03em] text-text-muted mb-3">
          Database
        </div>
        {!db ? (
          <p className="text-[0.85rem] text-text-muted">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <StatusCard
                ok={db.latencyMs < 500}
                label="DB round-trip"
                value={`${db.latencyMs}ms`}
                sub="Raw query time, isolated from the API layer"
              />
              <StatusCard
                ok={connectionsPct < 80}
                label="Connections"
                value={`${db.activeConnections} / ${db.maxConnections}`}
                sub={`${connectionsPct}% of max`}
              />
              <StatusCard ok label="Database size" value={db.databaseSizePretty} sub="On disk" />
            </div>

            {db.bloatedTables.length > 0 && (
              <div className="mt-3.5 rounded-[var(--radius-lg)] border border-line-dark bg-paper p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Database size={14} strokeWidth={1.8} className="text-gold shrink-0" />
                  <span className="text-[0.82rem] font-semibold text-text">
                    Tables with dead-row bloat
                  </span>
                </div>
                <div className="space-y-1.5">
                  {db.bloatedTables.map((t) => (
                    <div key={t.table} className="flex items-center justify-between text-[0.8rem]">
                      <span className="font-mono text-text-muted">{t.table}</span>
                      <span className="text-text-muted">
                        {t.deadRows.toLocaleString()} dead rows ({t.deadRatioPct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-2 text-[0.85rem] font-semibold text-text">
              <ShieldCheck size={15} strokeWidth={1.8} className="text-green-dark" />
              Login activity · 14 days
            </span>
            <button
              type="button"
              onClick={() => onNavigate?.('security')}
              className="text-[0.74rem] font-semibold text-text-muted hover:text-ink"
            >
              Details →
            </button>
          </div>
          {isLoading || !loginTrends ? (
            <p className="text-[0.8rem] text-text-muted">Loading…</p>
          ) : (
            <TrendBars rows={loginTrends} colorKey="successCount" />
          )}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-2 text-[0.85rem] font-semibold text-text">
              <Search size={15} strokeWidth={1.8} className="text-green-dark" />
              Search volume · 14 days
            </span>
            <button
              type="button"
              onClick={() => onNavigate?.('search-analytics')}
              className="text-[0.74rem] font-semibold text-text-muted hover:text-ink"
            >
              Details →
            </button>
          </div>
          {isLoading || !searchStats ? (
            <p className="text-[0.8rem] text-text-muted">Loading…</p>
          ) : (
            <>
              <TrendBars rows={searchStats.trend} colorKey="count" color="bg-green-dark" />
              <p className="text-[0.74rem] text-text-muted mt-2">
                {zeroResultRate}% of searches found nothing — worth checking Search Analytics for
                what students are looking for that isn't listed.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Integrations + process — smaller, less urgent, but real: is
          everything Kwathu depends on actually configured, and is the
          server itself under any memory pressure. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5">
          <div className="flex items-center gap-2 mb-3">
            <Plug size={15} strokeWidth={1.8} className="text-green-dark" />
            <span className="text-[0.85rem] font-semibold text-text">Integrations</span>
          </div>
          <div className="space-y-2">
            {systemInfo?.integrations.map((i) => (
              <div key={i.name} className="flex items-center justify-between text-[0.8rem]">
                <span className="text-text-muted">{i.name}</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    i.configured ? 'text-green-dark' : 'text-clay'
                  }`}
                >
                  {i.configured ? <CheckCircle2 size={13} strokeWidth={2} /> : <AlertTriangle size={13} strokeWidth={2} />}
                  {i.configured ? 'Configured' : 'Not configured'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={15} strokeWidth={1.8} className="text-green-dark" />
            <span className="text-[0.85rem] font-semibold text-text">Server process</span>
          </div>
          {systemInfo?.process && (
            <div className="space-y-2 text-[0.8rem]">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Uptime</span>
                <span className="font-semibold text-text">
                  {Math.floor(systemInfo.process.uptimeSeconds / 3600)}h{' '}
                  {Math.floor((systemInfo.process.uptimeSeconds % 3600) / 60)}m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Memory (heap)</span>
                <span className="font-semibold text-text">
                  {systemInfo.process.heapUsedMb}MB / {systemInfo.process.heapTotalMb}MB
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Memory (RSS)</span>
                <span className="font-semibold text-text">{systemInfo.process.rssMb}MB</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.03em] text-text-muted mb-3">
          Recent activity
        </div>
        {recentActivity?.length ? (
          <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper divide-y divide-line-dark overflow-hidden">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Activity size={13} strokeWidth={1.8} className="text-green-dark shrink-0" />
                  <span className="text-[0.82rem] font-medium text-text truncate">
                    {ACTION_LABEL[log.action] || log.action}
                  </span>
                  <span className="text-[0.76rem] text-text-muted truncate">
                    by {log.actorName || 'System'}
                  </span>
                </div>
                <span className="text-[0.7rem] text-text-muted shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[0.85rem] text-text-muted">No recent activity.</p>
        )}
      </div>
    </div>
  );
}
