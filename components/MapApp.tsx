'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { SPECIES, OBS_TYPES, SOURCES, COUNTIES, TILE_LAYERS, timeAgo, distKm } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { Sighting } from '@/lib/supabase';

// Extend L for heat layer typing
declare module 'leaflet' {
  function heatLayer(latlngs: any[], options?: any): any;
}

export default function MapApp() {
  const mapRef = useRef<L.Map | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatRef = useRef<any>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const reportMarkerRef = useRef<L.CircleMarker | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [filtered, setFiltered] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [speciesFilter, setSpeciesFilter] = useState<Set<string>>(new Set(['wolf','lynx','bear','eagle','wolverine']));
  const [obsFilter, setObsFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set(['official','club','crowd','skandobs']));
  const [hoursFilter, setHoursFilter] = useState(168); // 7 days default
  const [countyFilter, setCountyFilter] = useState('all');
  const [customDates, setCustomDates] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [listSort, setListSort] = useState<'time'|'dist'>('time');
  const [reporting, setReporting] = useState(false);
  const [reportLL, setReportLL] = useState<{lat:number;lng:number}|null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cms, setCms] = useState<Record<string,string>>({});
  const [heatOn, setHeatOn] = useState(false);
  const [clusterOn, setClusterOn] = useState(true);
  const [userLL, setUserLL] = useState<{lat:number;lng:number}|null>(null);
  const [tileKey, setTileKey] = useState<keyof typeof TILE_LAYERS>('dark');
  const [toast, setToast] = useState('');

  // Password gate
  const [unlocked, setUnlocked] = useState(false);
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState(false);

  // Check if already unlocked on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage.getItem('rr_unlocked') === '1') {
        setUnlocked(true);
      }
    } catch {}
  }, []);

  const tryUnlock = () => {
    if (gatePassword === 'sakerhetforalla') {
      setUnlocked(true);
      setGateError(false);
      try { window.sessionStorage.setItem('rr_unlocked', '1'); } catch {}
    } else {
      setGateError(true);
    }
  };

  // Report form state
  const [rptSpecies, setRptSpecies] = useState('');
  const [rptObs, setRptObs] = useState('visual');
  const [rptSource, setRptSource] = useState('crowd');
  const [rptCount, setRptCount] = useState(1);
  const [rptTime, setRptTime] = useState('');
  const [rptNotes, setRptNotes] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  // Fetch CMS content for About page - directly from Supabase
  const openAbout = useCallback(async () => {
    setAboutOpen(true);
    try {
      const { data, error } = await supabase.from('page_content').select('key, value');
      if (!error && data) {
        const content: Record<string, string> = {};
        data.forEach((row: { key: string; value: string }) => { content[row.key] = row.value; });
        setCms(content);
      }
    } catch {}
  }, []);

  // Fetch sightings from API
  const fetchSightings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (!customDates && hoursFilter) params.set('hours', String(hoursFilter));
      if (customDates && dateFrom) params.set('date_from', dateFrom);
      if (customDates && dateTo) params.set('date_to', dateTo);
      if (countyFilter !== 'all') params.set('county', countyFilter);

      const res = await fetch(`/api/sightings?${params}`);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setSightings(data);
    } catch (err) {
      console.error('Failed to fetch sightings:', err);
    } finally {
      setLoading(false);
    }
  }, [hoursFilter, customDates, dateFrom, dateTo, countyFilter]);

  // Apply client-side filters
  useEffect(() => {
    let f = sightings.filter(s =>
      speciesFilter.has(s.predator_type) &&
      sourceFilter.has(s.source) &&
      (obsFilter === 'all' || s.observation_type === obsFilter)
    );
    setFiltered(f);
  }, [sightings, speciesFilter, sourceFilter, obsFilter]);

  // Init map
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { center: [63, 16], zoom: 5, zoomControl: false, attributionControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    tileRef.current = L.tileLayer(TILE_LAYERS.dark.url, { maxZoom: TILE_LAYERS.dark.maxZoom }).addTo(map);
    clusterRef.current = (L as any).markerClusterGroup({ maxClusterRadius: 50 });
    map.addLayer(clusterRef.current!);
    mapRef.current = map;

    // Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLL(ll);
        map.setView([ll.lat, ll.lng], 9);
        userMarkerRef.current = L.circleMarker([ll.lat, ll.lng], {
          radius: 7, fillColor: '#4ade80', fillOpacity: 0.9, color: '#fff', weight: 2,
        }).addTo(map);
      }, () => {});
    }

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Fetch on filter changes
  useEffect(() => { fetchSightings(); }, [fetchSightings]);

  // Render markers
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;

    cluster.clearLayers();
    if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null; }

    filtered.forEach(s => {
      const cfg = SPECIES[s.predator_type];
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${cfg.color};border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;position:relative">${cfg.emoji}${s.verified ? '<div style="position:absolute;bottom:-3px;right:-4px;width:11px;height:11px;border-radius:50%;background:#2D5016;border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:6px;color:#fff">✓</div>' : ''}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const m = L.marker([s.latitude, s.longitude], { icon });
      const ago = timeAgo(s.sighted_at);
      const obsLabel = OBS_TYPES[s.observation_type] || s.observation_type;
      const srcLabel = SOURCES[s.source] || s.source;

      m.bindPopup(`
        <div style="font-weight:700;font-size:.85rem;color:${cfg.color};margin-bottom:4px">${cfg.emoji} ${cfg.name}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px">
          ${s.verified ? '<span style="font-size:.5rem;font-weight:700;padding:1px 5px;border-radius:3px;background:rgba(45,80,22,.2);color:#2D5016">Verifierad</span>' : ''}
          <span style="font-size:.5rem;font-weight:700;padding:1px 5px;border-radius:3px;background:rgba(212,168,67,.1);color:#D4A843">${obsLabel}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.65rem;padding:2px 0;color:#999"><span>Källa</span><strong style="color:#e8e8e8">${srcLabel}</strong></div>
        <div style="display:flex;justify-content:space-between;font-size:.65rem;padding:2px 0;color:#999"><span>Antal</span><strong style="color:#e8e8e8">${s.count} djur</strong></div>
        <div style="display:flex;justify-content:space-between;font-size:.65rem;padding:2px 0;color:#999"><span>Tid</span><strong style="color:#e8e8e8">${ago}</strong></div>
        ${s.notes ? `<div style="color:#666;font-size:.65rem;margin-top:6px;font-style:italic;padding-top:6px;border-top:1px solid rgba(255,255,255,.07)">"${s.notes}"</div>` : ''}
      `, { maxWidth: 250 });

      cluster.addLayer(m);
    });

    if (heatOn) {
      heatRef.current = (L as any).heatLayer(
        filtered.map(s => [s.latitude, s.longitude, 0.6]),
        { radius: 25, blur: 20, maxZoom: 8 }
      );
      heatRef.current.addTo(map);
    }
  }, [filtered, heatOn]);

  // Switch tile layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const cfg = TILE_LAYERS[tileKey];
    tileRef.current = L.tileLayer(cfg.url, { maxZoom: cfg.maxZoom }).addTo(map);
  }, [tileKey]);

  // Map click for reporting
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => {
      if (!reporting) return;
      setReportLL({ lat: e.latlng.lat, lng: e.latlng.lng });
      if (reportMarkerRef.current) map.removeLayer(reportMarkerRef.current);
      reportMarkerRef.current = L.circleMarker(e.latlng, {
        radius: 10, fillColor: '#D4A843', fillOpacity: 0.9, color: '#fff', weight: 2.5,
      }).addTo(map);
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [reporting]);

  // Submit report
  const submitReport = async () => {
    if (!rptSpecies) { showToast('Välj art'); return; }
    const ll = reportLL || userLL;
    if (!ll) { showToast('Markera plats på kartan'); return; }

    try {
      const res = await fetch('/api/sightings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predator_type: rptSpecies,
          observation_type: rptObs,
          source: rptSource,
          latitude: ll.lat,
          longitude: ll.lng,
          sighted_at: rptTime || new Date().toISOString(),
          count: rptCount,
          notes: rptNotes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Något gick fel');
        return;
      }

      setReporting(false);
      setReportLL(null);
      setRptSpecies('');
      setRptNotes('');
      if (reportMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(reportMarkerRef.current);
        reportMarkerRef.current = null;
      }
      fetchSightings();
      showToast('✓ Rapport skickad!');
    } catch {
      showToast('Nätverksfel, försök igen');
    }
  };

  // Start reporting
  const openReport = () => {
    setReporting(true);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setRptTime(now.toISOString().slice(0, 16));
  };

  // Toggle species filter
  const toggleSpecies = (sp: string) => {
    setSpeciesFilter(prev => {
      const next = new Set(prev);
      if (next.has(sp)) next.delete(sp); else next.add(sp);
      return next;
    });
  };

  const toggleSource = (src: string) => {
    setSourceFilter(prev => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src); else next.add(src);
      return next;
    });
  };

  // Nearby status
  const nearby = userLL ? filtered.filter(s => distKm(userLL.lat, userLL.lng, s.latitude, s.longitude) < 20) : [];
  const nearbyCount = nearby.length;

  // Sorted list
  const sortedList = [...filtered].sort((a, b) => {
    if (listSort === 'dist' && userLL) {
      return distKm(userLL.lat, userLL.lng, a.latitude, a.longitude) - distKm(userLL.lat, userLL.lng, b.latitude, b.longitude);
    }
    return new Date(b.sighted_at).getTime() - new Date(a.sighted_at).getTime();
  }).slice(0, 50);

  // Species counts
  const speciesCounts = Object.fromEntries(
    Object.keys(SPECIES).map(k => [k, filtered.filter(s => s.predator_type === k).length])
  );

  return (
    <div className={`h-full ${reporting ? 'reporting' : ''}`}>
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-[rgba(15,15,15,.95)] backdrop-blur-2xl border-b border-white/[.07] h-12 flex items-center px-3 gap-2" style={{ transition: 'left .25s' }}>
        <button onClick={() => pinned ? setPinned(false) : setSidebarOpen(!sidebarOpen)} className="w-8 h-8 flex flex-col items-center justify-center gap-1 rounded-md">
          <span className="block w-4 h-[1.5px] bg-white rounded" />
          <span className="block w-4 h-[1.5px] bg-white rounded" />
          <span className="block w-4 h-[1.5px] bg-white rounded" />
        </button>
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 40 40" fill="#D4A843" className="w-[18px] h-[18px]"><ellipse cx="12" cy="10" rx="4" ry="4.5"/><ellipse cx="24" cy="8" rx="3.5" ry="4"/><ellipse cx="33" cy="13" rx="3" ry="3.5"/><ellipse cx="5" cy="17" rx="3" ry="3.5"/><path d="M7 25 Q10 35 20 37 Q30 35 33 25 Q30 20 20 19 Q10 20 7 25Z"/></svg>
          <span className="font-extrabold text-[.7rem] tracking-[2px] text-white">ROVDJURSRADAR</span>
        </div>
        <div className="flex-1" />
        <button onClick={() => setListOpen(!listOpen)} className="px-3 py-1 rounded-md text-[.65rem] font-semibold border border-white/[.12] text-[#999] hover:bg-white/[.04]">Lista</button>
        <button onClick={() => openAbout()} className="px-3 py-1 rounded-md text-[.65rem] font-semibold border border-white/[.12] text-[#999] hover:bg-white/[.04]">Om</button>
        <button onClick={() => showToast('Swish: 123-456 78 90')} className="px-3 py-1 rounded-md text-[.65rem] font-semibold border border-[rgba(212,168,67,.25)] text-[#D4A843]">Stöd</button>
      </nav>

      {/* REPORT BANNER */}
      {reporting && (
        <div className="fixed top-12 left-0 right-0 z-[955] bg-[rgba(212,168,67,.12)] border-b border-[rgba(212,168,67,.25)] px-4 py-1.5 flex items-center gap-2 text-[.7rem] text-[#D4A843] backdrop-blur-lg">
          <span className="w-2 h-2 rounded-full bg-[#D4A843] animate-pulse" />
          <span>Klicka på kartan för att markera plats</span>
          <button onClick={() => { setReporting(false); setReportLL(null); }} className="ml-auto px-2.5 py-0.5 rounded bg-white/[.08] border border-white/[.12] text-[#999] text-[.6rem] font-semibold">Avbryt</button>
        </div>
      )}

      {/* SIDEBAR BACKDROP */}
      {sidebarOpen && !pinned && <div className="fixed inset-0 z-[998] bg-black/50" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`fixed top-12 left-0 bottom-0 w-80 z-[999] bg-[#161616] border-r border-white/[.07] overflow-y-auto transition-transform duration-300 ${sidebarOpen || pinned ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Species */}
        <div className="p-3 border-b border-white/[.07]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666]">Arter</span>
            <div className="flex gap-1.5 items-center">
              <button onClick={() => {
                const allOn = speciesFilter.size === 5;
                setSpeciesFilter(allOn ? new Set() : new Set(['wolf','lynx','bear','eagle','wolverine']));
              }} className="text-[.6rem] text-[#D4A843] bg-transparent border-none cursor-pointer">Alla/Inga</button>
              <button onClick={() => { setPinned(!pinned); setSidebarOpen(true); setTimeout(() => mapRef.current?.invalidateSize(), 300); }}
                className={`hidden lg:flex w-[26px] h-[26px] rounded items-center justify-center border transition-all ${pinned ? 'border-[#D4A843] bg-[rgba(212,168,67,.1)] text-[#D4A843]' : 'border-white/[.12] text-[#666]'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`w-3 h-3 transition-transform ${pinned ? 'rotate-45' : ''}`}><path d="M12 17v5"/><path d="M9 2h6l-1 7h3l-4 7H9l1-7H7z"/></svg>
              </button>
            </div>
          </div>
          {Object.entries(SPECIES).map(([key, sp]) => (
            <label key={key} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-white/[.04] text-[.75rem] text-[#999]">
              <input type="checkbox" checked={speciesFilter.has(key)} onChange={() => toggleSpecies(key)} className="hidden" />
              <span className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center text-[8px] transition-all ${speciesFilter.has(key) ? 'border-[#D4A843] bg-[rgba(212,168,67,.15)] text-[#D4A843]' : 'border-white/[.12] text-transparent'}`}>✓</span>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sp.color }} />
              <span className="flex-1">{sp.name}</span>
              <span className="text-[.6rem] text-[#666] tabular-nums">{speciesCounts[key] || 0}</span>
            </label>
          ))}
        </div>

        {/* Observation types */}
        <div className="p-3 border-b border-white/[.07]">
          <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">Observationstyp</span>
          <div className="flex flex-wrap gap-1">
            {['all', ...Object.keys(OBS_TYPES)].map(key => (
              <button key={key} onClick={() => setObsFilter(key)}
                className={`px-2 py-1 rounded text-[.6rem] font-semibold border transition-all ${obsFilter === key ? 'border-[#D4A843] text-[#D4A843] bg-[rgba(212,168,67,.06)]' : 'border-white/[.12] text-[#666]'}`}>
                {key === 'all' ? 'Alla' : OBS_TYPES[key as keyof typeof OBS_TYPES]}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="p-3 border-b border-white/[.07]">
          <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">Tidsperiod</span>
          <div className="flex flex-wrap gap-1">
            {[{h:24,l:'24h'},{h:72,l:'3d'},{h:168,l:'7d'},{h:720,l:'30d'},{h:8760,l:'1 år'}].map(({h,l}) => (
              <button key={h} onClick={() => { setHoursFilter(h); setCustomDates(false); }}
                className={`px-2 py-1 rounded text-[.6rem] font-medium transition-all ${!customDates && hoursFilter === h ? 'bg-[#2D5016] text-white' : 'bg-white/[.04] text-[#666]'}`}>{l}</button>
            ))}
            <button onClick={() => setCustomDates(true)}
              className={`px-2 py-1 rounded text-[.6rem] font-medium transition-all ${customDates ? 'bg-[#2D5016] text-white' : 'bg-white/[.04] text-[#666]'}`}>Datum</button>
          </div>
          {customDates && (
            <div className="flex gap-1.5 mt-1.5">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 px-1.5 py-1 rounded border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.65rem]" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 px-1.5 py-1 rounded border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.65rem]" />
            </div>
          )}
        </div>

        {/* County */}
        <div className="p-3 border-b border-white/[.07]">
          <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">Län</span>
          <select value={countyFilter} onChange={e => { setCountyFilter(e.target.value); if (e.target.value !== 'all' && COUNTIES[e.target.value]) { const c = COUNTIES[e.target.value]; mapRef.current?.fitBounds([[c.bounds[0],c.bounds[1]],[c.bounds[2],c.bounds[3]]]); }}}
            className="w-full px-2 py-1.5 rounded border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.72rem]">
            <option value="all">Hela Sverige</option>
            {Object.entries(COUNTIES).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
        </div>

        {/* Data sources */}
        <div className="p-3 border-b border-white/[.07]">
          <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">Datakällor</span>
          {Object.entries(SOURCES).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-white/[.04] text-[.75rem] text-[#999]">
              <input type="checkbox" checked={sourceFilter.has(key)} onChange={() => toggleSource(key)} className="hidden" />
              <span className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center text-[8px] transition-all ${sourceFilter.has(key) ? 'border-[#D4A843] bg-[rgba(212,168,67,.15)] text-[#D4A843]' : 'border-white/[.12] text-transparent'}`}>✓</span>
              <span className="flex-1">{label}</span>
            </label>
          ))}
        </div>

        {/* Map layers */}
        <div className="p-3 border-b border-white/[.07]">
          <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">Kartlager</span>
          <div className="grid grid-cols-2 gap-1">
            {(Object.entries(TILE_LAYERS) as [keyof typeof TILE_LAYERS, typeof TILE_LAYERS[keyof typeof TILE_LAYERS]][]).map(([key, cfg]) => (
              <button key={key} onClick={() => setTileKey(key)}
                className={`rounded-md overflow-hidden border-[1.5px] transition-all ${tileKey === key ? 'border-[#D4A843]' : 'border-transparent'}`}>
                <div className="h-10 flex items-center justify-center text-[.5rem] text-[#666] tracking-widest uppercase" style={{ background: key === 'dark' ? '#1a1a2e' : key === 'topo' ? '#ddd8c4' : key === 'terrain' ? '#c5d5a5' : '#2a3a2a' }}>{cfg.name}</div>
                <div className={`px-1.5 py-0.5 text-[.58rem] font-semibold bg-[#1e1e1e] ${tileKey === key ? 'text-[#D4A843]' : 'text-[#666]'}`}>{cfg.name}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between py-1">
              <span className="text-[.72rem] text-[#999]">Heatmap</span>
              <button onClick={() => setHeatOn(!heatOn)} className={`w-8 h-[18px] rounded-full relative transition-colors border ${heatOn ? 'bg-[#2D5016] border-[#2D5016]' : 'bg-[#282828] border-white/[.12]'}`}>
                <span className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white transition-transform ${heatOn ? 'translate-x-[14px]' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Partners */}
        <div className="p-3 border-b border-white/[.07]">
          <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">Partners</span>
          {[
            { logo: 'JF', name: 'Jägarförbundet', desc: 'Sveriges jaktorganisation', badge: 'Partner' },
            { logo: 'LS', name: 'Länsstyrelsen Värmland', desc: 'Regionalt rovdjursdata', badge: 'Data' },
            { logo: 'STF', name: 'Turistföreningen', desc: 'Säkerhet på leden', badge: 'Partner' },
          ].map((p, i) => (
            <div key={i} className="bg-[#1e1e1e] rounded-lg p-2 flex items-center gap-2 mb-1 border border-white/[.07] cursor-pointer hover:bg-[#282828]">
              <div className="w-8 h-8 rounded-md bg-[#282828] flex items-center justify-center text-[.55rem] font-bold text-[#D4A843] flex-shrink-0">{p.logo}</div>
              <div className="flex-1 min-w-0"><div className="text-[.7rem] font-semibold text-[#e8e8e8] truncate">{p.name}</div><div className="text-[.55rem] text-[#666]">{p.desc}</div></div>
              <span className="text-[.48rem] font-bold px-1.5 py-0.5 rounded bg-[rgba(45,80,22,.2)] text-[#2D5016] uppercase tracking-wider flex-shrink-0">{p.badge}</span>
            </div>
          ))}
        </div>

        <div className="p-3">
          <div className="text-[.6rem] text-[#666] leading-relaxed">
            Rovdjursradar samlar officiella data, jaktlagsrapporter och crowdsourcade observationer. <span className="text-[#D4A843]">rovdjursradar.se</span> · v1.0
            <a href="/integritetspolicy" className="block mt-2 text-[#666] hover:text-[#D4A843]" style={{textDecoration:'none',fontSize:'.58rem'}}>Integritetspolicy</a>
          </div>
        </div>
      </aside>

      {/* MAP */}
      <div ref={mapEl} className="fixed top-12 left-0 right-0 bottom-0 z-[1]" style={{ cursor: reporting ? 'crosshair' : undefined, transition: 'left .25s', left: pinned ? '320px' : 0 }} />

      {/* NEARBY STATUS */}
      {userLL && (
        <div className="fixed top-14 right-3 z-[900] bg-[rgba(15,15,15,.92)] backdrop-blur-xl border border-white/[.12] rounded-lg px-3 py-1.5 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${nearbyCount === 0 ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,.4)]' : nearbyCount <= 2 ? 'bg-[#D4A843] shadow-[0_0_6px_rgba(212,168,67,.4)]' : 'bg-[#B83230] shadow-[0_0_6px_rgba(184,50,48,.4)]'}`} />
          <span className="text-[.65rem] text-[#e8e8e8]">
            {nearbyCount === 0 ? 'Inga obs inom 20 km ✓' : `${nearbyCount} obs inom 20 km`}
          </span>
        </div>
      )}

      {/* STATS */}
      <div className="fixed bottom-12 left-3 z-[900] flex gap-1.5" style={{ transition: 'left .25s', left: pinned ? 'calc(320px + 12px)' : 12 }}>
        <div className="bg-[rgba(15,15,15,.9)] backdrop-blur border border-white/[.07] rounded-lg px-2.5 py-1 text-[.55rem] text-[#666]">
          <strong className="text-[#D4A843] text-[.75rem] font-bold block">{filtered.length}</strong>obs
        </div>
        <div className="bg-[rgba(15,15,15,.9)] backdrop-blur border border-white/[.07] rounded-lg px-2.5 py-1 text-[.55rem] text-[#666]">
          <strong className="text-[#D4A843] text-[.75rem] font-bold block">{sightings.filter(s => new Date(s.sighted_at).getTime() > Date.now() - 86400000).length}</strong>24h
        </div>
      </div>

      {/* LOCATE BUTTON */}
      <button onClick={() => {
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => {
          const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLL(ll);
          mapRef.current?.setView([ll.lat, ll.lng], 10);
          if (userMarkerRef.current && mapRef.current) mapRef.current.removeLayer(userMarkerRef.current);
          userMarkerRef.current = L.circleMarker([ll.lat, ll.lng], { radius: 7, fillColor: '#4ade80', fillOpacity: 0.9, color: '#fff', weight: 2 }).addTo(mapRef.current!);
        });
      }} className="fixed bottom-[108px] right-3 z-[950] w-9 h-9 rounded-full bg-[#161616] border border-white/[.12] text-white flex items-center justify-center hover:bg-[#1e1e1e]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
      </button>

      {/* FAB */}
      {!reporting && (
        <button onClick={openReport} className="fixed bottom-14 right-3 z-[950] w-11 h-11 rounded-full bg-[#2D5016] text-white text-xl font-bold flex items-center justify-center shadow-lg hover:bg-[#3a6b1e] hover:scale-105 transition-all">+</button>
      )}

      {/* REPORT DRAWER */}
      <div className={`fixed top-12 right-0 bottom-0 w-[340px] z-[960] bg-[#161616] border-l border-white/[.07] transition-transform overflow-y-auto ${reporting ? 'translate-x-0' : 'translate-x-full'} max-md:w-full max-md:top-auto max-md:bottom-0 max-md:max-h-[55vh] max-md:border-l-0 max-md:border-t max-md:border-white/[.07] max-md:rounded-t-xl ${reporting ? 'max-md:translate-y-0' : 'max-md:translate-y-full'}`}>
        <div className="flex items-center justify-between px-3.5 pt-3">
          <h2 className="text-[.9rem] font-bold">Rapportera observation</h2>
          <button onClick={() => { setReporting(false); setReportLL(null); }} className="w-6 h-6 rounded-full bg-white/[.06] text-white flex items-center justify-center text-sm">×</button>
        </div>
        <div className="p-3.5 pt-2">
          {/* Location status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg mb-2.5 text-[.65rem] border ${reportLL ? 'border-green-500/30 bg-green-500/[.04]' : 'border-white/[.12] bg-[#1e1e1e]'}`}>
            <span className={`w-2 h-2 rounded-full ${reportLL ? 'bg-green-400' : 'bg-[#666]'}`} />
            <span>{reportLL ? `Plats: ${reportLL.lat.toFixed(3)}, ${reportLL.lng.toFixed(3)}` : 'Klicka på kartan för att markera plats'}</span>
          </div>

          <div className="mb-3">
            <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">Art</label>
            <div className="grid grid-cols-5 gap-1">
              {Object.entries(SPECIES).map(([key, sp]) => (
                <button key={key} onClick={() => setRptSpecies(key)}
                  className={`py-2 rounded-lg border text-center text-[.55rem] font-semibold transition-all ${rptSpecies === key ? 'border-[#D4A843] text-white bg-[rgba(212,168,67,.06)]' : 'border-white/[.12] text-[#666]'}`}>
                  <span className="text-lg block mb-0.5">{sp.emoji}</span>{sp.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">Typ</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(OBS_TYPES).map(([key, label]) => (
                <button key={key} onClick={() => setRptObs(key)}
                  className={`px-2 py-1 rounded text-[.6rem] font-semibold border transition-all ${rptObs === key ? 'border-[#D4A843] text-[#D4A843] bg-[rgba(212,168,67,.06)]' : 'border-white/[.12] text-[#666]'}`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">Källa</label>
            <select value={rptSource} onChange={e => setRptSource(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.75rem]">
              <option value="crowd">Egen observation</option>
              <option value="club">Jaktlag</option>
              <option value="official">Officiell</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">Antal</label>
              <input type="number" min={1} max={50} value={rptCount} onChange={e => setRptCount(Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.75rem]" />
            </div>
            <div>
              <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">Tidpunkt</label>
              <input type="datetime-local" value={rptTime} onChange={e => setRptTime(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.65rem]" />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">Anteckning</label>
            <textarea value={rptNotes} onChange={e => setRptNotes(e.target.value)} placeholder="Spår, riktning, beteende..." className="w-full px-2 py-1.5 rounded-lg border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.75rem] resize-y min-h-[48px]" />
          </div>

          <button onClick={submitReport} className="w-full py-2.5 rounded-lg bg-[#2D5016] text-white font-bold text-[.82rem] hover:bg-[#3a6b1e]">Skicka rapport</button>
        </div>
      </div>

      {/* LIST PANEL */}
      <div className={`fixed bottom-0 left-0 right-0 z-[950] bg-[#161616] border-t border-white/[.07] rounded-t-xl max-h-[45vh] transition-transform ${listOpen ? 'translate-y-0' : 'translate-y-[calc(100%-40px)]'} md:left-auto md:right-0 md:w-[380px] md:top-12 md:bottom-0 md:max-h-none md:rounded-none md:border-t-0 md:border-l md:border-white/[.07] ${listOpen ? 'md:translate-x-0' : 'md:translate-x-full'} flex flex-col overflow-hidden`} style={{ left: pinned ? '320px' : undefined }}>
        <div className="p-2 text-center cursor-pointer md:hidden" onClick={() => setListOpen(!listOpen)}>
          <div className="w-9 h-1 rounded-full bg-[#282828] mx-auto" />
        </div>
        <div className="flex items-center gap-2 px-3 pb-2">
          <span className="text-[.72rem] font-semibold">Observationer</span>
          <span className="text-[.6rem] text-[#666] bg-[#282828] px-1.5 py-0.5 rounded">{filtered.length}</span>
          <div className="ml-auto flex gap-0.5">
            <button onClick={() => setListSort('time')} className={`px-2 py-0.5 rounded text-[.58rem] font-semibold ${listSort === 'time' ? 'bg-[#282828] text-white' : 'text-[#666]'}`}>Senaste</button>
            <button onClick={() => setListSort('dist')} className={`px-2 py-0.5 rounded text-[.58rem] font-semibold ${listSort === 'dist' ? 'bg-[#282828] text-white' : 'text-[#666]'}`}>Närmaste</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-2 pb-2">
          {sortedList.map(s => {
            const sp = SPECIES[s.predator_type];
            const d = userLL ? Math.round(distKm(userLL.lat, userLL.lng, s.latitude, s.longitude)) : null;
            return (
              <div key={s.id} onClick={() => mapRef.current?.setView([s.latitude, s.longitude], 12)} className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-white/[.03] border-b border-white/[.07] last:border-b-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2" style={{ background: sp.color + '22', borderColor: sp.color }}>{sp.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[.75rem] font-semibold flex items-center gap-1.5">
                    {sp.name}
                    <span className={`text-[.5rem] font-bold px-1 py-px rounded ${s.verified ? 'bg-[rgba(45,80,22,.2)] text-[#2D5016]' : 'bg-[rgba(212,168,67,.1)] text-[#D4A843]'}`}>
                      {s.verified ? 'Verifierad' : OBS_TYPES[s.observation_type]}
                    </span>
                  </div>
                  <div className="text-[.6rem] text-[#666] flex gap-2 mt-0.5">
                    <span>{timeAgo(s.sighted_at)}</span>
                    <span>{SOURCES[s.source]}</span>
                    <span>{s.count} djur</span>
                  </div>
                </div>
                {d !== null && <div className="text-[.6rem] text-[#666] flex-shrink-0">{d} km</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ABOUT PAGE */}
      {aboutOpen && (
        <div className="about-overlay" onClick={() => setAboutOpen(false)}>
          <div className="about-card" onClick={e => e.stopPropagation()}>
            <div className="about-card-header">
              <button onClick={() => setAboutOpen(false)} style={{position:'absolute',top:12,right:12,width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,.1)',border:0,color:'#fff',fontSize:'1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
              <h1 style={{fontSize:'1.6rem',fontWeight:800,color:'#fff',letterSpacing:2}}>ROVDJURSRADAR</h1>
              <p style={{color:'#D4A843',fontSize:'.85rem',marginTop:4}}>Kolla innan du går ut — Know before you go</p>
            </div>
            <div className="about-card-body" style={{fontSize:'.82rem',color:'#999',lineHeight:1.7}}>
              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'0 0 8px',letterSpacing:1}}>Problemet</h2>
              {(cms.about_problem || 'Laddar...').split('\n').filter(Boolean).map((p, i) => <p key={i} style={{marginBottom:10}}>{p}</p>)}

              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'20px 0 8px',letterSpacing:1}}>Lösningen</h2>
              {(cms.about_solution || 'Laddar...').split('\n').filter(Boolean).map((p, i) => (
                <p key={i} style={{marginBottom:8}}>{p.startsWith('•') ? <span style={{display:'flex',gap:8,alignItems:'flex-start'}}><span style={{width:6,height:6,borderRadius:'50%',background:'#D4A843',marginTop:8,flexShrink:0}} /><span>{p.slice(2)}</span></span> : p}</p>
              ))}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,margin:'20px 0'}}>
                <div style={{background:'#1e1e1e',borderRadius:8,padding:'14px 12px',textAlign:'center'}}><strong style={{display:'block',fontSize:'1.3rem',fontWeight:800,color:'#D4A843'}}>{cms.about_stats_wolf || '~460'}</strong><span style={{fontSize:'.55rem',color:'#666',textTransform:'uppercase',letterSpacing:1}}>{cms.about_stats_wolf_label || 'Vargar'}</span></div>
                <div style={{background:'#1e1e1e',borderRadius:8,padding:'14px 12px',textAlign:'center'}}><strong style={{display:'block',fontSize:'1.3rem',fontWeight:800,color:'#D4A843'}}>{cms.about_stats_bear || '~2 450'}</strong><span style={{fontSize:'.55rem',color:'#666',textTransform:'uppercase',letterSpacing:1}}>{cms.about_stats_bear_label || 'Björnar'}</span></div>
                <div style={{background:'#1e1e1e',borderRadius:8,padding:'14px 12px',textAlign:'center'}}><strong style={{display:'block',fontSize:'1.3rem',fontWeight:800,color:'#D4A843'}}>{cms.about_stats_lynx || '~1 400'}</strong><span style={{fontSize:'.55rem',color:'#666',textTransform:'uppercase',letterSpacing:1}}>{cms.about_stats_lynx_label || 'Lodjur'}</span></div>
              </div>

              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'20px 0 8px',letterSpacing:1}}>Observationstyper</h2>
              <p style={{marginBottom:8}}>Inspirerat av Rovbase kategoriserar vi alla observationer:</p>
              {Object.entries(OBS_TYPES).map(([k, v]) => (
                <div key={k} style={{display:'flex',gap:8,alignItems:'flex-start',borderBottom:'1px solid rgba(255,255,255,.07)',padding:'6px 0'}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:'#D4A843',marginTop:8,flexShrink:0}} />
                  <span><strong style={{color:'#e8e8e8'}}>{v}</strong> — {k === 'visual' ? 'direkt observation av djuret' : k === 'tracks' ? 'spår, spillning eller klösmärken' : k === 'camera' ? 'viltkamerabild eller video' : k === 'damage' ? 'skador på tamdjur eller egendom' : k === 'dead' ? 'funna döda rovdjur' : 'individ identifierad via DNA-prov'}</span>
                </div>
              ))}

              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'20px 0 8px',letterSpacing:1}}>Varför nu?</h2>
              {(cms.about_why_now || '').split('\n').filter(Boolean).map((line, i) => (
                <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:4}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:'#D4A843',marginTop:8,flexShrink:0}} />
                  <span>{line.replace(/^[•\-]\s*/, '')}</span>
                </div>
              ))}

              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'20px 0 8px',letterSpacing:1}}>Samarbeta med oss</h2>
              <p style={{marginBottom:10}}>{cms.about_partners || ''}</p>

              {cms.about_vision && <>
                <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'20px 0 8px',letterSpacing:1}}>Vår vision</h2>
                <p style={{marginBottom:10}}>{cms.about_vision}</p>
              </>}
            </div>
            <div className="about-card-footer" style={{fontSize:'.6rem',color:'#666',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Rovdjursradar · Mars 2026</span>
              <span style={{display:'flex',gap:12,alignItems:'center'}}><a href="/integritetspolicy" style={{color:'#666',textDecoration:'none'}}>Integritetspolicy</a><span style={{color:'#D4A843'}}>rovdjursradar.se</span></span>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[3000] bg-[#2D5016] text-white px-4 py-2 rounded-lg text-[.72rem] font-semibold animate-[fadeIn_.2s_ease]">{toast}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <svg viewBox="0 0 40 40" fill="#D4A843" className="w-12 h-12 mx-auto mb-3 animate-pulse"><ellipse cx="12" cy="10" rx="4" ry="4.5"/><ellipse cx="24" cy="8" rx="3.5" ry="4"/><ellipse cx="33" cy="13" rx="3" ry="3.5"/><ellipse cx="5" cy="17" rx="3" ry="3.5"/><path d="M7 25 Q10 35 20 37 Q30 35 33 25 Q30 20 20 19 Q10 20 7 25Z"/></svg>
            <div className="text-[#D4A843] text-sm font-bold tracking-widest">ROVDJURSRADAR</div>
            <div className="text-[#666] text-xs mt-1">Laddar observationer...</div>
          </div>
        </div>
      )}

      {/* PASSWORD GATE */}
      {!unlocked && (
        <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.85)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:'40px 32px',width:'100%',maxWidth:400,border:'1px solid rgba(255,255,255,.07)',textAlign:'center'}}>
            <svg viewBox="0 0 40 40" fill="#D4A843" style={{width:48,height:48,margin:'0 auto 16px'}}><ellipse cx="12" cy="10" rx="4" ry="4.5"/><ellipse cx="24" cy="8" rx="3.5" ry="4"/><ellipse cx="33" cy="13" rx="3" ry="3.5"/><ellipse cx="5" cy="17" rx="3" ry="3.5"/><path d="M7 25 Q10 35 20 37 Q30 35 33 25 Q30 20 20 19 Q10 20 7 25Z"/></svg>
            <h1 style={{fontSize:'1.1rem',fontWeight:800,letterSpacing:3,color:'#fff',marginBottom:4}}>ROVDJURSRADAR</h1>
            <p style={{fontSize:'.75rem',color:'#D4A843',marginBottom:24}}>Kolla innan du går ut</p>
            <p style={{fontSize:'.72rem',color:'#999',marginBottom:16,lineHeight:1.6}}>Rovdjursradar är i tidig betaversion. Ange lösenord för att komma in.</p>
            <input
              type="password"
              placeholder="Lösenord"
              value={gatePassword}
              onChange={e => { setGatePassword(e.target.value); setGateError(false); }}
              onKeyDown={e => e.key === 'Enter' && tryUnlock()}
              style={{width:'100%',padding:'11px 14px',borderRadius:8,border:gateError ? '1.5px solid #B83230' : '1px solid rgba(255,255,255,.12)',background:'#1e1e1e',color:'#e8e8e8',fontFamily:'inherit',fontSize:'.85rem',marginBottom:12,outline:'none'}}
            />
            {gateError && <p style={{fontSize:'.7rem',color:'#B83230',marginBottom:8}}>Fel lösenord. Försök igen.</p>}
            <button
              onClick={tryUnlock}
              style={{width:'100%',padding:'11px',borderRadius:8,border:0,background:'#2D5016',color:'#fff',fontFamily:'inherit',fontSize:'.85rem',fontWeight:700,cursor:'pointer'}}
            >Öppna</button>
            <p style={{fontSize:'.6rem',color:'#444',marginTop:16}}>Kontakta oss för åtkomst: info@rovdjursradar.se</p>
          </div>
        </div>
      )}
    </div>
  );
}
