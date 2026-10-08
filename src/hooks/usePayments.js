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

  const markDisbursed = useCallback(
    async (paymentId) => {
      setError(null);
      try {
        await apiJson(`/payments/${paymentId}/disburse`, { method: 'PATCH' });
        await refresh();
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [refresh],
  );

  return {
    payments,
    total,
    isLoading,
    error,
    refresh,
    markDisbursed,
    clearError: () => setError(null),
  };
}

// Every property's payout destination — set once per property, shared by
// all its rooms (see PropertyPayoutDetails on the backend). Admin-only,
// used to spot properties that still need a destination configured.
export function useAdminPayoutDetails() {
  const [details, setDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiJson('/payments/payout-details');
      setDetails(data);
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

  const save = useCallback(
    async (propertyId, payload) => {
      setIsSaving(true);
      setError(null);
      try {
        const saved = await apiJson(`/payments/payout-details/${propertyId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        await refresh();
        return saved;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [refresh],
  );

  return { details, isLoading, isSaving, error, refresh, save, clearError: () => setError(null) };
}
