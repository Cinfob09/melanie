import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Service } from '../types';

export const useServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load services from Supabase
  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedServices: Service[] = data.map(service => ({
        id: service.id,
        name: service.name,
        createdAt: service.created_at
      }));

      setServices(formattedServices);
    } catch (err) {
      console.error('Error loading services:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des services');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  // Add a new service
  const addService = async (serviceName: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('services')
        .insert([{ name: serviceName.trim() }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setError('Ce service existe déjà');
          return false;
        }
        throw error;
      }

      const newService: Service = {
        id: data.id,
        name: data.name,
        createdAt: data.created_at
      };

      setServices(prev => [...prev, newService]);
      setError(null);
      return true;
    } catch (err) {
      console.error('Error adding service:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du service');
      return false;
    }
  };

  // Delete a service
  const deleteService = async (serviceId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      setServices(prev => prev.filter(service => service.id !== serviceId));
      setError(null);
      return true;
    } catch (err) {
      console.error('Error deleting service:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du service');
      return false;
    }
  };

  // Update a service
  const updateService = async (serviceId: string, serviceName: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ 
          name: serviceName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setError('Ce service existe déjà');
          return false;
        }
        throw error;
      }

      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { ...service, name: serviceName.trim() }
          : service
      ));
      setError(null);
      return true;
    } catch (err) {
      console.error('Error updating service:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification du service');
      return false;
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  return {
    services,
    loading,
    error,
    addService,
    deleteService,
    updateService,
    refreshServices: loadServices
  };
};