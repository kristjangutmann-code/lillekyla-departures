// File: package.json
{
  "name": "lillekyla-kloogaranna-departures",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000"
  },
  "dependencies": {
    "dayjs": "^1.11.11",
    "dayjs-plugin-utc": "^0.1.2",
    "dayjs-plugin-timezone": "^0.1.1",
    "next": "^14.2.6",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}

// File: next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
module.exports = nextConfig;

// File: .env.example
# Get a free API key at https://www.transit.land/ (Create account → API key)
TRANSITLAND_API_KEY="YOUR_KEY_HERE"

# Optional: override if you want a different timezone label
TZ_LABEL="Europe/Tallinn"

// File: app/layout.tsx
export const metadata = {
  title: "Lilleküla ↔ Klooga/Kloogaranna departures",
  description: "Shows today's remaining trains for Elron (R11/R12/R14/R15) westbound branch.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}

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

// File: app/api/departures/route.ts
import { NextRequest } from "next/server";

const TL_BASE_V1 = "https://transit.land/api/v1"; // schedule_stop_pairs
const TL_BASE_V2 = "https://transit.land/api/v2/rest"; // stops search

// Known Onestop IDs
const KLOOGARANNA = "s-ud91xepqe7-kloogaranna";
const KLOOGA = "s-ud932p00sp-kloogaraudteejaam";

// Resolve Lilleküla Onestop ID by coordinates, cache in memory in the serverless function runtime
let cachedLillekyla: string | null = null;

async function resolveLillekylaOnestopId(apiKey: string): Promise<string> {
  if (cachedLillekyla) return cachedLillekyla;
  // Lilleküla station coordinates from Wikipedia
  const lat = 59.42484;
  const lon = 24.72806;
  const url = new URL(`${TL_BASE_V2}/stops`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("radius", "800");
  url.searchParams.set("apikey", apiKey);

  const r = await fetch(url, { next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`Transitland stops error: ${r.status}`);
  const data = await r.json();
  // Heuristic: prefer names containing "Lille" and rail-served if available
  const stops = (data?.stops || []) as any[];
  const candidate =
    stops.find((s) => (s.name || "").toLowerCase().includes("lille")) || stops[0];
  if (!candidate?.onestop_id) throw new Error("Lilleküla peatuse ID ei leitud");
  cachedLillekyla = candidate.onestop_id as string;
  return cachedLillekyla;
}

function hhmmss(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.TRANSITLAND_API_KEY || "";
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Puudub TRANSITLAND_API_KEY" }), { status: 500 });
  }

  const fromRaw = req.nextUrl.searchParams.get("from");
  const toRaw = req.nextUrl.searchParams.get("to");
  if (!fromRaw || !toRaw) return new Response("Missing from/to", { status: 400 });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const fromTime = hhmmss(now);

  // Resolve LILLEKYLA placeholder to real onestop id
  const from = fromRaw === "LILLEKYLA" ? await resolveLillekylaOnestopId(apiKey) : fromRaw;
  const to = toRaw === "LILLEKYLA" ? await resolveLillekylaOnestopId(apiKey) : toRaw;

  // v1 schedule_stop_pairs query — this respects calendars & exceptions (weekends, holidays)
  const url = new URL(`${TL_BASE_V1}/schedule_stop_pairs`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("origin_onestop_id", from);
  url.searchParams.set("destination_onestop_id", to);
  url.searchParams.set("date", dateStr);
  url.searchParams.set("active", "true");
  url.searchParams.set("origin_departure_between", `${fromTime},23:59:59`);
  url.searchParams.set("per_page", "200");

  const r = await fetch(url.toString());
  if (!r.ok) {
    const text = await r.text();
    return new Response(text || "Transitland viga", { status: 502 });
  }
  const data = await r.json();
  const ssp = (data?.schedule_stop_pairs || []) as any[];

  const trips = ssp
    .map((row) => ({
      origin_departure_time: row.origin_departure_time,
      destination_arrival_time: row.destination_arrival_time,
      route_name: row.route_name,
      route_onestop_id: row.route_onestop_id,
      headsig: row.trip_headsign,
    }))
    // Ensure future only (defensive)
    .filter((t) => t.origin_departure_time >= fromTime)
    .sort((a, b) => a.origin_departure_time.localeCompare(b.origin_departure_time));

  return new Response(JSON.stringify({ trips, from, to }), {
    headers: { "content-type": "application/json" },
  });
}

// File: README.md
# Lilleküla ↔ Klooga/Kloogaranna — Vercel app

Näitab **täna järelejäänud** Elroni väljumisi suundadel:
- Lilleküla → Klooga
- Lilleküla → Kloogaranna
- Klooga → Lilleküla (nupust)
- Kloogaranna → Lilleküla (nupust)

Arvestab nädalavahetusi ja pühi, sest päringud tulevad GTFS kalendrit arvestavast Transitlandi API-st.

## Kiirstart (Vercel)
1. **Fork/ZIP** see repo sisu.
2. Vercelis → New Project → Import Git Repo.
3. **Environment Variables**: lisa `TRANSITLAND_API_KEY` (tasuta, saad Transitlandi kontolt) ja vajadusel `TZ_LABEL`.
4. Deploy. URL avaneb kujul `https://…vercel.app`.

## Kohalik arendus
```sh
npm i
cp .env.example .env # täida API võti
npm run dev
```

## Kuidas Lilleküla Onestop ID leitakse
Serverless API leiab selle **geokoordinaatide** järgi Transitlandi REST `stops` endpointist ning **vahemällu** salvestab. Klooga ja Kloogaranna ID-d on juba konfiguratsioonis:
- Klooga: `s-ud932p00sp-kloogaraudteejaam`
- Kloogaranna: `s-ud91xepqe7-kloogaranna`

Soovi korral saad Lilleküla ID **fikseerida**: asenda `"LILLEKYLA"` vastava `s-…` väärtusega failis `app/page.tsx` ja API-s `route.ts`.

## Märkused
- Kui ühel päeval pole enam väljumisi, kuvab leht vastava teate.
- Päringud **filtreeritakse tänasest kellaajast edasi** (möödunud väljumisi ei näidata).
- UI värskendab iga 60 sekundi järel.

