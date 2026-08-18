import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity,
  Anchor,
  ArrowUpRight,
  ExternalLink,
  Map as MapIcon,
  Navigation,
  RefreshCw,
  Ship,
} from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type Vessel, type VesselResponse, DOUALA, ZONES } from '@/lib/vessels';

export type { Vessel, VesselResponse } from '@/lib/vessels';

// ── Leaflet icons ──
const shipIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ── Map viewport controller ──
function MapController({ selected }: { selected: Vessel | null }) {
  const map = useMap();
  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat, selected.lon], 12, { duration: 0.8 });
    }
  }, [map, selected]);
  return null;
}

function VesselMarker({
  vessel,
  selected,
  onSelect,
}: {
  vessel: Vessel;
  selected: Vessel | null;
  onSelect: (v: Vessel) => void;
}) {
  const isSelected = selected?.mmsi === vessel.mmsi;
  return (
    <Marker
      position={[vessel.lat, vessel.lon]}
      icon={isSelected ? selectedIcon : shipIcon}
      eventHandlers={{
        click: () => onSelect(vessel),
      }}
    >
      <Popup className="font-sans">
        <div className="min-w-[220px] space-y-1">
          <p className="font-semibold text-ink-900">{vessel.name || 'Navire inconnu'}</p>
          <p className="text-xs text-ink-600">MMSI {vessel.mmsi} · {vessel.type || 'Type inconnu'}</p>
          <p className="text-xs text-ink-600">
            <span className="font-medium">Vitesse :</span> {vessel.sog.toFixed(1)} nœuds · <span className="font-medium">Cap :</span> {vessel.cog}°
          </p>
          {vessel.destination && (
            <p className="text-xs text-ink-600">
              <span className="font-medium">Destination :</span> {vessel.destination}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// ── Helpers ──
function relativeEta(iso?: string) {
  if (!iso) return '-';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return iso;
  }
}

function typeBadgeColor(type?: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('container')) return 'bg-blue-100 text-blue-700';
  if (t.includes('cargo') || t.includes('general')) return 'bg-amber-100 text-amber-700';
  if (t.includes('bulk')) return 'bg-stone-100 text-stone-700';
  if (t.includes('fishing')) return 'bg-emerald-100 text-emerald-700';
  if (t.includes('tanker')) return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

// ── Page ──
export default function Maritime() {
  const [data, setData] = useState<VesselResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zone, setZone] = useState('douala');
  const [selected, setSelected] = useState<Vessel | null>(null);
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVessels = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/vessels?zone=${zone}&limit=100`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: VesselResponse = await res.json();
      setData(json);
      setRadius(json.center.radiusNm);
      if (!selected && json.vessels.length) setSelected(json.vessels[0]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Avoid calling setState synchronously inside useEffect by wrapping in a microtask.
    const id = setTimeout(() => fetchVessels(), 0);
    intervalRef.current = setInterval(fetchVessels, 60000);
    return () => {
      clearTimeout(id);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone]);

  const center = useMemo(() => data?.center || ZONES[zone] || DOUALA, [data, zone]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.vessels || [];
    return (data?.vessels || []).filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        String(v.mmsi).includes(q) ||
        (v.type || '').toLowerCase().includes(q) ||
        (v.destination || '').toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-sora text-2xl font-bold text-ink-900">Suivi maritime</h1>
          <p className="text-sm text-ink-600">
            Navires marchands autour de <span className="font-medium">{ZONES[zone]?.label || zone}</span> ·{' '}
            <span className="font-medium">{data?.count ?? 0}</span> navires · source{' '}
            <Badge variant="outline">{data?.source === 'aisstream' ? 'AIS live' : 'Données de démonstration'}</Badge>
            {data?.source === 'demo' && (
              <span className="ml-2 text-xs text-ink-400">(Pas de signal AIS dans cette zone — zone trop restreinte)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchVessels} disabled={loading} className="gap-2">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
            Actualiser
          </Button>
          <Button size="sm" className="gap-2 bg-sand-500 hover:bg-sand-600" asChild>
            <a
              href={`https://www.marinetraffic.com/en/ais/home/centerx:${center.lon}/centery:${center.lat}/zoom:10`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} />
              MarineTraffic
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Erreur lors du chargement : {error}
        </div>
      )}

      <Tabs defaultValue="carte" className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-white">
            <TabsTrigger value="carte" className="gap-2">
              <MapIcon size={16} /> Carte
            </TabsTrigger>
            <TabsTrigger value="liste" className="gap-2">
              <Ship size={16} /> Liste
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="zone" className="text-xs font-medium text-ink-600">
              Zone
            </label>
            <select
              id="zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="h-9 rounded-md border border-border bg-white px-2 text-xs text-ink-900 outline-none focus:border-border-strong"
            >
              {Object.entries(ZONES).map(([key, z]) => (
                <option key={key} value={key}>
                  {z.label}
                </option>
              ))}
            </select>

            <label htmlFor="radius" className="text-xs font-medium text-ink-600">
              Rayon
            </label>
            <Input
              id="radius"
              type="number"
              min={10}
              max={200}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-20 text-xs"
            />
            <span className="text-xs text-ink-400">NM</span>
          </div>
        </div>

        <TabsContent value="carte" className="mt-4">
          <Card className="overflow-hidden border border-border">
            <CardContent className="p-0">
              <div className="h-[560px] w-full">
                <MapContainer
                  center={[center.lat, center.lon]}
                  zoom={zone === 'gulf' ? 7 : 10}
                  scrollWheelZoom
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapController selected={selected} />
                  {filtered.map((v) => (
                    <VesselMarker key={v.mmsi} vessel={v} selected={selected} onSelect={setSelected} />
                  ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          {selected && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-ink-600">
                    <Ship size={16} /> Navire
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="font-sora text-lg font-bold text-ink-900">{selected.name}</p>
                  <p className="text-xs text-ink-600">MMSI {selected.mmsi}</p>
                  {selected.imo && <p className="text-xs text-ink-600">IMO {selected.imo}</p>}
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-ink-600">
                    <Navigation size={16} /> Vitesse / Cap
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="font-sora text-lg font-bold text-ink-900">{selected.sog.toFixed(1)} nœuds</p>
                  <p className="text-xs text-ink-600">Cap {selected.cog}° · HDG {selected.hdg ?? '-'}°</p>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-ink-600">
                    <Anchor size={16} /> Destination
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="font-sora text-lg font-bold text-ink-900">{selected.destination || '-'}</p>
                  <p className="text-xs text-ink-600">ETA {relativeEta(selected.eta)}</p>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-ink-600">
                    <Activity size={16} /> Position
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="font-sora text-lg font-bold text-ink-900">
                    {selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}
                  </p>
                  <p className="text-xs text-ink-600">Mis à jour {relativeEta(data?.updatedAt)}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="liste" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-sora text-lg">Navires détectés</CardTitle>
                <p className="text-xs text-ink-600">Cliquez sur un navire pour le localiser sur la carte.</p>
              </div>
              <Input
                placeholder="Rechercher par nom, MMSI, type ou destination…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-[360px]"
              />
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-subtle text-left text-xs uppercase tracking-wide text-ink-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Navire</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Destination / ETA</th>
                      <th className="px-4 py-3 font-medium">Vitesse</th>
                      <th className="px-4 py-3 font-medium">Position</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
                          Aucun navire trouvé.
                        </td>
                      </tr>
                    )}
                    {filtered.map((v) => (
                      <tr
                        key={v.mmsi}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-subtle',
                          selected?.mmsi === v.mmsi && 'bg-sand-100/40',
                        )}
                        onClick={() => setSelected(v)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Ship size={16} className="text-navy-800" />
                            <div>
                              <p className="font-medium text-ink-900">{v.name}</p>
                              <p className="text-xs text-ink-400">MMSI {v.mmsi}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', typeBadgeColor(v.type))}>
                            {v.type || 'Inconnu'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-ink-900">{v.destination || '-'}</p>
                          <p className="text-xs text-ink-400">{relativeEta(v.eta)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink-900">{v.sog.toFixed(1)} nœuds</p>
                          <p className="text-xs text-ink-400">Cap {v.cog}°</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-600">
                          {v.lat.toFixed(4)}, {v.lon.toFixed(4)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(v);
                            }}
                          >
                            <ArrowUpRight size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
