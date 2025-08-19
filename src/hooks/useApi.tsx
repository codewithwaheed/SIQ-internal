import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseApiOptions {
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  body?: any;
  method?: string;
}

export function useApi<T = any>(endpoint: string, options: UseApiOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!endpoint) return;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await supabase.functions.invoke(endpoint, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: options.body || null,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setData(response.data);
      options.onSuccess?.(response.data);
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);

      if (error.message !== 'No authentication token') {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.enabled !== false) {
      fetchData();
    }
  }, [endpoint, options.enabled, JSON.stringify(options.body)]);

  const refetch = () => fetchData();

  return { data, loading, error, refetch };
}

export async function apiCall(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
  } = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authentication token');
  }

  const response = await supabase.functions.invoke(endpoint, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: options.body,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}
