import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { useAuth } from './useAuth';

export const useClients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pour éviter de re-fetcher si les données sont déjà là pour cet user
  const loadedUserId = useRef<string | null>(null);

  const loadClients = useCallback(async (force = false) => {
    if (!user?.id) {
      setClients([]);
      setLoading(false);
      return;
    }

    // Optimisation : Si on a déjà chargé pour cet ID et qu'on ne force pas, on arrête.
    if (!force && loadedUserId.current === user.id && clients.length > 0) {
      return;
    }

    try {
      // On met loading à true seulement si la liste est vide (évite le clignotement)
      if (clients.length === 0) setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

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
      loadedUserId.current = user.id; // Marquer comme chargé
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // Dépendance sur l'ID seulement

  // Add a new client
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>): Promise<boolean> => {
    if (!user?.id) return false;

    try {
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

      if (insertError) throw insertError;

      // Log activity (fire and forget)
      supabase.from('activity_logs').insert([{
        user_id: user.id,
        action_type: 'client_added',
        entity_type: 'client',
        entity_id: data.id,
        entity_name: data.name,
        description: `Nouveau client "${data.name}" ajouté`,
      }]).then(() => {});

      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'ajout du client");
      return false;
    }
  };

  // Update a client
  const updateClient = async (id: string, clientData: Partial<Client>): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const updateData: any = {};
      if (clientData.name !== undefined) updateData.name = clientData.name;
      if (clientData.phone !== undefined) updateData.phone = clientData.phone;
      if (clientData.address !== undefined) updateData.address = clientData.address;
      if (clientData.contactPersonName !== undefined) updateData.contact_person_name = clientData.contactPersonName;
      if (clientData.contactPersonPhone !== undefined) updateData.contact_person_phone = clientData.contactPersonPhone;
      if (clientData.frequency !== undefined) updateData.frequency = clientData.frequency;
      if (clientData.customFrequencyDays !== undefined) updateData.custom_frequency_days = clientData.customFrequencyDays;
      if (clientData.notes !== undefined) updateData.notes = clientData.notes;

      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Log activity
      supabase.from('activity_logs').insert([{
        user_id: user.id,
        action_type: 'client_updated',
        entity_type: 'client',
        entity_id: id,
        entity_name: clientData.name || 'Client',
        description: `Client "${clientData.name || 'Client'}" modifié`,
      }]).then(() => {});

      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification du client');
      return false;
    }
  };

  // Delete a client
  const deleteClient = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const clientToDelete = clients.find((c) => c.id === id);

      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Mise à jour Optimiste
      setClients((prev) => prev.filter((c) => c.id !== id));

      // Log activity
      if (clientToDelete) {
        supabase.from('activity_logs').insert([{
          user_id: user.id,
          action_type: 'client_deleted',
          entity_type: 'client',
          entity_id: id,
          entity_name: clientToDelete.name,
          description: `Client "${clientToDelete.name}" supprimé`,
        }]).then(() => {});
      }

      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression du client');
      return false;
    }
  };

  // Gestion du Realtime et Chargement Initial
  useEffect(() => {
    if (!user?.id) return;

    // 1. Chargement initial
    loadClients();

    // 2. Abonnement Realtime
    const channel = supabase
      .channel(`clients-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Recharger les données si changement DB détecté
          loadClients(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadClients]); // ⚠️ Dépendance stricte sur user.id

  return {
    clients,
    loading,
    error,
    addClient,
    updateClient,
    deleteClient,
    refreshClients: () => loadClients(true),
  };
};