import { useCallback, useEffect, useState } from 'react';
import { apiJson, apiRequest } from '../utils/apiClient';

/**
 * The admin audit trail of receipts: every receipt on the platform, with
 * server-side filtering/paging and an integrity result on each row.
 */
export function useAdminReceipts(filters) {
  const [data, setData] = useState({ data: [], total: 0, totals: { count: 0, amount: 0 } });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { search, verifiedBy, from, to, page, limit } = filters;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (verifiedBy) params.set('verifiedBy', verifiedBy);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      setData(await apiJson(`/receipts/admin?${params}`));
    } catch (err) {
      setError(err.message || 'Could not load receipts');
    } finally {
      setIsLoading(false);
    }
  }, [search, verifiedBy, from, to, page, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, isLoading, error, refresh };
}

/** Re-checks every receipt in the system against its issue-time fingerprint. */
export function useVerifyAllReceipts() {
  const [result, setResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  const verify = useCallback(async () => {
    setIsVerifying(true);
    setError(null);
    try {
      setResult(await apiJson('/receipts/admin/verify'));
    } catch (err) {
      setError(err.message || 'Could not run the check');
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return { result, isVerifying, error, verify };
}

/**
 * Downloads the receipt PDF — the very same file the customer and lister
 * get. Needs the login token, so it's fetched with auth and handed to the
 * browser as a file rather than linked.
 */
export async function downloadReceiptPdf(receipt) {
  const res = await apiRequest(`/receipts/${receipt.id}/pdf`);
  if (!res.ok) throw new Error('Could not download the receipt');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Kwathu-Receipt-${receipt.receiptNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
