"use client";

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// Kui tahad keskkonnamuutujast juhtida, lisa Vercelis NEXT_PUBLIC_TZ_LABEL
const TZ = (process.env.NEXT_PUBLIC_TZ_LABEL as string) || "Europe/Tallinn";

type Trip = {
  origin_departure_time: string; // "HH:MM:SS"
  destination_arrival_time: string; // "HH:MM:SS"
  route_name?: string;
  route_onestop_id?: string;
  headsig?: string;
};

const ROUTES = [
  { label: "Tallinn → Klooga", from: "s-ud9d4uv075-tallinn", to: "s-ud932nbvg7-klooga" },
  { label: "Tallinn → Kloogaranna", from: "s-ud9d4uv075-tallinn", to: "s-ud91xepqe7-kloogaranna" },
  { label: "Kloogaranna → Tallinn", from: "s-ud91xepqe7-kloogaranna", to: "s-ud9d4uv075-tallinn" },
  { label: "Klooga → Tallinn", from: "s-ud932nbvg7-klooga", to: "s-ud9d4uv075-tallinn" },
];

export default function Page() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [items, setItems] = useState<Trip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = ROUTES[activeIndex];

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/departures?from=${encodeURIComponent(active.from)}&to=${encodeURIComponent(active.to)}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.trips as Trip[]);
    } catch (e: any) {
      setError(e?.message || "Tundmatu viga");
      setItems(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    const id = setInterval(fetchTrips, 60_000); // värskenda iga minut
    return () => clearInterval(id);
  }, [activeIndex]);

  const now = dayjs().tz(TZ);
  const nowLabel = now.format("HH:mm");

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
        Tallinn ↔ Klooga / Kloogaranna
      </h1>
      <p style={{ opacity: 0.75, marginBottom: 16 }}>
        Kuvab <strong>täna</strong> järelejäänud väljumised. Viimane värskendus: {nowLabel} ({TZ}).
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {ROUTES.map((r, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            style={{
              padding: "8px 12px",
              borderRadius: 16,
              border: "1px solid #ddd",
              background: i === activeIndex ? "#111" : "#fff",
              color: i === activeIndex ? "#fff" : "#111",
              cursor: "pointer",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
          Laen väljumisi…
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 16,
            border: "1px solid #f3c2c2",
            borderRadius: 12,
            background: "#fff6f6",
            color: "#a40000",
          }}
        >
          Viga: {error}
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            Kontrolli, et Vercelis on <code>TRANSITLAND_API_KEY</code> ja kaustastruktuur on korrektne.
          </div>
        </div>
      )}

      {items && (
        <div style={{ display: "grid", gap: 8 }}>
          {items.length === 0 && (
            <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
              Täna rohkem väljumisi pole.
            </div>
          )}

          {items.map((t, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                border: "1px solid #eee",
                borderRadius: 12,
                background: "#fff",
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  Väljub {t.origin_departure_time.slice(0, 5)}
                </div>
                <div style={{ fontSize: 14, opacity: 0.7 }}>
                  Saabub {t.destination_arrival_time.slice(0, 5)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14 }}>
                  {t.route_name || t.route_onestop_id}
                </div>
                {t.headsig && (
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{t.headsig}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <footer style={{ marginTop: 24, fontSize: 12, opacity: 0.6 }}>
        Andmeallikas: Transitland (GTFS). Päring arvestab kalendreid (nädalavahetused/pühad) ja kuvab ainult
        tänasest kellaajast edasi.
      </footer>
    </main>
  );
}
