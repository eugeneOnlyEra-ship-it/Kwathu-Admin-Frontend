import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../utils/apiClient';

// verificationStatus: 'pending' | 'approved' | 'rejected' | 'all'
// accountStatus: 'active' (default — excludes suspended) | 'suspended'
export function useAdminUsers({
  role,
  verificationStatus = 'pending',
  accountStatus = 'active',
  search = '',
} = {}) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (role) params.set('role', role);
      if (verificationStatus !== 'all') params.set('verificationStatus', verificationStatus);
      if (accountStatus) params.set('accountStatus', accountStatus);
      if (search) params.set('search', search);
      const { data } = await apiJson(`/users?${params.toString()}`);
      setUsers(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [role, verificationStatus, accountStatus, search]);

  useEffect(() => {
    refresh().catch(() => {
      // error already on state
    });
  }, [refresh]);

  const runAction = useCallback(
    async (fn) => {
      setError(null);
      try {
        await fn();
        await refresh();
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [refresh],
  );

  const verify = useCallback(
    (id) => runAction(() => apiJson(`/users/${id}/verify`, { method: 'POST' })),
    [runAction],
  );
  const reject = useCallback(
    (id) => runAction(() => apiJson(`/users/${id}/reject`, { method: 'POST' })),
    [runAction],
  );
  // Soft delete — the account and its verificationStatus/role are preserved,
  // just hidden from normal listings until reactivated.
  const suspend = useCallback(
    (id) => runAction(() => apiJson(`/users/${id}`, { method: 'DELETE' })),
    [runAction],
  );
  const reactivate = useCallback(
    (id) => runAction(() => apiJson(`/users/${id}/reactivate`, { method: 'POST' })),
    [runAction],
  );
  const changeRole = useCallback(
    (id, role) =>
      runAction(() => apiJson(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) })),
    [runAction],
  );

  return {
    users,
    isLoading,
    error,
    refresh,
    verify,
    reject,
    suspend,
    reactivate,
    changeRole,
    clearError: () => setError(null),
  };
}

// status: 'pending' | 'approved' | 'rejected' | 'all'
export function useAdminProperties({ status = 'pending', search = '' } = {}) {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (status !== 'all') params.set('status', status);
      if (search) params.set('search', search);
      const { data } = await apiJson(`/properties/admin?${params.toString()}`);
      setProperties(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    refresh().catch(() => {
      // error already on state
    });
  }, [refresh]);

  const runAction = useCallback(
    async (fn) => {
      setError(null);
      try {
        await fn();
        await refresh();
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [refresh],
  );

  const approve = useCallback(
    (id) => runAction(() => apiJson(`/properties/${id}/approve`, { method: 'POST' })),
    [runAction],
  );
  const reject = useCallback(
    (id) => runAction(() => apiJson(`/properties/${id}/reject`, { method: 'POST' })),
    [runAction],
  );
  const activate = useCallback(
    (id) => runAction(() => apiJson(`/properties/${id}/activate`, { method: 'POST' })),
    [runAction],
  );
  const deactivate = useCallback(
    (id) => runAction(() => apiJson(`/properties/${id}/deactivate`, { method: 'POST' })),
    [runAction],
  );
  // Admin override — bypasses the owner-only check on the backend since
  // admins are explicitly allowed through the same endpoint landlords use.
  const remove = useCallback(
    (id) => runAction(() => apiJson(`/properties/${id}`, { method: 'DELETE' })),
    [runAction],
  );

  return {
    properties,
    isLoading,
    error,
    refresh,
    approve,
    reject,
    activate,
    deactivate,
    remove,
    clearError: () => setError(null),
  };
}

export function useAdminStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiJson('/users/stats/overview'), apiJson('/properties/admin/stats')])
      .then(([userStats, propertyStats]) => {
        if (!cancelled) setStats({ users: userStats, properties: propertyStats });
      })
      .catch(() => {
        // stats are supplementary — fail silently
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}

// status: a BookingStatus value, or omitted for every status
export function useAdminBookings({ status, limit = 200 } = {}) {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (status) params.set('status', status);
      const { data, total: count } = await apiJson(`/bookings/admin?${params.toString()}`);
      setBookings(data);
      setTotal(count);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [status, limit]);

  useEffect(() => {
    refresh().catch(() => {
      // error already on state
    });
  }, [refresh]);

  return { bookings, total, isLoading, error, refresh };
}

// Ties together the stats endpoints that already exist into one "is the
// platform basically working" snapshot — real counts, a timed round-trip
// against a lightweight admin endpoint, and now the two real time-series
// signals the platform actually has (login activity, search volume) so
// this reads as trends over time rather than only a point-in-time
// snapshot. There's still no general request/error telemetry across
// every endpoint — these two logs are purpose-built for auth and search
// specifically, not a blanket API monitor.
export function useSystemHealth() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const [
        userStats,
        propertyStats,
        recentActivity,
        loginTrends,
        searchStats,
        pendingLandlords,
        systemInfo,
      ] = await Promise.all([
        apiJson('/users/stats/overview'),
        apiJson('/properties/admin/stats'),
        apiJson('/audit-logs?limit=8'),
        apiJson('/login-events/trends?days=14'),
        apiJson('/search-logs/stats?days=14'),
        apiJson('/users?role=landlord&verificationStatus=pending&limit=1'),
        apiJson('/system-info'),
      ]);
      const latencyMs = Math.round(performance.now() - start);
      setData({
        userStats,
        propertyStats,
        recentActivity: recentActivity.data,
        loginTrends,
        searchStats,
        pendingLandlordsCount: pendingLandlords.total,
        systemInfo,
        latencyMs,
        checkedAt: new Date(),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      // error already on state
    });
  }, [refresh]);

  return { ...data, isLoading, error, refresh };
}

// ---------------------------------------------------------------------
// Security Center
// ---------------------------------------------------------------------

export function useLoginEvents({ days = 14 } = {}) {
  const [trends, setTrends] = useState([]);
  const [failures, setFailures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [trendsData, failuresData] = await Promise.all([
        apiJson(`/login-events/trends?days=${days}`),
        apiJson('/login-events/failures?limit=20'),
      ]);
      setTrends(trendsData);
      setFailures(failuresData);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refresh().catch(() => {
      // error already on state
    });
  }, [refresh]);

  return { trends, failures, isLoading, error, refresh };
}

export function useBulkEmail() {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const send = useCallback(async (payload) => {
    setIsSending(true);
    setError(null);
    try {
      return await apiJson('/users/bulk-email', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, []);

  return { send, isSending, error, clearError: () => setError(null) };
}

// ---------------------------------------------------------------------
// Search Analytics
// ---------------------------------------------------------------------

export function useSearchAnalytics({ days = 14 } = {}) {
  const [stats, setStats] = useState(null);
  const [topQueries, setTopQueries] = useState([]);
  const [zeroResults, setZeroResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, topData, zeroData] = await Promise.all([
        apiJson(`/search-logs/stats?days=${days}`),
        apiJson('/search-logs/top-queries?limit=10'),
        apiJson('/search-logs/zero-results?limit=10'),
      ]);
      setStats(statsData);
      setTopQueries(topData);
      setZeroResults(zeroData);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refresh().catch(() => {
      // error already on state
    });
  }, [refresh]);

  return { stats, topQueries, zeroResults, isLoading, error, refresh };
}

