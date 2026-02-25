import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface Coords {
  lat: number;
  lon: number;
}

/**
 * Hook to get the device's current GPS location.
 * Only requests location when enabled=true.
 * Returns null until location is available.
 */
export function useLocation(enabled: boolean): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCoords(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!cancelled) {
        setCoords({
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return coords;
}
