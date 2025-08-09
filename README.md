
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
