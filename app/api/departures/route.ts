import { NextRequest } from "next/server";

const TL_BASE_V1 = "https://transit.land/api/v1"; // schedule_stop_pairs
const TL_BASE_V2 = "https://transit.land/api/v2/rest"; // stops search

// Known Onestop IDs
const KLOOGARANNA = "s-ud91xepqe7-kloogaranna";
const KLOOGA = "s-ud932nbvg7-klooga"; // Updated Onestop ID for Klooga
const TALLINN = "s-ud9d4uv075-tallinn"; // Updated Onestop ID for Tallinn

// Validate if from and to are part of the valid routes
const validRoutes = [
  { from: TALLINN, to: KLOOGA }, // Tallinn - Klooga
  { from: TALLINN, to: KLOOGARANNA }, // Tallinn - Kloogaranna
  { from: KLOOGARANNA, to: TALLINN }, // Kloogaranna - Tallinn
  { from: KLOOGA, to: TALLINN }, // Klooga - Tallinn
];

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

  // Check if the route is valid
  const validRoute = validRoutes.find(
    (route) => route.from === fromRaw && route.to === toRaw
  );
  if (!validRoute) {
    return new Response("Invalid route", { status: 400 });
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const fromTime = hhmmss(now);

  // Set the from and to to the valid Onestop IDs directly
  const from = validRoute.from;
  const to = validRoute.to;

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
