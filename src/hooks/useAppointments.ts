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

  const channelRef = useRef<RealtimeChannel | null>(null);
  // On utilise une ref pour stocker l'ID utilisé lors du dernier fetch
  const loadedUserId = useRef<string | null>(null);

  const loadAppointments = useCallback(async (force = false) => {
    // Si pas d'utilisateur, on nettoie et on arrête
    if (!user?.id) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    // ÉVITE LES REQUÊTES DOUBLES : Si on a déjà chargé pour cet ID et qu'on ne force pas
    if (!force && loadedUserId.current === user.id && appointments.length > 0) {
      return; 
    }

    try {
      // Pas de setLoading(true) ici pour éviter le clignotement lors des refresh background
      if (!appointments.length) setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`*, clients!inner(name), services(name)`)
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (fetchError) throw fetchError;

      const formattedAppointments: Appointment[] = (data || []).map((appointment) => ({
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
      }));

      setAppointments(formattedAppointments);
      loadedUserId.current = user.id; // Marquer comme chargé
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // DÉPENDANCE CRITIQUE : Uniquement l'ID

  // ... (Garde tes fonctions addAppointment, updateAppointment, deleteAppointment telles quelles, 
  // MAIS retire les console.log dedans) ...
  
  // Je remets les fonctions simplifiées pour que le fichier soit complet et sans logs :
  const addAppointment = async (appointmentData: Omit<Appointment, 'id'>): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data: serviceData } = await supabase.from('services').select('id').eq('name', appointmentData.service).maybeSingle();
      const { data, error } = await supabase.from('appointments').insert([{
        user_id: user.id,
        client_id: appointmentData.clientId,
        service_id: serviceData?.id,
        date: appointmentData.date,
        time: appointmentData.time,
        duration: appointmentData.duration,
        status: appointmentData.status,
        notes: appointmentData.notes,
        price: appointmentData.price,
      }]).select().single();

      if (error) throw error;
      
      // Pas besoin de re-fetch complet grâce au Realtime, mais on peut mettre à jour localement si besoin
      return true;
    } catch (err) { return false; }
  };

  const updateAppointment = async (id: string, appointmentData: Partial<Appointment>): Promise<boolean> => {
    if (!user) return false;
    try {
      const updateData: any = { ...appointmentData };
      delete updateData.clientName; // Nettoyage
      delete updateData.service;
      
      if (appointmentData.service) {
         const { data: s } = await supabase.from('services').select('id').eq('name', appointmentData.service).maybeSingle();
         updateData.service_id = s?.id;
      }
      // Mapping des champs snake_case pour la DB
      if (appointmentData.clientId) updateData.client_id = appointmentData.clientId;

      const { error } = await supabase.from('appointments').update(updateData).eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) { return false; }
  };

  const deleteAppointment = async (id: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      setAppointments(prev => prev.filter(a => a.id !== id)); // Optimistic update
      return true;
    } catch (err) { return false; }
  };

  useEffect(() => {
    if (!user?.id) return;

    loadAppointments(); // Premier chargement

    // Realtime sans spam
    const channel = supabase
      .channel(`appointments-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'appointments', 
        filter: `user_id=eq.${user.id}` 
      }, () => {
        loadAppointments(true); // Force reload on change
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadAppointments]); 

  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    refreshAppointments: () => loadAppointments(true),
  };
};