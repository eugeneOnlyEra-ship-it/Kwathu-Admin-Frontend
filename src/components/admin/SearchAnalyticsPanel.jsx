import { Search, TrendingUp, FileWarning } from 'lucide-react';
import { useSearchAnalytics } from '../../hooks/useAdmin';

function shortDate(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${m}/${d}`;
}

function TrendBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="flex items-end gap-1 h-24">
      {rows.map((r) => {
        const pct = max > 0 ? Math.max((r.count / max) * 100, r.count > 0 ? 6 : 2) : 2;
        return (
          <div key={r.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end h-20">
              <div
                className="w-full rounded-t-sm bg-sky"
                style={{ height: `${pct}%` }}
                title={`${shortDate(r.date)}: ${r.count}`}
              />
            </div>
            <span className="text-[0.55rem] text-text-muted">{shortDate(r.date)}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-4">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-text-muted">
        {label}
      </p>
      <p className="text-[1.3rem] font-display font-semibold text-text mt-1">{value}</p>
      {sub && <p className="text-[0.76rem] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function QueryList({ rows, emptyText, showAvg }) {
  if (rows.length === 0) {
    return <p className="text-[0.82rem] text-text-muted">{emptyText}</p>;
  }
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div
          key={r.query}
          className="flex items-center justify-between rounded-[var(--radius-md)] border border-line-dark px-4 py-2.5 text-[0.82rem]"
        >
          <span className="text-text font-medium">"{r.query}"</span>
          <span className="text-text-muted">
            {r.count} search{r.count === 1 ? '' : 'es'}
            {showAvg && ` · avg ${r.avgResults} result${r.avgResults === 1 ? '' : 's'}`}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SearchAnalyticsPanel() {
  const { stats, topQueries, zeroResults, isLoading, error } = useSearchAnalytics({ days: 14 });

  if (isLoading && !stats) {
    return <p className="text-[0.9rem] text-text-muted">Loading search analytics…</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-[0.82rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total searches" value={stats.totalSearches} />
          <StatCard label="Zero-result searches" value={stats.zeroResultSearches} />
          <StatCard
            label="Zero-result rate"
            value={
              stats.totalSearches > 0
                ? `${Math.round((stats.zeroResultSearches / stats.totalSearches) * 100)}%`
                : '—'
            }
          />
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} strokeWidth={1.8} className="text-text-muted" />
          <span className="text-[0.85rem] font-semibold text-text">
            Search volume · last 14 days
          </span>
        </div>
        {stats && <TrendBars rows={stats.trend} />}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Search size={15} strokeWidth={1.8} className="text-text-muted" />
          <span className="text-[0.85rem] font-semibold text-text">Top search queries</span>
        </div>
        <QueryList rows={topQueries} emptyText="No searches logged yet." showAvg />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileWarning size={15} strokeWidth={1.8} className="text-clay" />
          <span className="text-[0.85rem] font-semibold text-text">
            Searches with no results
          </span>
          <span className="text-[0.72rem] text-text-muted">— unmet demand worth a look</span>
        </div>
        <QueryList rows={zeroResults} emptyText="Every search has returned something." />
      </div>
    </div>
  );
}
