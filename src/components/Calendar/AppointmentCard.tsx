import React from 'react';
import { Clock, User, MapPin, Navigation, Trash2 } from 'lucide-react';
import { Appointment, Client } from '../../types';

interface AppointmentCardProps {
  appointment: Appointment;
  client?: Client;
  onClick?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  showNavigation?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  client,
  onClick,
  onDelete,
  showNavigation = false,
}) => {
  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!client?.address) {
      alert('Adresse du client non disponible');
      return;
    }

    // Encode the address for URL
    const encodedAddress = encodeURIComponent(client.address);

    // Try to open in Apple Maps first (iOS/macOS)
    const appleMapsUrl = `maps://maps.apple.com/?daddr=${encodedAddress}`;

    // Fallback to Google Maps (universal)
    const googleMapsUrl = `https://maps.google.com/maps?daddr=${encodedAddress}`;

    // Detect if we're on iOS/macOS
    const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(
      navigator.userAgent
    );

    if (isAppleDevice) {
      // Try Apple Maps first
      const link = document.createElement('a');
      link.href = appleMapsUrl;
      link.click();

      // Fallback to Google Maps after a short delay if Apple Maps doesn't open
      setTimeout(() => {
        window.open(googleMapsUrl, '_blank');
      }, 1000);
    } else {
      // Open Google Maps directly on non-Apple devices
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(e);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg cursor-pointer touch-manipulation transition-all border relative ${
        appointment.status === 'scheduled'
          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
          : appointment.status === 'completed'
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      }`}
    >
      {/* Header avec heure et boutons d'action */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <Clock className="w-4 h-4" />
          <div>
            <span className="font-bold text-lg">
              {appointment.time.slice(0, 5)}
            </span>
            <span className="text-sm opacity-75 ml-2">
              ({appointment.duration} min)
            </span>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {showNavigation && client?.address && (
            <button
              onClick={handleNavigate}
              className="p-2 rounded-lg bg-white/50 hover:bg-white/80 active:bg-white transition-colors"
              title="Ouvrir l'itinéraire"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 active:bg-red-500/60 transition-colors group"
              title="Supprimer le rendez-vous"
            >
              <Trash2 className="w-4 h-4 text-red-700 group-hover:text-red-800" />
            </button>
          )}
        </div>
      </div>

      {/* Service */}
      <div className="font-bold text-base mb-2 text-gray-900">
        {appointment.service}
      </div>

      {/* Client */}
      <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
        <User className="w-3 h-3" />
        <span className="font-medium">{appointment.clientName}</span>
      </div>

      {/* Adresse */}
      {client?.address && (
        <div className="flex items-start gap-2 text-sm opacity-90 mb-2">
          <MapPin className="w-3 h-3 mt-0.5" />
          <span className="line-clamp-2">{client.address}</span>
        </div>
      )}

      {/* Notes */}
      {appointment.notes && (
        <div className="text-sm opacity-90 mt-2 p-2 bg-white/30 rounded italic">
          {appointment.notes}
        </div>
      )}

      {/* Prix */}
      {appointment.price && appointment.price > 0 && (
        <div className="flex items-center justify-end mt-3 pt-2 border-t border-white/30">
          <span className="text-lg font-bold">
            ${appointment.price.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;
