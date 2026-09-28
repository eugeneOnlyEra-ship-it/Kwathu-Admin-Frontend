import { useState } from 'react';
import { Download, Users, Building2, ScrollText, Megaphone, Archive, AlertCircle } from 'lucide-react';
import { useAdminUsers, useAdminProperties, useAdminBookings, useAdminStats } from '../../hooks/useAdmin';
import { useAdminAnnouncements } from '../../hooks/useAnnouncements';
import { useAuditLog } from '../../hooks/useAuditLog';

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function timestamp() {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
}

export default function DataExportPanel() {
  const stats = useAdminStats();
  // Two calls, merged — there's no single filter value that returns both
  // active and suspended users together (accountStatus is either the
  // active default or 'suspended'), and a "full export" that silently
  // dropped every suspended account would be a real correctness bug.
  const { users: activeUsers } = useAdminUsers({ verificationStatus: 'all', accountStatus: 'active' });
  const { users: suspendedUsers } = useAdminUsers({ verificationStatus: 'all', accountStatus: 'suspended' });
  const users = [...activeUsers, ...suspendedUsers];
  const { properties } = useAdminProperties({ status: 'all' });
  const { bookings } = useAdminBookings({ limit: 500 });
  const { announcements } = useAdminAnnouncements();
  const { logs: auditLogs } = useAuditLog();
  const [downloadLog, setDownloadLog] = useState([]);

  function logDownload(label, filename, count) {
    setDownloadLog((prev) => [{ label, filename, count, at: new Date() }, ...prev].slice(0, 8));
  }

  const items = [
    {
      key: 'listings',
      label: 'Listings',
      icon: Building2,
      count: properties.length,
      data: properties,
    },
    { key: 'users', label: 'Users', icon: Users, count: users.length, data: users },
    { key: 'bookings', label: 'Bookings', icon: Archive, count: bookings.length, data: bookings },
    {
      key: 'audit-log',
      label: 'Audit log',
      icon: ScrollText,
      count: auditLogs.length,
      data: auditLogs,
    },
    {
      key: 'announcements',
      label: 'Announcements',
      icon: Megaphone,
      count: announcements.length,
      data: announcements,
    },
  ];

  function handleExport(item) {
    const filename = `kwathu-${item.key}-${timestamp()}.json`;
    downloadJson(item.data, filename);
    logDownload(item.label, filename, item.count);
  }

  function handleExportAll() {
    const filename = `kwathu-full-export-${timestamp()}.json`;
    const payload = {
      exportedAt: new Date().toISOString(),
      listings: properties,
      users,
      bookings,
      auditLog: auditLogs,
      announcements,
    };
    downloadJson(payload, filename);
    logDownload('Everything', filename, items.reduce((sum, i) => sum + i.count, 0));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-[0.85rem] text-text-muted">
          Download a snapshot of the platform's current data — a real export you can save
          somewhere safe, not an automated backup.
        </p>
        <button
          type="button"
          onClick={handleExportAll}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.85rem] font-semibold text-text-inverse hover:bg-green-dark transition-colors shrink-0"
        >
          <Download size={15} strokeWidth={2} />
          Export everything
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line-dark bg-paper px-4 py-3.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-green/12 text-green-dark">
                <item.icon size={16} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <div className="text-[0.86rem] font-semibold text-text">{item.label}</div>
                <div className="text-[0.76rem] text-text-muted">{item.count.toLocaleString()} records</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleExport(item)}
              aria-label={`Export ${item.label}`}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-line-dark text-text-muted hover:bg-paper-2 hover:text-ink transition-colors"
            >
              <Download size={14} strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>

      {downloadLog.length > 0 && (
        <div className="mt-8">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.03em] text-text-muted mb-3">
            Downloads this session
          </div>
          <div className="rounded-[var(--radius-lg)] border border-line-dark bg-paper divide-y divide-line-dark overflow-hidden">
            {downloadLog.map((d, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-[0.8rem]">
                <span className="font-mono text-text-muted truncate">{d.filename}</span>
                <span className="text-text-muted shrink-0 ml-3">{d.at.toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-gold/25 bg-gold/8 px-4 py-3.5">
        <AlertCircle size={17} strokeWidth={1.8} className="text-gold shrink-0 mt-0.5" />
        <div>
          <p className="text-[0.84rem] font-semibold text-text">About automated backups</p>
          <p className="text-[0.8rem] text-text-muted mt-1 leading-snug">
            Kwathu doesn't run scheduled backups yet — this page only exports whatever is here
            right now, on demand. Download a snapshot regularly, or set up managed automatic
            backups with your database host.
          </p>
        </div>
      </div>

      {stats && (
        <p className="mt-4 text-[0.74rem] text-text-muted">
          Platform totals: {stats.properties.total} listings · {stats.users.total} users
        </p>
      )}
    </div>
  );
}
