export interface Vessel {
  mmsi: number;
  name: string;
  callsign?: string;
  imo?: number;
  type?: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  hdg?: number;
  destination?: string;
  eta?: string;
  timestamp: string;
  source: 'aisstream' | 'demo';
}

export interface VesselResponse {
  center: { lat: number; lon: number; radiusNm: number };
  count: number;
  source: 'aisstream' | 'demo';
  updatedAt: string;
  zone?: string;
  vessels: Vessel[];
}

export const DOUALA = { lat: 4.05, lon: 9.7 };

export const ZONES: Record<string, { lat: number; lon: number; radiusNm: number; label: string }> = {
  douala: { lat: 4.05, lon: 9.7, radiusNm: 60, label: 'Douala' },
  kribi: { lat: 2.93, lon: 9.91, radiusNm: 60, label: 'Kribi' },
  lagos: { lat: 6.45, lon: 3.4, radiusNm: 80, label: 'Lagos' },
  gulf: { lat: 4.0, lon: 2.0, radiusNm: 200, label: 'Golfe de Guinée' },
  abidjan: { lat: 5.28, lon: -4.01, radiusNm: 80, label: 'Abidjan' },
  lome: { lat: 6.14, lon: 1.27, radiusNm: 80, label: 'Lomé' },
  accra: { lat: 5.62, lon: -0.08, radiusNm: 80, label: 'Accra' },
};

export function typeBadgeColor(type?: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('container')) return 'bg-blue-100 text-blue-700';
  if (t.includes('cargo') || t.includes('general')) return 'bg-amber-100 text-amber-700';
  if (t.includes('bulk')) return 'bg-stone-100 text-stone-700';
  if (t.includes('fishing')) return 'bg-emerald-100 text-emerald-700';
  if (t.includes('tanker')) return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}
