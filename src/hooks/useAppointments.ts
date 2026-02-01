import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './useAuth';

export const useAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Ref pour éviter les re-subscriptions multiples
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  // ✅ Load appointments avec useCallback pour stabiliser la référence
  const loadAppointments = useCallback(async () => {
    try {
      console.log('useAppointments: Loading appointments...');
      setError(null);

      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('useAppointments: Auth error:', authError);
        setError('Non authentifié');
        setAppointments([]);
        setLoading(false);
        return;
      }

      if (!user) {
        console.log('useAppointments: No user, clearing appointments');
        setAppointments([]);
        setLoading(false);
        return;
      }

      console.log('useAppointments: Loading for user:', user.id);

      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(
          `
          *,
          clients!inner(name),
          services(name)
        `
        )
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (fetchError) {
        console.error('useAppointments: Error loading:', fetchError);
        throw fetchError;
      }

      console.log('useAppointments: Loaded', data?.length || 0, 'appointments');

      const formattedAppointments: Appointment[] = (data || []).map(
        (appointment) => ({
          id: appointment.id,
          clientId: appointment.client_id,
          clientName: appointment.clients.name,
          service: appointment.services?.name || 'Service supprimé',
          notes: appointment.notes || '',
          date: appointment.date,
          time: appointment.time,
          duration: appointment.duration,
          status: appointment.status,
          price: appointment.price ? parseFloat(appointment.price) : undefined,
        })
      );

      setAppointments(formattedAppointments);
      setError(null);
    } catch (err) {
      console.error('useAppointments: Fatal error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement des rendez-vous'
      );
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a new appointment
  const addAppointment = async (
    appointmentData: Omit<Appointment, 'id'>
  ): Promise<boolean> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('useAppointments: Not authenticated');
        setError('Non authentifié');
        return false;
      }

      console.log('useAppointments: Adding appointment:', appointmentData);

      // Get service ID by name
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id')
        .eq('name', appointmentData.service)
        .maybeSingle();

      if (serviceError) {
        console.error('useAppointments: Error finding service:', serviceError);
      }

      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert([
          {
            user_id: user.id,
            client_id: appointmentData.clientId,
            service_id: serviceData?.id,
            date: appointmentData.date,
            time: appointmentData.time,
            duration: appointmentData.duration,
            status: appointmentData.status,
            notes: appointmentData.notes,
            price: appointmentData.price,
          },
        ])
        .select(
          `
          *,
          clients!inner(name),
          services(name)
        `
        )
        .single();

      if (insertError) {
        console.error(
          'useAppointments: Error adding appointment:',
          insertError
        );
        throw insertError;
      }

      console.log('useAppointments: Appointment added successfully:', data.id);

      // Log activity (sans bloquer - fire and forget)
      supabase
        .from('activity_logs')
        .insert([
          {
            user_id: user.id,
            action_type: 'appointment_added',
            entity_type: 'appointment',
            entity_id: data.id,
            entity_name: appointmentData.service,
            description: `Rendez-vous "${appointmentData.service}" avec ${data.clients.name} ajouté`,
          },
        ])
        .then(() => console.log('Activity logged'))
        .catch((err: Error) => console.error('Failed to log activity:', err));

      // ⚠️ Realtime va recharger automatiquement, pas besoin de reload manuel
      setError(null);
      return true;
    } catch (err) {
      console.error('useAppointments: Error in addAppointment:', err);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'ajout du rendez-vous"
      );
      return false;
    }
  };

  // Update an appointment
  const updateAppointment = async (
    id: string,
    appointmentData: Partial<Appointment>
  ): Promise<boolean> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('useAppointments: Not authenticated');
        setError('Non authentifié');
        return false;
      }

      console.log('useAppointments: Updating appointment:', id);

      const updateData: any = {};

      if (appointmentData.clientId !== undefined)
        updateData.client_id = appointmentData.clientId;
      if (appointmentData.date !== undefined)
        updateData.date = appointmentData.date;
      if (appointmentData.time !== undefined)
        updateData.time = appointmentData.time;
      if (appointmentData.duration !== undefined)
        updateData.duration = appointmentData.duration;
      if (appointmentData.status !== undefined)
        updateData.status = appointmentData.status;
      if (appointmentData.notes !== undefined)
        updateData.notes = appointmentData.notes;
      if (appointmentData.price !== undefined)
        updateData.price = appointmentData.price;

      // Handle service update
      if (appointmentData.service !== undefined) {
        const { data: serviceData } = await supabase
          .from('services')
          .select('id')
          .eq('name', appointmentData.service)
          .maybeSingle();
        updateData.service_id = serviceData?.id;
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('useAppointments: Error updating:', updateError);
        throw updateError;
      }

      console.log('useAppointments: Appointment updated successfully');

      // Log activity (fire and forget)
      supabase
        .from('activity_logs')
        .insert([
          {
            user_id: user.id,
            action_type:
              appointmentData.status === 'completed'
                ? 'appointment_completed'
                : 'appointment_updated',
            entity_type: 'appointment',
            entity_id: id,
            entity_name: appointmentData.service || 'Rendez-vous',
            description:
              appointmentData.status === 'completed'
                ? `Rendez-vous "${
                    appointmentData.service || 'Rendez-vous'
                  }" marqué comme terminé`
                : `Rendez-vous "${
                    appointmentData.service || 'Rendez-vous'
                  }" modifié`,
          },
        ])
        .then(() => console.log('Activity logged'))
        .catch((err: Error) => console.error('Failed to log activity:', err));

      // ⚠️ Realtime va recharger automatiquement
      setError(null);
      return true;
    } catch (err) {
      console.error('useAppointments: Error in updateAppointment:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la modification du rendez-vous'
      );
      return false;
    }
  };

  // Delete an appointment
  const deleteAppointment = async (id: string): Promise<boolean> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('useAppointments: Not authenticated');
        setError('Non authentifié');
        return false;
      }

      const appointmentToDelete = appointments.find((a) => a.id === id);

      console.log('useAppointments: Deleting appointment:', id);

      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('useAppointments: Error deleting:', deleteError);
        throw deleteError;
      }

      console.log('useAppointments: Appointment deleted successfully');

      // 🆕 MISE À JOUR OPTIMISTE - Retire l'appointment de l'état local
      setAppointments((prev) => prev.filter((apt) => apt.id !== id));

      // Log activity (fire and forget)
      if (appointmentToDelete) {
        supabase
          .from('activity_logs')
          .insert([
            {
              user_id: user.id,
              action_type: 'appointment_deleted',
              entity_type: 'appointment',
              entity_id: id,
              entity_name: appointmentToDelete.service,
              description: `Rendez-vous "${appointmentToDelete.service}" avec ${appointmentToDelete.clientName} supprimé`,
            },
          ])
          .then(() => console.log('Activity logged'))
          .catch((err: Error) => console.error('Failed to log activity:', err));
      }

      // Realtime va aussi recharger automatiquement en arrière-plan
      setError(null);
      return true;
    } catch (err) {
      console.error('useAppointments: Error in deleteAppointment:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la suppression du rendez-vous'
      );
      return false;
    }
  };

  // ✅ useEffect avec cleanup PROPRE
  useEffect(() => {
    if (!user) {
      console.log('useAppointments: No user, skipping...');
      return;
    }
    console.log('useAppointments: Effect running...');

    // Éviter les doubles subscriptions (React StrictMode)
    if (isSubscribedRef.current) {
      console.log('useAppointments: Already subscribed, skipping');
      return;
    }

    let mounted = true;

    const setupSubscriptions = async () => {
      // Chargement initial
      if (mounted) {
        await loadAppointments();
      }

      // Vérifier l'auth
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        console.log(
          'useAppointments: No user or unmounted, skipping subscription'
        );
        return;
      }

      // ✅ Configuration Realtime avec filter pour éviter les doublons
      console.log('useAppointments: Setting up Realtime subscription');

      channelRef.current = supabase
        .channel(`appointments-${user.id}`) // ⚠️ Channel unique par user
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `user_id=eq.${user.id}`, // ⚠️ Filtrer par user_id
          },
          (payload) => {
            console.log('useAppointments: Realtime event:', payload.eventType);
            if (mounted) {
              loadAppointments();
            }
          }
        )
        .subscribe((status) => {
          console.log('useAppointments: Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true;
          }
        });
    };

    setupSubscriptions();

    // ✅ CLEANUP CRUCIAL
    return () => {
      console.log('useAppointments: Cleaning up...');
      mounted = false;
      isSubscribedRef.current = false;

      if (channelRef.current) {
        console.log('useAppointments: Unsubscribing channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, loadAppointments]); // ⚠️ Dépendances nécessaires

  // ✅ SEUL RETURN À LA FIN DU HOOK
  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    refreshAppointments: loadAppointments,
  };
};
