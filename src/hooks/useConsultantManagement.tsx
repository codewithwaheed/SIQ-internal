import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConsultantProfile {
  id: string;
  user_id: string;
  bio: string;
  expertise_areas: string[];
  certifications: string[];
  years_experience: number;
  hourly_rate?: number;
  availability_status: 'online' | 'offline' | 'busy' | 'away';
  timezone: string;
  rating: number;
  total_escalations_handled: number;
  avg_response_time_hours: number;
  success_rate: number;
  client_feedback_score: number;
  last_active_at: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  profiles?: {
    email: string;
    first_name: string;
    last_name: string;
    company_name?: string;
  };
}

interface UseConsultantManagementReturn {
  consultants: ConsultantProfile[];
  loading: boolean;
  error: string | null;
  fetchConsultants: (filters?: {
    search?: string;
    status?: string;
    expertise?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  updateConsultantAvailability: (consultantId: string, status: string) => Promise<boolean>;
  getAvailableConsultants: (expertiseFilter?: string[]) => Promise<ConsultantProfile[]>;
  createConsultant: (
    data: Partial<ConsultantProfile> & {
      user_id?: string;
      application_id?: string;
    },
  ) => Promise<boolean>;
  updateConsultantProfile: (
    consultantId: string,
    data: Partial<ConsultantProfile>,
  ) => Promise<boolean>;
  deactivateConsultant: (consultantId: string) => Promise<boolean>;
}

export const useConsultantManagement = (): UseConsultantManagementReturn => {
  const [consultants, setConsultants] = useState<ConsultantProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleApiError = useCallback(
    (error: any, defaultMessage: string) => {
      console.error('API Error:', error);
      const message = error.message || defaultMessage;
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
    [toast],
  );

  const fetchConsultants = useCallback(
    async (filters = {}) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          action: 'list',
          ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, String(v)])),
        });

        const { data, error } = await supabase.functions.invoke('manage-consultants', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: params.toString(),
        });

        if (error) throw error;

        setConsultants(data.consultants || []);
      } catch (err: any) {
        handleApiError(err, 'Failed to fetch consultants');
      } finally {
        setLoading(false);
      }
    },
    [handleApiError],
  );

  const updateConsultantAvailability = useCallback(
    async (consultantId: string, status: string): Promise<boolean> => {
      try {
        const { error } = await supabase.functions.invoke('manage-consultants', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'availability',
            id: consultantId,
            status,
          }),
        });

        if (error) throw error;

        // Update local state
        setConsultants((prev) =>
          prev.map((consultant) =>
            consultant.id === consultantId
              ? { ...consultant, availability_status: status as any }
              : consultant,
          ),
        );

        toast({
          title: 'Success',
          description: 'Availability updated successfully',
        });

        return true;
      } catch (err: any) {
        handleApiError(err, 'Failed to update availability');
        return false;
      }
    },
    [handleApiError, toast],
  );

  const getAvailableConsultants = useCallback(
    async (expertiseFilter?: string[]): Promise<ConsultantProfile[]> => {
      try {
        const params = new URLSearchParams({
          action: 'available',
          ...(expertiseFilter && { expertise: expertiseFilter.join(',') }),
          limit: '10',
        });

        const { data, error } = await supabase.functions.invoke('manage-consultants', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: params.toString(),
        });

        if (error) throw error;

        return data.consultants || [];
      } catch (err: any) {
        handleApiError(err, 'Failed to get available consultants');
        return [];
      }
    },
    [handleApiError],
  );

  const createConsultant = useCallback(
    async (
      data: Partial<ConsultantProfile> & {
        user_id?: string;
        application_id?: string;
      },
    ): Promise<boolean> => {
      try {
        const { error } = await supabase.functions.invoke('manage-consultants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Consultant profile created successfully',
        });

        // Refresh consultants list
        await fetchConsultants();

        return true;
      } catch (err: any) {
        handleApiError(err, 'Failed to create consultant profile');
        return false;
      }
    },
    [handleApiError, toast, fetchConsultants],
  );

  const updateConsultantProfile = useCallback(
    async (consultantId: string, data: Partial<ConsultantProfile>): Promise<boolean> => {
      try {
        const { error } = await supabase.functions.invoke('manage-consultants', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'profile',
            id: consultantId,
            ...data,
          }),
        });

        if (error) throw error;

        // Update local state
        setConsultants((prev) =>
          prev.map((consultant) =>
            consultant.id === consultantId ? { ...consultant, ...data } : consultant,
          ),
        );

        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });

        return true;
      } catch (err: any) {
        handleApiError(err, 'Failed to update consultant profile');
        return false;
      }
    },
    [handleApiError, toast],
  );

  const deactivateConsultant = useCallback(
    async (consultantId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.functions.invoke('manage-consultants', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: consultantId }),
        });

        if (error) throw error;

        // Update local state
        setConsultants((prev) =>
          prev.map((consultant) =>
            consultant.id === consultantId
              ? {
                  ...consultant,
                  is_active: false,
                  availability_status: 'offline' as any,
                }
              : consultant,
          ),
        );

        toast({
          title: 'Success',
          description: 'Consultant deactivated successfully',
        });

        return true;
      } catch (err: any) {
        handleApiError(err, 'Failed to deactivate consultant');
        return false;
      }
    },
    [handleApiError, toast],
  );

  return {
    consultants,
    loading,
    error,
    fetchConsultants,
    updateConsultantAvailability,
    getAvailableConsultants,
    createConsultant,
    updateConsultantProfile,
    deactivateConsultant,
  };
};
