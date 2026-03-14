import { useEffect, useMemo, useState } from "react";
import { MapView } from "./MapView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  WEEKDAYS,
  buildTimeSlotsForDay,
  locationHasConfessionAtMinute,
  parseReconciliationSchedule,
  type TimeOption,
  type Weekday,
} from "./reconciliation";

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

  // Show everything (no day/time filtering)
  const [showAll, setShowAll] = useState(true);

  // Day is used when showAll === false
  const [day, setDay] = useState<Weekday>("Saturday");

  // Optional: selected slot (in minutes since midnight). "" means "All times".
  const [selectedSlot, setSelectedSlot] = useState<string>("");

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

  const timeSlots: TimeOption[] = useMemo(() => {
    if (showAll) return [];
    // 15-minute slot granularity; change to 10 or 5 if you want more options.
    return buildTimeSlotsForDay(locations, day, 15);
  }, [locations, showAll, day]);

  // If the day changes (or showAll toggles), ensure the selected slot is still valid
  useEffect(() => {
    if (showAll) {
      if (selectedSlot) setSelectedSlot("");
      return;
    }
    if (!selectedSlot) return;

    const minute = Number(selectedSlot);
    if (!Number.isFinite(minute)) {
      setSelectedSlot("");
      return;
    }

    if (!timeSlots.some((s) => s.minute === minute)) setSelectedSlot("");
  }, [showAll, day, timeSlots, selectedSlot]);

  const filteredLocations = useMemo(() => {
    if (showAll) return locations;

    // First: only churches that have any confession/reconciliation parsed for that day
    const byDay = locations.filter((loc) => {
      const sched = parseReconciliationSchedule({ other: loc.other, massTimes: loc.massTimes });
      return (sched[day]?.length ?? 0) > 0;
    });

    // Optional: further filter by selected time slot (minute)
    if (!selectedSlot) return byDay;

    const minute = Number(selectedSlot);
    if (!Number.isFinite(minute)) return byDay;

    return byDay.filter((loc) => locationHasConfessionAtMinute(loc, day, minute));
  }, [locations, showAll, day, selectedSlot]);

  if (error) return <div style={{ padding: 16 }}>Error: {error}</div>;
  if (!locations.length) return <div style={{ padding: 16 }}>Loading map…</div>;

  return (
    <ErrorBoundary>
      {/* Filter bar overlay */}
      <div
        style={{
          position: "absolute",
          zIndex: 1200,
          left: 12,
          bottom: 12,
          background: "white",
          padding: 12,
          borderRadius: 10,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          maxWidth: 720,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          Show all churches
        </label>

        <label>
          Confession day:&nbsp;
          <select
            value={day}
            onChange={(e) => setDay(e.target.value as Weekday)}
            disabled={showAll}
          >
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label>
          Time (optional):&nbsp;
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            disabled={showAll || timeSlots.length === 0}
          >
            <option value="">All times</option>
            {timeSlots.map((s) => (
              <option key={s.key} value={String(s.minute)}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {!showAll && timeSlots.length === 0 && (
          <div style={{ opacity: 0.75 }}>No confession times parsed for {day}.</div>
        )}

        <div style={{ opacity: 0.75 }}>
          Showing {filteredLocations.length} of {locations.length}
        </div>
      </div>

      <MapView locations={filteredLocations} />
    </ErrorBoundary>
  );
}
