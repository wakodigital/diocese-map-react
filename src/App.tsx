import { useEffect, useState } from "react";
import { MapView } from "./MapView";
import { ErrorBoundary } from "./components/ErrorBoundary";

export type Location = {
  id: string;
  name: string;
  type: string;
  address: string;
  pobox?: string | null;
  phone?: string | null;
  pastor?: string | null;
  clergy?: string[];
  givingUrl?: string | null;
  textToGive?: string | null;
  email?: string | null;
  massTimes?: string[];
  other?: string[];
  lat: number;
  lng: number;
  geocodeNote?: string | null;
};

function isValidLocation(x: any): x is Location {
  return (
    x &&
    typeof x.id === "string" &&
    typeof x.name === "string" &&
    typeof x.address === "string" &&
    typeof x.lat === "number" &&
    Number.isFinite(x.lat) &&
    typeof x.lng === "number" &&
    Number.isFinite(x.lng)
  );
}

export default function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);

  console.log("BASE_URL:", import.meta.env.BASE_URL);
  console.log("locations URL:", `${import.meta.env.BASE_URL}locations.json`);

  useEffect(() => { 
    fetch(`${import.meta.env.BASE_URL}locations.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load locations.json (${r.status})`);
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data.filter(isValidLocation) : [];
        if (Array.isArray(data) && list.length !== data.length) {
          console.warn(
            `Filtered out ${data.length - list.length} invalid locations (missing/invalid lat/lng).`
          );
        }
        setLocations(list);
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  if (error) return <div style={{ padding: 16 }}>Error: {error}</div>;
  if (!locations.length)
    return (
      <div style={{ padding: 16 }}>
        Loading map… (If this never finishes, check that locations have numeric lat/lng)
      </div>
    );

  // Debug view (temporary). Once you see this, switch to the map return below.
//  return (
//    <div style={{ padding: 16 }}>
//      App rendered. Locations loaded: {locations.length}
//    </div>
//  );

  // Final view:
  return (
   <ErrorBoundary>
    <MapView locations={locations} />
   </ErrorBoundary>
 );
}
