import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Appointment, Client } from '../types';
import { usePreferences } from './usePreferences';

export const useNotificationGenerator = (
  appointments: Appointment[],
  clients: Client[],
  isLoading: boolean // <--- NOUVEAU : On doit savoir si ça charge encore
) => {
  const { preferences } = usePreferences();

  useEffect(() => {
    const generate = async () => {
      // 1. SÉCURITÉ : Si ça charge ou si pas de données, on touche à rien !
      if (isLoading || !preferences || clients.length === 0) return;

      // 2. ÉCONOMIE DE REQUÊTES : On vérifie si on a déjà fait le check aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const lastCheck = localStorage.getItem('notification_last_check');
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;

      // Si on a déjà checké aujourd'hui pour cet user, on arrête tout.
      if (lastCheck === `${currentUserId}_${today}`) {
        console.log("Notifications déjà vérifiées aujourd'hui. Stop.");
        return;
      }

      if (!currentUserId) return;

      console.log("Génération des notifications en cours...");
      const notificationsToUpsert = [];

      try {
        // --- A. Rendez-vous à venir (Upcoming) ---
        if (preferences.show_upcoming_appointments) {
          const daysAhead = preferences.upcoming_appointments_days || 1;
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
              client_id: null, // Pas lié à un client spécifique
            });
          }
        }

        // --- B. Logique Clients (Manquants & Fréquence) ---
        if (preferences.show_frequency_reminders) {
          for (const client of clients) {
            const clientApts = appointments.filter(a => a.client_id === client.id);

            // Cas 1 : Jamais de RDV (Missing)
            if (clientApts.length === 0) {
               // ATTENTION : C'est ici que ça buggait avant si appointments était vide à cause du chargement
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
          const { error } = await supabase
            .from('notifications')
            .upsert(notificationsToUpsert, { 
              onConflict: 'user_id, client_id, type', // L'index SQL fait le travail ici
              ignoreDuplicates: true 
            });

          if (error) console.error("Erreur save notifs:", error);
          else console.log(`${notificationsToUpsert.length} notifications traitées.`);
        }

        // Marquer comme fait pour aujourd'hui dans le navigateur
        localStorage.setItem('notification_last_check', `${currentUserId}_${today}`);

      } catch (err) {
        console.error("Erreur générateur notifs:", err);
      }
    };

    generate();
    // On relance UNIQUEMENT si isLoading passe de true à false, ou si les données changent
  }, [isLoading, appointments.length, clients.length, preferences]); 
};