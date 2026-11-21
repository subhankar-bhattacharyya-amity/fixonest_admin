import { useCallback, useEffect, useState } from 'react';
import { getJson } from '@/lib/httpClient.js';

/**
 * Hook to retrieve provider analytical report dataset from the backend API
 * @param {string} period - Reporting period key ('7d' | '30d' | 'month' | 'lastMonth' | '90d')
 * @returns {{ report: object|null, loading: boolean, error: string|null, refetch: () => void }}
 */
export function useProviderReport(period = '30d') {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getJson(`/provider/api/v1/reports?period=${encodeURIComponent(period)}`);
      setReport(response.data || response);
    } catch (err) {
      console.error('Failed to load provider report:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, loading, error, refetch: fetchReport };
}
