// Cloudflare Worker — SahelTransit /api/vessels
// Adapté du handler Vercel original. Utilise le fallback "demo" (navires simulés
// autour de Douala) qui fonctionne sans clé API. La vraie donnée AISstream
// nécessite un WebSocket sortant (non supporté nativement par Workers) — on
// garde donc le mode demo comme source par défaut.

function nmToDegrees(nm, lat) {
  const dLat = nm / 60;
  const dLon = nm / (60 * Math.cos((lat * Math.PI) / 180));
  return { dLat, dLon };
}

function parseQuery(url) {
  const predefined = {
    douala: { lat: 4.05, lon: 9.7, radiusNm: 60 },
    kribi: { lat: 2.93, lon: 9.91, radiusNm: 60 },
    lagos: { lat: 6.45, lon: 3.4, radiusNm: 80 },
    gulf: { lat: 4.0, lon: 2.0, radiusNm: 200 },
    abidjan: { lat: 5.28, lon: -4.01, radiusNm: 80 },
    lome: { lat: 6.14, lon: 1.27, radiusNm: 80 },
    accra: { lat: 5.62, lon: -0.08, radiusNm: 80 },
  };

  const zone = (url.searchParams.get('zone') || '').toLowerCase();
  if (zone && predefined[zone]) {
    const z = predefined[zone];
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 200);
    return { lat: z.lat, lon: z.lon, radiusNm: z.radiusNm, limit };
  }

  const lat = Number(url.searchParams.get('lat') ?? 4.05);
  const lon = Number(url.searchParams.get('lon') ?? 9.7);
  const radiusNm = Math.min(Number(url.searchParams.get('radiusNm') ?? 60), 200);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  return { lat, lon, radiusNm, limit };
}

function buildBounds(lat, lon, radiusNm) {
  const { dLat, dLon } = nmToDegrees(radiusNm, lat);
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon,
  };
}

function demoVessels(centerLat, centerLon, radiusNm, limit) {
  const { dLat, dLon } = nmToDegrees(radiusNm, centerLat);
  const now = new Date().toISOString();

  const base = [
    { mmsi: 256789000, name: 'CMA CGM DAKAR', callsign: 'S6BD', imo: 9412345, type: 'Container Ship', destination: 'Douala', eta: '2026-07-30T06:00:00Z', source: 'demo' },
    { mmsi: 257891000, name: 'MAERSK DOUALA', callsign: 'TJMC', imo: 9512367, type: 'Container Ship', destination: 'Douala', eta: '2026-07-29T14:30:00Z', source: 'demo' },
    { mmsi: 258912000, name: 'MSC ABIDJAN', callsign: '3EWG', imo: 9623451, type: 'Container Ship', destination: 'Abidjan', eta: '2026-07-31T09:00:00Z', source: 'demo' },
    { mmsi: 259123000, name: 'HAPAG LLOYD LAGOS', callsign: '5NBM', imo: 9734562, type: 'Container Ship', destination: 'Lagos', eta: '2026-07-30T22:00:00Z', source: 'demo' },
    { mmsi: 260234000, name: 'PIL KRIBI', callsign: 'TJMF', imo: 9845673, type: 'Container Ship', destination: 'Kribi', eta: '2026-08-01T03:45:00Z', source: 'demo' },
    { mmsi: 261345000, name: 'SAHEL TRADER', callsign: '3EUA4', imo: 9956784, type: 'General Cargo', destination: 'Douala', eta: '2026-08-02T11:20:00Z', source: 'demo' },
    { mmsi: 262456000, name: 'GULF FEEDER', callsign: 'SNUM', imo: 9012345, type: 'General Cargo', destination: 'Lomé', eta: '2026-07-30T16:00:00Z', source: 'demo' },
    { mmsi: 263567000, name: 'DOUALA EXPRESS', callsign: 'TJMG', imo: 9123456, type: 'Container Ship', destination: 'Douala', eta: '2026-07-31T20:15:00Z', source: 'demo' },
    { mmsi: 264678000, name: 'N DJAMENA BRIDGE', callsign: '5VCM', imo: 9234567, type: 'Ro-Ro/Passenger Ship', destination: 'Douala', eta: '2026-08-03T08:30:00Z', source: 'demo' },
    { mmsi: 265789000, name: 'CAMEROON STAR', callsign: 'TJMH', imo: 9345678, type: 'Bulk Carrier', destination: 'Kribi', eta: '2026-08-01T12:00:00Z', source: 'demo' },
    { mmsi: 266890000, name: 'LOGONE RIVER', callsign: 'S6BE', imo: 9456789, type: 'Oil/Chemical Tanker', destination: 'Douala', eta: '2026-07-31T05:00:00Z', source: 'demo' },
    { mmsi: 267901000, name: 'CHAD CONNECTOR', callsign: '3FUB', imo: 9567890, type: 'General Cargo', destination: 'Douala', eta: '2026-08-04T15:45:00Z', source: 'demo' },
    { mmsi: 268012000, name: 'ATLANTIC GATE', callsign: '5NBN', imo: 9678901, type: 'Container Ship', destination: 'Lagos', eta: '2026-07-30T09:20:00Z', source: 'demo' },
    { mmsi: 269123000, name: 'WEST AFRICA LINE 1', callsign: '5VCN', imo: 9789012, type: 'Container Ship', destination: 'Tema', eta: '2026-08-02T07:10:00Z', source: 'demo' },
    { mmsi: 270234000, name: 'BULK CAMEROON', callsign: 'TJMK', imo: 9890123, type: 'Bulk Carrier', destination: 'Douala', eta: '2026-08-05T02:30:00Z', source: 'demo' },
    { mmsi: 271345000, name: 'OIL TRADER LAGOS', callsign: '5NBO', imo: 9901234, type: 'Oil/Chemical Tanker', destination: 'Lagos', eta: '2026-07-29T18:00:00Z', source: 'demo' },
    { mmsi: 272456000, name: 'COTONOU FEEDER', callsign: '5VCP', imo: 9012346, type: 'General Cargo', destination: 'Cotonou', eta: '2026-08-01T11:00:00Z', source: 'demo' },
    { mmsi: 273567000, name: 'PORT HARCOURT TRADER', callsign: '5NBQ', imo: 9123457, type: 'Bulk Carrier', destination: 'Port Harcourt', eta: '2026-08-03T14:20:00Z', source: 'demo' },
    { mmsi: 274678000, name: 'LIBREVILLE CARRIER', callsign: 'TJML', imo: 9234568, type: 'Container Ship', destination: 'Libreville', eta: '2026-08-02T19:00:00Z', source: 'demo' },
    { mmsi: 275789000, name: 'GULF OF GUINEA', callsign: 'S6BF', imo: 9345679, type: 'Oil/Chemical Tanker', destination: 'Lomé', eta: '2026-07-30T23:30:00Z', source: 'demo' },
    { mmsi: 276890000, name: 'BATA EXPRESS', callsign: '3FUC', imo: 9456780, type: 'General Cargo', destination: 'Bata', eta: '2026-08-04T10:15:00Z', source: 'demo' },
    { mmsi: 277901000, name: 'MALABO BRIDGE', callsign: 'TJMM', imo: 9567891, type: 'Ro-Ro/Passenger Ship', destination: 'Malabo', eta: '2026-08-01T06:45:00Z', source: 'demo' },
    { mmsi: 278012000, name: 'TEMA FEEDER', callsign: '5VCR', imo: 9678902, type: 'Container Ship', destination: 'Tema', eta: '2026-07-31T13:30:00Z', source: 'demo' },
    { mmsi: 279123000, name: 'AFRICAN COAST', callsign: '5NBR', imo: 9789013, type: 'Bulk Carrier', destination: 'Douala', eta: '2026-08-02T04:00:00Z', source: 'demo' },
  ];

  const timeSeed = Date.now();

  const vessels = base.slice(0, limit).map((v, i) => {
    const angle = (i / base.length) * Math.PI * 2;
    const r = (i % 3 === 0 ? 0.08 : 0.35 + ((i % 7) / 10)) + (Math.sin(timeSeed / 60000 + i) * 0.05);
    const clampedR = Math.max(0.02, Math.min(0.95, r));
    const lat = centerLat + Math.sin(angle) * dLat * clampedR;
    const lon = centerLon + Math.cos(angle) * dLon * clampedR;

    const isAnchored = i % 3 === 0;
    const sog = isAnchored
      ? Number((0.1 + Math.random() * 1.5).toFixed(1))
      : Number((8 + Math.random() * 8).toFixed(1));

    const cog = isAnchored
      ? Math.round(Math.random() * 360)
      : Math.round((Math.atan2(centerLat - lat, centerLon - lon) * 180 / Math.PI + 360) % 360);
    const hdg = Math.round(cog + (Math.random() * 10 - 5));

    return {
      ...v,
      lat: Number(lat.toFixed(5)),
      lon: Number(lon.toFixed(5)),
      sog,
      cog,
      hdg,
      timestamp: now,
    };
  });

  return vessels;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { lat, lon, radiusNm, limit } = parseQuery(url);
    const bounds = buildBounds(lat, lon, radiusNm);

    // Mode demo (source par défaut) — fonctionne sans clé API.
    const vessels = demoVessels(lat, lon, radiusNm, limit);

    return new Response(JSON.stringify({
      center: { lat, lon, radiusNm },
      bounds,
      count: vessels.length,
      source: 'demo',
      updatedAt: new Date().toISOString(),
      vessels,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};
