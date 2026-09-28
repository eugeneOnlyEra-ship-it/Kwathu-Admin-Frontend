import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../utils/apiClient';

export function useAuditLog({ actorId, action, targetType, targetId } = {}) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (actorId) params.set('actorId', actorId);
      if (action) params.set('action', action);
      if (targetType) params.set('targetType', targetType);
      if (targetId) params.set('targetId', targetId);
      const { data, total: count } = await apiJson(`/audit-logs?${params.toString()}`);
      setLogs(data);
      setTotal(count);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [actorId, action, targetType, targetId]);

  useEffect(() => {
    refresh().catch(() => {
      // error already on state
    });
  }, [refresh]);

  return { logs, total, isLoading, error, refresh };
}
