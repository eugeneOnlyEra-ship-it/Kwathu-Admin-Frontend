import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../utils/apiClient';

const POLL_INTERVAL_MS = 20_000;

// Public, unauthenticated, and itself exempt from maintenance mode on the
// backend — this is how a logged-out visitor (and the app shell itself)
// finds out the whole site is down. Polls rather than using the
// notifications SSE stream, since that connection is itself blocked during
// maintenance for non-admins.
export function useMaintenanceStatus() {
  const [status, setStatus] = useState(null);

  const refresh = useCallback(() => {
    apiJson('/system/maintenance')
      .then(setStatus)
      .catch(() => {
        // If even the status check fails (network down, backend
        // unreachable), don't lock the whole app behind a maintenance
        // screen over a transient error — leave status as-is.
      });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return status; // null while loading, then { isEnabled, message }
}

export function useAdminSystem() {
  const [health, setHealth] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [hours, setHours] = useState(24);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [healthResult, maintenanceResult, metricsResult] = await Promise.all([
        apiJson('/system/health'),
        apiJson('/system/maintenance'),
        apiJson(`/system/metrics?hours=${hours}`),
      ]);
      setHealth(healthResult);
      setMaintenance(maintenanceResult);
      setMetrics(metricsResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    refresh();
    // Auto-refresh so the chart and alerts reflect what's happening now,
    // not just what was true when the admin opened the tab.
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const setMaintenanceMode = useCallback(async (isEnabled, message) => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await apiJson('/system/maintenance', {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled, message }),
      });
      setMaintenance(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    health,
    maintenance,
    metrics,
    hours,
    setHours,
    isLoading,
    isSaving,
    error,
    clearError: () => setError(null),
    refresh,
    setMaintenanceMode,
  };
}
