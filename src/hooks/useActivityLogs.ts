import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ActivityLog {
  id: string;
  actionType: 'client_added' | 'client_updated' | 'client_deleted' | 'appointment_added' | 'appointment_updated' | 'appointment_deleted' | 'appointment_completed';
  entityType: 'client' | 'appointment';
  entityId: string;
  entityName: string;
  description: string;
  createdAt: string;
}

export const useActivityLogs = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setActivities([]);
        return;
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedActivities: ActivityLog[] = data.map(log => ({
        id: log.id,
        actionType: log.action_type,
        entityType: log.entity_type,
        entityId: log.entity_id,
        entityName: log.entity_name,
        description: log.description,
        createdAt: log.created_at
      }));

      setActivities(formattedActivities);
    } catch (err) {
      console.error('Error loading activity logs:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des activités');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (
    actionType: ActivityLog['actionType'],
    entityType: ActivityLog['entityType'],
    entityId: string,
    entityName: string,
    description: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: user.id,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          description: description
        }]);

      if (error) throw error;

      await loadActivityLogs();
      return true;
    } catch (err) {
      console.error('Error logging activity:', err);
      return false;
    }
  };

  useEffect(() => {
    loadActivityLogs();
  }, []);

  return {
    activities,
    loading,
    error,
    logActivity,
    refreshActivityLogs: loadActivityLogs
  };
};
