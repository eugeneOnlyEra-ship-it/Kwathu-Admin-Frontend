import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../utils/apiClient';

/** What a landlord or student sees — active notices matching their role. */
export function useMyAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiJson('/announcements?limit=20');
      setAnnouncements(data);
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

  return { announcements, isLoading, error, refresh };
}

/** Admin composer — every announcement regardless of active/expired state. */
export function useAdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiJson('/announcements/admin?limit=50');
      setAnnouncements(data);
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

  const createAnnouncement = useCallback(async (payload) => {
    setError(null);
    setIsSaving(true);
    try {
      const created = await apiJson('/announcements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAnnouncements((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const setActive = useCallback(async (id, isActive) => {
    setError(null);
    try {
      const updated = await apiJson(`/announcements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? updated : a)));
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeAnnouncement = useCallback(async (id) => {
    setError(null);
    try {
      await apiJson(`/announcements/${id}`, { method: 'DELETE' });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    announcements,
    isLoading,
    isSaving,
    error,
    refresh,
    createAnnouncement,
    setActive,
    removeAnnouncement,
    clearError: () => setError(null),
  };
}
