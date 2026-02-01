import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './useAuth';

export const useClients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Protection contre les re-subscriptions
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  // ✅ Load clients avec useCallback pour référence stable
  const loadClients = useCallback(async () => {
    try {
      setError(null);

      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('useClients: Auth error:', authError);
        setError('Non authentifié');
        setClients([]);
        setLoading(false);
        return;
      }

      if (!user) {
        setClients([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('useClients: Error loading:', fetchError);
        throw fetchError;
      }

      console.log('useClients: Loaded', data?.length || 0, 'clients');

      const formattedClients: Client[] = (data || []).map((client) => ({
        id: client.id,
        name: client.name,
        phone: client.phone,
        address: client.address,
        contactPersonName: client.contact_person_name,
        contactPersonPhone: client.contact_person_phone,
        frequency: client.frequency,
        customFrequencyDays: client.custom_frequency_days,
        notes: client.notes || '',
        createdAt: client.created_at,
      }));

      setClients(formattedClients);
      setError(null);
    } catch (err) {
      console.error('useClients: Fatal error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement des clients'
      );
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []); // ⚠️ Pas de dépendances

  // Add a new client
  const addClient = async (
    clientData: Omit<Client, 'id' | 'createdAt'>
  ): Promise<boolean> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('useClients: Not authenticated');
        setError('Non authentifié');
        return false;
      }

      console.log('useClients: Adding client:', clientData.name);

      const { data, error: insertError } = await supabase
        .from('clients')
        .insert([
          {
            user_id: user.id,
            name: clientData.name,
            phone: clientData.phone,
            address: clientData.address,
            contact_person_name: clientData.contactPersonName,
            contact_person_phone: clientData.contactPersonPhone,
            frequency: clientData.frequency,
            custom_frequency_days: clientData.customFrequencyDays,
            notes: clientData.notes,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('useClients: Error adding:', insertError);
        throw insertError;
      }

      console.log('useClients: Client added successfully:', data.id);

      // Log activity (fire and forget)
      supabase
        .from('activity_logs')
        .insert([
          {
            user_id: user.id,
            action_type: 'client_added',
            entity_type: 'client',
            entity_id: data.id,
            entity_name: data.name,
            description: `Nouveau client "${data.name}" ajouté`,
          },
        ])
        .then(() => console.log('Activity logged'))
        .catch((err) => console.error('Failed to log activity:', err));

      // ⚠️ Realtime va recharger automatiquement, pas de reload manuel
      setError(null);
      return true;
    } catch (err) {
      console.error('useClients: Error in addClient:', err);
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'ajout du client"
      );
      return false;
    }
  };

  // Update a client
  const updateClient = async (
    id: string,
    clientData: Partial<Client>
  ): Promise<boolean> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('useClients: Not authenticated');
        setError('Non authentifié');
        return false;
      }

      console.log('useClients: Updating client:', id);

      const updateData: any = {};

      if (clientData.name !== undefined) updateData.name = clientData.name;
      if (clientData.phone !== undefined) updateData.phone = clientData.phone;
      if (clientData.address !== undefined)
        updateData.address = clientData.address;
      if (clientData.contactPersonName !== undefined)
        updateData.contact_person_name = clientData.contactPersonName;
      if (clientData.contactPersonPhone !== undefined)
        updateData.contact_person_phone = clientData.contactPersonPhone;
      if (clientData.frequency !== undefined)
        updateData.frequency = clientData.frequency;
      if (clientData.customFrequencyDays !== undefined)
        updateData.custom_frequency_days = clientData.customFrequencyDays;
      if (clientData.notes !== undefined) updateData.notes = clientData.notes;

      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('useClients: Error updating:', updateError);
        throw updateError;
      }

      console.log('useClients: Client updated successfully');

      // Log activity (fire and forget)
      supabase
        .from('activity_logs')
        .insert([
          {
            user_id: user.id,
            action_type: 'client_updated',
            entity_type: 'client',
            entity_id: id,
            entity_name: clientData.name || 'Client',
            description: `Client "${clientData.name || 'Client'}" modifié`,
          },
        ])
        .then(() => console.log('Activity logged'))
        .catch((err) => console.error('Failed to log activity:', err));

      // ⚠️ Realtime va recharger automatiquement
      setError(null);
      return true;
    } catch (err) {
      console.error('useClients: Error in updateClient:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la modification du client'
      );
      return false;
    }
  };

  // Delete a client
  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('useClients: Not authenticated');
        setError('Non authentifié');
        return false;
      }

      const clientToDelete = clients.find((c) => c.id === id);

      console.log('useClients: Deleting client:', id);

      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('useClients: Error deleting:', deleteError);
        throw deleteError;
      }

      console.log('useClients: Client deleted successfully');

      // Log activity (fire and forget)
      if (clientToDelete) {
        supabase
          .from('activity_logs')
          .insert([
            {
              user_id: user.id,
              action_type: 'client_deleted',
              entity_type: 'client',
              entity_id: id,
              entity_name: clientToDelete.name,
              description: `Client "${clientToDelete.name}" supprimé`,
            },
          ])
          .then(() => console.log('Activity logged'))
          .catch((err) => console.error('Failed to log activity:', err));
      }

      // ⚠️ Realtime va recharger automatiquement
      setError(null);
      return true;
    } catch (err) {
      console.error('useClients: Error in deleteClient:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la suppression du client'
      );
      return false;
    }
  };

  // ✅ useEffect avec cleanup PROPRE
  useEffect(() => {
    if (!user) {
      console.log('useClients :no user');
      return;
    }
    console.log('useClients: Effect running...');

    // Éviter les doubles subscriptions (React StrictMode)
    if (isSubscribedRef.current) {
      console.log('useClients: Already subscribed, skipping');
      return;
    }

    let mounted = true;

    const setupSubscriptions = async () => {
      // Chargement initial
      if (mounted) {
        await loadClients();
      }

      // Vérifier l'auth
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        console.log('useClients: No user or unmounted, skipping subscription');
        return;
      }

      // ✅ Configuration Realtime avec filter
      console.log('useClients: Setting up Realtime subscription');

      channelRef.current = supabase
        .channel(`clients-${user.id}`) // Channel unique par user
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clients',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('useClients: Realtime event:', payload.eventType);
            if (mounted) {
              loadClients();
            }
          }
        )
        .subscribe((status) => {
          console.log('useClients: Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true;
          }
        });
    };

    setupSubscriptions();

    // ✅ CLEANUP CRUCIAL
    return () => {
      console.log('useClients: Cleaning up...');
      mounted = false;
      isSubscribedRef.current = false;

      if (channelRef.current) {
        console.log('useClients: Unsubscribing channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]); // ⚠️ Tableau vide

  return {
    clients,
    loading,
    error,
    addClient,
    updateClient,
    deleteClient,
    refreshClients: loadClients,
  };
};
