import React, { useRef, useState, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressInputProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  placeholder = "Entrez l'adresse",
  required = false,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Fermer les suggestions si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatAddress = (result: NominatimResult): string => {
    const addr = result.address;

    // On force la présence du numéro et de la rue
    if (!addr.house_number || !addr.road) {
      return result.display_name; // Fallback au cas où
    }

    const city =
      addr.city || addr.town || addr.village || addr.municipality || '';
    const parts = [
      `${addr.house_number} ${addr.road}`,
      city,
      addr.state,
      addr.postcode,
    ].filter(Boolean); // Enlève les éléments vides

    return parts.join(', ');
  };

  // Recherche d'adresses via Nominatim avec focus Québec/Ontario
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      // Configuration optimisée pour le Québec et l'Ontario
      const params = new URLSearchParams({
        format: 'json',
        q: query,
        addressdetails: '1',
        limit: '8',
        countrycodes: 'ca', // Canada uniquement
        'accept-language': 'fr,en', // Priorité au français
        bounded: '1', // Limiter aux zones spécifiées
        viewbox: '-80,42,-55,55', // Zone couvrant Québec et Ontario
        dedupe: '1', // Éviter les doublons
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'OutilsInternes/1.0', // Requis par Nominatim
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur de recherche');
      }

      const data: NominatimResult[] = await response.json();

      const filtered = data.filter((result) => {
        const hasHouseNumber = !!result.address.house_number; // Vérifie si le numéro existe
        const state = result.address.state?.toLowerCase() || '';
        const isTargetProvince =
          state.includes('québec') ||
          state.includes('quebec') ||
          state.includes('ontario');

        return hasHouseNumber && isTargetProvince;
      });

      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } catch (error) {
      console.error('Erreur Nominatim:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    // Debounce pour éviter trop de requêtes
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(inputValue);
    }, 300); // Attendre 300ms après la dernière frappe
  };

  const handleSelect = (suggestion: NominatimResult) => {
    const formattedAddress = formatAddress(suggestion);
    onChange(formattedAddress);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative" ref={inputRef}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MapPin className="h-4 w-4 text-gray-400" />
      </div>

      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        className={`pl-10 pr-10 w-full border border-gray-300 rounded-lg px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation ${className}`}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Liste des suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto">
          {suggestions.map((sug) => {
            const formattedAddress = formatAddress(sug);
            const province = sug.address.state;

            return (
              <li
                key={sug.place_id}
                onClick={() => handleSelect(sug)}
                className="px-4 py-3 cursor-pointer hover:bg-blue-50 active:bg-blue-100 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {formattedAddress}
                    </div>
                    {province && (
                      <div className="text-sm text-gray-600 mt-0.5">
                        {province}, Canada
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Message si aucun résultat */}
      {!loading &&
        showSuggestions &&
        suggestions.length === 0 &&
        value.length >= 3 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <div className="text-center text-gray-600">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">
                Aucune adresse trouvée au Québec ou en Ontario
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Essayez d'inclure le numéro civique, la rue et la ville
              </p>
            </div>
          </div>
        )}
    </div>
  );
};

export default AddressInput;
