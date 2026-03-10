import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Location } from "./App";
import { LocationModal } from "./components/LocationModal";

// Fix default marker icons in Vite (church markers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString()
});

type LatLng = { lat: number; lng: number };

// Blue dot "you are here" marker (no image assets needed)
const userDotIcon = L.divIcon({
  className: "", // don't let Leaflet add default styles
  html: `
    <div class="user-dot">
      <div class="user-dot__pulse"></div>
      <div class="user-dot__core"></div>
    </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9] // center of the dot
});

function FitBoundsOnce({ locations, disabled }: { locations: Location[]; disabled: boolean }) {
  const map = useMap();
  const [didFit, setDidFit] = useState(false);

  const bounds = useMemo(() => {
    const pts = locations
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
      .map((l) => L.latLng(l.lat, l.lng));
    return pts.length ? L.latLngBounds(pts) : null;
  }, [locations]);

  useEffect(() => {
    if (disabled) return;
    if (didFit) return;
    if (!bounds) return;

    map.fitBounds(bounds, { padding: [24, 24] });
    setDidFit(true);
  }, [bounds, map, didFit, disabled]);

  return null;
}

function FlyToUser({ userLocation }: { userLocation: LatLng | null }) {
  const map = useMap();

  useEffect(() => {
    if (!userLocation) return;
    map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.8
    });
  }, [userLocation, map]);

  return null;
}

export function MapView({ locations }: { locations: Location[] }) {
  const [selected, setSelected] = useState<Location | null>(null);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestUserLocation = () => {
    setLocationError(null);

    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError(
            "Location permission was denied. Enable it in your browser settings and try again."
          );
        } else {
          setLocationError(err.message || "Unable to retrieve your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
    );
  };

  // Fallback center (El Paso)
  const center: [number, number] = [31.7619, -106.485];

  return (
    <>
      <div style={{ height: "100vh", width: "100%", position: "relative" }}>
        {/* Blue dot styles */}
        <style>
          {`
            .user-dot {
              position: relative;
              width: 18px;
              height: 18px;
            }

            .user-dot__core {
              position: absolute;
              inset: 0;
              border-radius: 9999px;
              background: #1a73e8; /* Google-ish blue */
              border: 2px solid #ffffff;
              box-shadow: 0 1px 6px rgba(0,0,0,0.35);
            }

            .user-dot__pulse {
              position: absolute;
              left: 50%;
              top: 50%;
              width: 18px;
              height: 18px;
              transform: translate(-50%, -50%);
              border-radius: 9999px;
              background: rgba(26, 115, 232, 0.25);
              animation: userDotPulse 1.6s ease-out infinite;
            }

            @keyframes userDotPulse {
              0%   { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
              100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
            }
          `}
        </style>

        {/* Overlay button on RIGHT side */}
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: 12,
            right: 12,
            background: "white",
            padding: 12,
            borderRadius: 8,
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            maxWidth: 360
          }}
        >
          <button onClick={requestUserLocation} disabled={locating}>
            {locating ? "Locating…" : "Use my location"}
          </button>

          {locationError && (
            <div style={{ marginTop: 8, color: "crimson" }}>{locationError}</div>
          )}
        </div>

        <MapContainer style={{ height: "100%", width: "100%" }} center={center} zoom={10}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fit bounds only once; after user chooses location, stop fitting */}
          <FitBoundsOnce locations={locations} disabled={userLocation !== null} />

          {/* After user location is known, fly to them */}
          <FlyToUser userLocation={userLocation} />

          {/* User marker: blue dot */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userDotIcon}>
              <Tooltip direction="top" offset={[0, -8]} opacity={1} sticky>
                Your location
              </Tooltip>
            </Marker>
          )}

          {/* Church markers keep default icon */}
          {locations.map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              eventHandlers={{ click: () => setSelected(loc) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} sticky>
                <div style={{ fontWeight: 700 }}>{loc.name}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{loc.address}</div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <LocationModal location={selected} onClose={() => setSelected(null)} />
    </>
  );
}
