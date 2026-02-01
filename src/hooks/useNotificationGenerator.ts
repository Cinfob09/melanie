import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Appointment, Client } from '../types';
import { usePreferences } from './usePreferences';

export const useNotificationGenerator = (
  appointments: Appointment[],
  clients: Client[],
  isLoading: boolean
) => {
  const { preferences } = usePreferences();

  useEffect(() => {
    const generate = async () => {
      // 1. SÉCURITÉ : Si c'est en chargement, sans préférences ou sans données, on ne fait rien.
      // On vérifie aussi appointments.length pour éviter de signaler des clients "sans rendez-vous" 
      // juste parce que la liste des rendez-vous n'est pas encore arrivée.
      if (isLoading || !preferences || clients.length === 0) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const currentUserId = user.id;
        const today = new Date().toISOString().split('T')[0];
        const lastCheck = localStorage.getItem('notification_last_check');

        // 2. ÉCONOMIE : Si on a déjà vérifié aujourd'hui pour cet utilisateur, on arrête.
        if (lastCheck === `${currentUserId}_${today}`) {
          return;
        }

        const notificationsToUpsert = [];

        // --- A. Rendez-vous à venir (Upcoming) ---
        // Note: On utilise 'any' sur preferences ici car certaines props peuvent être dynamiques 
        // ou manquer dans l'interface stricte selon votre implémentation
        const prefs = preferences as any;

        if (prefs.show_upcoming_appointments !== false) { 
          const daysAhead = prefs.upcoming_appointments_days || prefs.notification_days_before || 1;
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + daysAhead);
          const futureDateStr = futureDate.toISOString().split('T')[0];

          const upcoming = appointments.filter(
            (apt) =>
              apt.date >= today &&
              apt.date <= futureDateStr &&
              apt.status === 'scheduled'
          );

          if (upcoming.length > 0) {
            notificationsToUpsert.push({
              user_id: currentUserId,
              type: 'upcoming_appointment',
              title: daysAhead === 1 ? "Rendez-vous aujourd'hui" : `Rendez-vous dans ${daysAhead} jours`,
              message: `Vous avez ${upcoming.length} rendez-vous prévu(s)`,
              date: new Date().toISOString(),
              priority: daysAhead === 1 ? 'high' : 'medium',
              completed: false,
              client_id: null,
            });
          }
        }

        // --- B. Logique Clients (Manquants & Fréquence) ---
        if (prefs.show_frequency_reminders !== false) {
          for (const client of clients) {
            const clientApts = appointments.filter(a => a.client_id === client.id);

            // Cas 1 : Jamais de RDV (Missing)
            if (clientApts.length === 0) {
               notificationsToUpsert.push({
                user_id: currentUserId,
                type: 'missing_appointment',
                title: 'Aucun rendez-vous planifié',
                message: `${client.name} n'a jamais eu de rendez-vous`,
                date: new Date().toISOString(),
                priority: 'medium',
                completed: false,
                client_id: client.id,
                client_name: client.name,
              });
            } 
            // Cas 2 : Fréquence (Reminder)
            else {
              // Trouver le dernier RDV
              const lastApt = clientApts.reduce((latest, current) => {
                return new Date(current.date) > new Date(latest.date) ? current : latest;
              });

              const daysSince = Math.floor(
                (new Date().getTime() - new Date(lastApt.date).getTime()) / (1000 * 60 * 60 * 24)
              );

              // Calcul de la fréquence cible
              let freqDays = 30;
              if (client.frequency === 'custom') {
                freqDays = client.customFrequencyDays || 30;
              } else {
                const opt = preferences.frequency_options.find((o: any) => o.value === client.frequency);
                if (opt) freqDays = opt.days;
              }

              if (daysSince > freqDays) {
                notificationsToUpsert.push({
                  user_id: currentUserId,
                  type: 'frequency_reminder',
                  title: 'Rappel de fréquence',
                  message: `${client.name} : dernier rendez-vous il y a ${daysSince} jours (fréquence : ${freqDays} jours)`,
                  date: new Date().toISOString(),
                  priority: 'low',
                  completed: false,
                  client_id: client.id,
                  client_name: client.name,
                });
              }
            }
          }
        }

        // --- C. ENVOI UNIQUE (BATCH) ---
        if (notificationsToUpsert.length > 0) {
          await supabase
            .from('notifications')
            .upsert(notificationsToUpsert, { 
              onConflict: 'user_id, client_id, type', 
              ignoreDuplicates: true 
            });
        }

        // Marquer comme fait pour aujourd'hui
        localStorage.setItem('notification_last_check', `${currentUserId}_${today}`);

      } catch (err) {
        // Erreur silencieuse
      }
    };

    generate();
  }, [isLoading, appointments.length, clients.length, preferences]); 
};