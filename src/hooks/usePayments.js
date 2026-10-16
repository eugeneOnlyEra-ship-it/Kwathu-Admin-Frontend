import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../utils/apiClient';

// Platform-wide payment transparency — every deposit collected, whatever
// property or landlord it belongs to. status: a PaymentStatus value, or
// omitted for every status.
export function useAdminPayments({ status, propertyId, limit = 50 } = {}) {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (status) params.set('status', status);
      if (propertyId) params.set('propertyId', propertyId);
      const { data, total: count } = await apiJson(`/payments/admin?${params.toString()}`);
      setPayments(data);
      setTotal(count);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [status, propertyId, limit]);

  useEffect(() => {
    refresh().catch(() => {
      // error already on state
    });
  }, [refresh]);

  return {
    payments,
    total,
    isLoading,
    error,
    refresh,
    clearError: () => setError(null),
  };
}

// Which listers have connected their own PayChangu account. Read-only —
// only a lister can connect or disconnect (see PaymentsController).
export function useAdminConnections() {
  const [connections, setConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiJson('/payments/connections');
      setConnections(data);
      return data;
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

  return { connections, isLoading, error, refresh };
}
