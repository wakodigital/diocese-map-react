import type { Location } from "../App";

export function LocationModal({
  location,
  onClose
}: {
  location: Location | null;
  onClose: () => void;
}) {
  if (!location) return null;

  const tel = location.phone ? location.phone.replace(/[^\d+]/g, "") : null;
  const mapsQuery = encodeURIComponent([location.address, location.pobox].filter(Boolean).join(" "));

  const otherItems = (Array.isArray(location.other) ? location.other : [])
    .map((s) => (typeof s === "string" ? s.trim() : String(s)))
    .filter((s) => s.length > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "end center",
        padding: 16
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(760px, 100%)",
          maxHeight: "82dvh",
          overflow: "auto",
          background: "#fff",
          color: "#111",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div>
            <h2 style={{ margin: 0 }}>{location.name}</h2>
            <div style={{ opacity: 0.8 }}>{location.address}</div>
            {location.pobox ? <div style={{ opacity: 0.8 }}>{location.pobox}</div> : null}
          </div>
          <button onClick={onClose} style={{ height: 36 }}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {location.pastor ? (
            <div>
              <strong>Pastor:</strong> {location.pastor}
            </div>
          ) : null}

          {location.clergy?.length ? (
            <div>
              <strong>Clergy:</strong>
              <ul style={{ marginTop: 6 }}>
                {location.clergy.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}>
              Open in Google Maps
            </a>
            {tel ? <a href={`tel:${tel}`}>Call</a> : null}
            {location.givingUrl ? (
              <a target="_blank" rel="noreferrer" href={location.givingUrl}>
                Giving
              </a>
            ) : null}
          </div>

          {location.textToGive ? (
            <div>
              <strong>Text to Give:</strong> {location.textToGive}
            </div>
          ) : null}

          {location.email ? (
            <div>
              <strong>Email:</strong> {location.email}
            </div>
          ) : null}

          {location.massTimes?.length ? (
            <div>
              <h3 style={{ margin: "6px 0" }}>Mass Times</h3>
              <ul style={{ marginTop: 6 }}>
                {location.massTimes.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {otherItems.length ? (
            <div>
              <h3 style={{ margin: "6px 0" }}>Other</h3>
              <ul style={{ marginTop: 6 }}>
                {otherItems.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
