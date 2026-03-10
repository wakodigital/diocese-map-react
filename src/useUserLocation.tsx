import { useCallback, useState } from "react";

type LatLng = { lat: number; lng: number };

type Status = "idle" | "loading" | "granted" | "denied" | "error";

export function useUserLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    setError(null);

    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      (err) => {
        // err.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
        if (err.code === 1) setStatus("denied");
        else setStatus("error");
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60_000,
      }
    );
  }, []);

  return { location, status, error, requestLocation };
}
