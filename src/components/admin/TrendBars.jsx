// Same lightweight bar pattern used across the admin dashboard's charts —
// no charting library dependency, just divs with a computed height. Kept
// as one shared component so every real time-series in the admin area
// (login trends, search volume, and now system health) looks and behaves
// the same way rather than each screen reinventing it slightly differently.
function shortDate(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${m}/${d}`;
}

export default function TrendBars({ rows, colorKey, labelKey = 'date', color }) {
  const max = Math.max(1, ...rows.map((r) => r[colorKey]));
  const barColor = color || (colorKey === 'failureCount' ? 'bg-clay' : 'bg-green-dark');
  return (
    <div className="flex items-end gap-1 h-24">
      {rows.map((r) => {
        const value = r[colorKey];
        const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 2) : 2;
        return (
          <div key={r[labelKey]} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end h-20">
              <div
                className={`w-full rounded-t-sm ${barColor}`}
                style={{ height: `${pct}%` }}
                title={`${shortDate(r[labelKey])}: ${value}`}
              />
            </div>
            <span className="text-[0.55rem] text-text-muted">{shortDate(r[labelKey])}</span>
          </div>
        );
      })}
    </div>
  );
}
