import * as WebSocket from 'ws';

const WebSocketClient = WebSocket.WebSocket as unknown as typeof WebSocket.WebSocket;
type VercelRequest = import('http').IncomingMessage & { query: Record<string, string | string[]>; };
type VercelResponse = import('http').ServerResponse & { json: (body: unknown) => void; status: (code: number) => VercelResponse; setHeader: (k: string, v: string) => void; end: (data?: string) => void; };

// GeoSentinel-style maritime tracker for SahelTransit
// Endpoint: GET /api/vessels
// Query params: ?lat=4.05&lon=9.70&radiusNm=60&limit=50
//
// If AISSTREAM_API_KEY is configured, we open a short-lived WebSocket
// to AISstream and collect messages for ~2 seconds, then filter by the
// requested bounding box. Otherwise we return realistic demo vessels
// around the Port of Douala so the UI can be tested immediately.

export interface Vessel {
  mmsi: number;
  name: string;
  callsign?: string;
  imo?: number;
  type?: string;
  lat: number;
  lon: number;
  sog: number; // knots
  cog: number; // degrees
  hdg?: number; // degrees
  destination?: string;
  eta?: string;
  timestamp: string;
  source: 'aisstream' | 'demo';
}

interface Bounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

function nmToDegrees(nm: number, lat: number): { dLat: number; dLon: number } {
  // 1 NM = 1/60 degree latitude; longitude correction by cos(lat)
  const dLat = nm / 60;
  const dLon = nm / (60 * Math.cos((lat * Math.PI) / 180));
  return { dLat, dLon };
}

function parseQuery(req: VercelRequest) {
  const predefined: Record<string, { lat: number; lon: number; radiusNm: number }> = {
    douala: { lat: 4.05, lon: 9.7, radiusNm: 60 },
    kribi: { lat: 2.93, lon: 9.91, radiusNm: 60 },
    lagos: { lat: 6.45, lon: 3.4, radiusNm: 80 },
    gulf: { lat: 4.0, lon: 2.0, radiusNm: 200 },
    abidjan: { lat: 5.28, lon: -4.01, radiusNm: 80 },
    lome: { lat: 6.14, lon: 1.27, radiusNm: 80 },
    accra: { lat: 5.62, lon: -0.08, radiusNm: 80 },
  };

  const zone = String(req.query.zone || '').toLowerCase();
  if (zone && predefined[zone]) {
    const z = predefined[zone];
    const limit = Math.min(Number(req.query.limit ?? 100), 200);
    return { lat: z.lat, lon: z.lon, radiusNm: z.radiusNm, limit };
  }

  const lat = Number(req.query.lat ?? 4.05);
  const lon = Number(req.query.lon ?? 9.7);
  const radiusNm = Math.min(Number(req.query.radiusNm ?? 60), 200);
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  return { lat, lon, radiusNm, limit };
}

function buildBounds(lat: number, lon: number, radiusNm: number): Bounds {
  const { dLat, dLon } = nmToDegrees(radiusNm, lat);
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon,
  };
}

function inBounds(v: Vessel, b: Bounds) {
  return v.lat >= b.minLat && v.lat <= b.maxLat && v.lon >= b.minLon && v.lon <= b.maxLon;
}

function demoVessels(centerLat: number, centerLon: number, radiusNm: number, limit: number): Vessel[] {
  // Realistic demo fleet for the West/Central Africa shipping corridor.
  // Used as fallback when AISstream has no terrestrial coverage in the area.
  const { dLat, dLon } = nmToDegrees(radiusNm, centerLat);
  const now = new Date().toISOString();

  const base: Omit<Vessel, 'lat' | 'lon' | 'sog' | 'cog' | 'hdg' | 'timestamp'>[] = [
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

  // Pseudo-random but deterministic jitter based on time so vessels appear to move.
  const timeSeed = Date.now();

  const vessels: Vessel[] = base.slice(0, limit).map((v, i) => {
    const angle = ((i / base.length) * Math.PI * 2);
    // Some vessels close to center (anchored/port), others further out (transit).
    const r = (i % 3 === 0 ? 0.08 : 0.35 + ((i % 7) / 10)) + (Math.sin(timeSeed / 60000 + i) * 0.05);
    const clampedR = Math.max(0.02, Math.min(0.95, r));
    const lat = centerLat + Math.sin(angle) * dLat * clampedR;
    const lon = centerLon + Math.cos(angle) * dLon * clampedR;

    // Speed: anchored ~0.1-2 kn, transit ~8-16 kn
    const isAnchored = i % 3 === 0;
    const sog = isAnchored
      ? Number((0.1 + Math.random() * 1.5).toFixed(1))
      : Number((8 + Math.random() * 8).toFixed(1));

    // Course roughly toward center if in transit, random if anchored
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

async function aisstreamVessels(bounds: Bounds, limit: number): Promise<Vessel[]> {
  const key = process.env.AISSTREAM_API_KEY;
  if (!key) {
    console.log('[AISstream] no API key configured');
    return [];
  }

  return new Promise((resolve) => {
    let resolved = false;
    const vessels = new Map<number, Vessel>();

    console.log('[AISstream] connecting with key', key.slice(0, 6) + '...');
    const ws = new WebSocketClient('wss://stream.aisstream.io/v0/stream');
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { ws.close(); } catch { /* ignore */ }
        console.log(`[AISstream] timeout. collected ${vessels.size} vessels`);
        resolve(Array.from(vessels.values()).slice(0, limit));
      }
    }, 5500);

    ws.onopen = () => {
      console.log('[AISstream] websocket open, subscribing to bbox');
      ws.send(JSON.stringify({
        APIKey: key,
        BoundingBoxes: [[[bounds.minLat, bounds.minLon], [bounds.maxLat, bounds.maxLon]]],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        console.log('[AISstream] msg type', Object.keys(data?.Message || {}).join(','));
        if (data?.Message?.PositionReport || data?.Message?.ShipStaticData || data?.Message?.StandardClassBPositionReport) {
          const meta = data.MetaData || {};
          const mmsi = meta.MMSI || data.Message?.PositionReport?.UserID || data.Message?.ShipStaticData?.UserID;
          if (!mmsi) return;

          const existing = vessels.get(mmsi) || {
            mmsi,
            name: meta.ShipName?.trim() || 'Unknown',
            callsign: meta.callsign?.trim() || undefined,
            imo: meta.imo || undefined,
            type: meta.type || undefined,
            lat: 0,
            lon: 0,
            sog: 0,
            cog: 0,
            hdg: undefined,
            destination: undefined,
            eta: undefined,
            timestamp: new Date().toISOString(),
            source: 'aisstream' as const,
          };

          const pr = data.Message?.PositionReport || data.Message?.StandardClassBPositionReport;
          if (pr) {
            existing.lat = pr.Latitude;
            existing.lon = pr.Longitude;
            existing.sog = Number((pr.Sog || 0).toFixed(1));
            existing.cog = Math.round(pr.Cog || 0);
            existing.hdg = pr.TrueHeading ?? existing.hdg;
          }

          const ssd = data.Message?.ShipStaticData;
          if (ssd) {
            if (ssd.Name) existing.name = ssd.Name.trim();
            if (ssd.Destination) existing.destination = ssd.Destination.trim();
            if (ssd.Eta) {
              const { Month, Day, Hour, Minute } = ssd.Eta;
              const now = new Date();
              const year = now.getUTCFullYear() + (Month < now.getUTCMonth() + 1 ? 1 : 0);
              existing.eta = new Date(Date.UTC(year, Month - 1, Day, Hour, Minute)).toISOString();
            }
            if (ssd.Type) existing.type = ssd.Type;
          }

          vessels.set(mmsi, existing);
        }
      } catch (err) {
        console.log('[AISstream] parse error', String(err));
      }
    };

    ws.onerror = (err) => {
      console.log('[AISstream] websocket error', String(err));
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve([]);
      }
    };

    ws.onclose = () => {
      console.log('[AISstream] websocket close');
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(Array.from(vessels.values()).slice(0, limit));
      }
    };
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { lat, lon, radiusNm, limit } = parseQuery(req);
  const bounds = buildBounds(lat, lon, radiusNm);

  try {
    let vessels: Vessel[] = [];
    const real = await aisstreamVessels(bounds, limit);
    if (real.length) {
      vessels = real.filter((v) => inBounds(v, bounds)).slice(0, limit);
    }
    if (!vessels.length) {
      vessels = demoVessels(lat, lon, radiusNm, limit);
    }

    res.status(200).json({
      center: { lat, lon, radiusNm },
      bounds,
      count: vessels.length,
      source: vessels[0]?.source === 'aisstream' ? 'aisstream' : 'demo',
      updatedAt: new Date().toISOString(),
      vessels,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error', message: String(err) });
  }
}
