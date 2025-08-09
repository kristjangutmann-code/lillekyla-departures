"use client";

import { useEffect, useMemo, useState } from "react";
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
