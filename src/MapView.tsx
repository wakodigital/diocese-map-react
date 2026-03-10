import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Location } from "./App";
import { LocationModal } from "./components/LocationModal";

// Fix default marker icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString()
});

function FitBounds({ locations }: { locations: Location[] }) {
  const map = useMap();

  const bounds = useMemo(() => {
    const pts = locations
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
      .map((l) => L.latLng(l.lat, l.lng));
    return pts.length ? L.latLngBounds(pts) : null;
  }, [locations]);

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [bounds, map]);

  return null;
}

export function MapView({ locations }: { locations: Location[] }) {
  const [selected, setSelected] = useState<Location | null>(null);

  // Fallback center (El Paso)
  const center: [number, number] = [31.7619, -106.485];

  return (
    <>
      <div style={{ height: "100vh", width: "100%" }}>
        <MapContainer style={{ height: "100%", width: "100%" }} center={center} zoom={10}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds locations={locations} />

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
