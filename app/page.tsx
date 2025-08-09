// File: app/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

const ROUTES = [
  { label: "Lilleküla → Klooga", from: "LILLEKYLA", to: "s-ud932p00sp-kloogaraudteejaam" },
  { label: "Lilleküla → Kloogaranna", from: "LILLEKYLA", to: "s-ud91xepqe7-kloogaranna" },
  { label: "Klooga → Lilleküla", from: "s-ud932p00sp-kloogaraudteejaam", to: "LILLEKYLA" },
  { label: "Kloogaranna → Lilleküla", from: "s-ud91xepqe7-kloogaranna", to: "LILLEKYLA" },
];

type Trip = {
  origin_departure_time: string; // HH:MM:SS
  destination_arrival_time: string; // HH:MM:SS
  route_name?: string;
  route_onestop_id?: string;
  headsig?: string;
};

export default function Page() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [items, setItems] = useState<Trip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = ROUTES[activeIndex];

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    setItems(null);
    try {
      const res = await fetch(`/api/departures?from=${encodeURIComponent(active.from)}&to=${encodeURIComponent(active.to)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.trips as Trip[]);
    } catch (e: any) {
      setError(e?.message || "Tundmatu viga");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    const id = setInterval(fetchTrips, 60_000); // refresh every minute
    return () => clearInterval(id);
  }, [activeIndex]);

  const nowLabel = useMemo(() => new Date().toLocaleString("et-EE", { hour: "2-digit", minute: "2-digit" }), []);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold mb-1">Lilleküla ↔ Klooga/Kloogaranna</h1>
      <p className="text-sm opacity-80 mb-4">Kuvab täna järelejäänud väljumised. Viimane värskendus: {nowLabel}.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {ROUTES.map((r, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`px-3 py-2 rounded-2xl text-sm border ${i === activeIndex ? "bg-black text-white" : "bg-white"}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && <div className="p-4 border rounded-xl bg-white">Laen väljumisi…</div>}
      {error && (
        <div className="p-4 border rounded-xl bg-white text-red-700">
          Viga: {error}
          <div className="text-xs opacity-70 mt-1">Kontrolli .env API võtit ja kas peatus “Lilleküla” tuvastus õnnestus.</div>
        </div>
      )}

      {items && (
        <div className="grid gap-2">
          {items.length === 0 && (
            <div className="p-4 border rounded-xl bg-white">Täna rohkem väljumisi pole.</div>
          )}
          {items.map((t, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border rounded-xl bg-white">
              <div>
                <div className="text-lg font-medium">Väljub {t.origin_departure_time.slice(0,5)}</div>
                <div className="text-sm opacity-70">Saabub {t.destination_arrival_time.slice(0,5)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">{t.route_name || t.route_onestop_id}</div>
                {t.headsig && <div className="text-xs opacity-60">{t.headsig}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="mt-8 text-xs opacity-60">
        Andmeallikas: Transitland (GTFS). Arvestab nädalavahetusi ja pühi GTFS kalendri põhjal.
      </footer>
    </main>
  );
}