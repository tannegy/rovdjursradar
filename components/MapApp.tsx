'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { SPECIES, OBS_TYPES, SOURCES, COUNTIES, TILE_LAYERS, timeAgo, distKm } from '@/lib/config';
import { translations, Lang } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { Sighting } from '@/lib/supabase';
import { useGeolocation } from '@/hooks/useGeolocation';
import TrustScorePanel from '@/components/TrustScorePanel';

declare module 'leaflet' {
  function heatLayer(latlngs: any[], options?: any): any;
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconMap = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21"/></svg>;
const IconList = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
const IconFilter = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/></svg>;
const IconInfo = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>;
const IconCrosshair = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>;
const PawLogo = ({ size = 18 }: { size?: number }) => <svg viewBox="0 0 40 40" fill="#D4A843" style={{ width: size, height: size }}><ellipse cx="12" cy="10" rx="4" ry="4.5"/><ellipse cx="24" cy="8" rx="3.5" ry="4"/><ellipse cx="33" cy="13" rx="3" ry="3.5"/><ellipse cx="5" cy="17" rx="3" ry="3.5"/><path d="M7 25 Q10 35 20 37 Q30 35 33 25 Q30 20 20 19 Q10 20 7 25Z"/></svg>;

type MobileTab = 'map' | 'list' | 'filter';

export default function MapApp() {
  const geo = useGeolocation();
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

  const [speciesFilter, setSpeciesFilter] = useState<Set<string>>(new Set(['wolf','lynx','bear','eagle','wolverine']));
  const [obsFilter, setObsFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set(['official','club','crowd','skandobs']));
  const [hoursFilter, setHoursFilter] = useState(168);
  const [countyFilter, setCountyFilter] = useState('all');
  const [customDates, setCustomDates] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [mobileTab, setMobileTab] = useState<MobileTab>('map');
  const [reporting, setReporting] = useState(false);
  const [reportLL, setReportLL] = useState<{lat:number;lng:number}|null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cms, setCms] = useState<Record<string,string>>({});
  const [heatOn, setHeatOn] = useState(false);
  const [userLL, setUserLL] = useState<{lat:number;lng:number}|null>(null);
  const [tileKey, setTileKey] = useState<keyof typeof TILE_LAYERS>('voyager');
  const [toast, setToast] = useState('');
  const [listSort, setListSort] = useState<'time'|'dist'>('time');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [fbName, setFbName] = useState('');
  const [fbEmail, setFbEmail] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [fbSending, setFbSending] = useState(false);

  // ─── Language ────────────────────────────────────────────────────────────
  const [lang, setLang] = useState<Lang>('sv');
  const t = translations[lang];
  useEffect(() => {
    try { const saved = localStorage.getItem('rr_lang'); if (saved === 'en' || saved === 'sv') setLang(saved); } catch {}
  }, []);
  const toggleLang = () => {
    const next = lang === 'sv' ? 'en' : 'sv';
    setLang(next);
    try { localStorage.setItem('rr_lang', next); } catch {}
  };
  const speciesName = (key: string) => (t as any)[key] || (SPECIES as any)[key]?.name || key;
  const c = (key: string, fallback: string = '') => {
    if (lang === 'en' && cms[key + '_en']) return cms[key + '_en'];
    return cms[key] || fallback;
  };

  // ─── Password gate ──────────────────────────────────────────────────────
  const [unlocked, setUnlocked] = useState(false);
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState(false);
  useEffect(() => {
    try { if (typeof window !== 'undefined' && window.sessionStorage.getItem('rr_unlocked') === '1') setUnlocked(true); } catch {}
  }, []);
  const tryUnlock = () => {
    if (gatePassword === 'sakerhetforalla') {
      setUnlocked(true); setGateError(false);
      try { window.sessionStorage.setItem('rr_unlocked', '1'); } catch {}
    } else { setGateError(true); }
  };

  // ─── Report form ────────────────────────────────────────────────────────
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

  const fetchSightings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (!customDates && hoursFilter) params.set('hours', String(hoursFilter));
      if (customDates && dateFrom) params.set('date_from', dateFrom);
      if (customDates && dateTo) params.set('date_to', dateTo);
      if (countyFilter !== 'all') params.set('county', countyFilter);
      const res = await fetch(`/api/sightings?${params}`);
      if (!res.ok) throw new Error('Fetch failed');
      setSightings(await res.json());
    } catch (err) { console.error('Failed to fetch sightings:', err); }
    finally { setLoading(false); }
  }, [hoursFilter, customDates, dateFrom, dateTo, countyFilter]);

  useEffect(() => {
    setFiltered(sightings.filter(s =>
      speciesFilter.has(s.predator_type) &&
      sourceFilter.has(s.source) &&
      (obsFilter === 'all' || s.observation_type === obsFilter)
    ));
  }, [sightings, speciesFilter, sourceFilter, obsFilter]);

  // ─── Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { center: [63, 16], zoom: 5, zoomControl: false, attributionControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    tileRef.current = L.tileLayer(TILE_LAYERS.voyager.url, { maxZoom: TILE_LAYERS.voyager.maxZoom }).addTo(map);
    clusterRef.current = (L as any).markerClusterGroup({ maxClusterRadius: 50 });
    map.addLayer(clusterRef.current!);
    mapRef.current = map;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLL(ll); map.setView([ll.lat, ll.lng], 9);
        userMarkerRef.current = L.circleMarker([ll.lat, ll.lng], { radius: 7, fillColor: '#4ade80', fillOpacity: 0.9, color: '#fff', weight: 2 }).addTo(map);
      }, () => {});
    }
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => { fetchSightings(); }, [fetchSightings]);

  // ─── Render markers ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current; const cluster = clusterRef.current;
    if (!map || !cluster) return;
    cluster.clearLayers();
    if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null; }

    filtered.forEach(s => {
      const cfg = (SPECIES as any)[s.predator_type];
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${cfg.color};border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;position:relative">${cfg.emoji}${s.verified ? '<div style="position:absolute;bottom:-3px;right:-4px;width:11px;height:11px;border-radius:50%;background:#2D5016;border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:6px;color:#fff">✓</div>' : ''}</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14],
      });
      const m = L.marker([s.latitude, s.longitude], { icon });
      const ago = timeAgo(s.sighted_at, lang);
      const obsLabel = (OBS_TYPES as any)[s.observation_type] || s.observation_type;
      const srcLabel = (SOURCES as any)[s.source] || s.source;
      const shareUrl = `https://rovdjursradar.se/?lat=${s.latitude}&lng=${s.longitude}&z=12`;
      const shareText = `${(translations[lang] as any)[s.predator_type] || cfg.name} ${lang === 'sv' ? 'observerad' : 'sighted'} — ${ago}`;

      m.bindPopup(`
        <div class="rr-popup-header">
          <div class="rr-popup-icon" style="background:${cfg.color}22;border-color:${cfg.color}">${cfg.emoji}</div>
          <div>
            <div style="font-weight:800;font-size:.9rem;color:#fff;letter-spacing:.3px">${(translations[lang] as any)[s.predator_type] || cfg.name}</div>
            <div style="font-size:.6rem;color:#666;margin-top:1px">${ago} · ${s.county ? ((COUNTIES as any)[s.county]?.name || s.county) : ''}</div>
          </div>
        </div>
        <div class="rr-popup-badges">
          ${s.verified ? `<span class="rr-popup-badge" style="background:rgba(45,80,22,.2);color:#4a9c2e">${t.verified}</span>` : ''}
          <span class="rr-popup-badge" style="background:rgba(212,168,67,.1);color:#D4A843">${(t as any)[s.observation_type] || obsLabel}</span>
          <span class="rr-popup-badge" style="background:rgba(255,255,255,.05);color:#888">${(t as any)[s.source] || srcLabel}</span>
        </div>
        <div class="rr-popup-rows">
          <div class="rr-popup-row"><span class="rr-popup-row-label">${t.reportCount}</span><span class="rr-popup-row-value">${s.count} ${t.listAnimals}</span></div>
          <div class="rr-popup-row"><span class="rr-popup-row-label">${t.position}</span><span class="rr-popup-row-value">${s.latitude.toFixed(2)}, ${s.longitude.toFixed(2)}</span></div>
        </div>
        ${s.notes ? `<div class="rr-popup-notes">"${s.notes}"</div>` : ''}
        <div class="rr-popup-footer">
          <button class="rr-popup-btn rr-popup-btn-share" onclick="(function(){if(navigator.share){navigator.share({title:'Rovdjursradar',text:'${shareText.replace(/'/g, "\\'")}',url:'${shareUrl}'})}else{navigator.clipboard.writeText('${shareUrl}');var b=this;b.textContent='✓ ${t.copied}';setTimeout(function(){b.innerHTML='📤 ${t.share}'},2000)}}).call(this)">📤 ${t.share}</button>
          <button class="rr-popup-btn" onclick="(function(){if(confirm('${t.flagConfirm}')){fetch('/api/sightings?flag=${s.id}').then(function(){}).catch(function(){})}}).call(this)">⚑ ${t.flag}</button>
        </div>
      `, { maxWidth: 280, className: 'rr-popup' });
      cluster.addLayer(m);
    });

    if (heatOn) {
      heatRef.current = (L as any).heatLayer(filtered.map(s => [s.latitude, s.longitude, 0.6]), { radius: 25, blur: 20, maxZoom: 8 });
      heatRef.current.addTo(map);
    }
  }, [filtered, heatOn, lang, t]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const cfg = TILE_LAYERS[tileKey];
    tileRef.current = L.tileLayer(cfg.url, { maxZoom: cfg.maxZoom }).addTo(map);
  }, [tileKey]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => {
      if (!reporting) return;
      setReportLL({ lat: e.latlng.lat, lng: e.latlng.lng });
      if (reportMarkerRef.current) map.removeLayer(reportMarkerRef.current);
      reportMarkerRef.current = L.circleMarker(e.latlng, { radius: 10, fillColor: '#D4A843', fillOpacity: 0.9, color: '#fff', weight: 2.5 }).addTo(map);
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [reporting]);

  // Invalidate map on layout changes
  useEffect(() => { setTimeout(() => mapRef.current?.invalidateSize(), 100); }, [mobileTab, reporting]);

  const submitReport = async () => {
    if (!rptSpecies) { showToast(lang === 'sv' ? 'Välj art' : 'Select species'); return; }
    const ll = reportLL || userLL;
    if (!ll) { showToast(lang === 'sv' ? 'Markera plats på kartan' : 'Mark a location on the map'); return; }
    try {
      const res = await fetch('/api/sightings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predator_type: rptSpecies, observation_type: rptObs, source: rptSource, latitude: ll.lat, longitude: ll.lng, sighted_at: rptTime || new Date().toISOString(), count: rptCount, notes: rptNotes || null, device_type: geo.deviceType, gps_accuracy: geo.accuracy, user_lat: geo.lat, user_lng: geo.lng }),
      });
      if (!res.ok) { const err = await res.json(); showToast(err.error || 'Något gick fel'); return; }
      closeReport(); fetchSightings(); showToast(t.reportSuccess);
    } catch { showToast('Nätverksfel, försök igen'); }
  };

  const openReport = () => {
    setReporting(true); setMobileTab('map');
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setRptTime(now.toISOString().slice(0, 16));
  };

  const closeReport = () => {
    setReporting(false); setReportLL(null); setRptSpecies(''); setRptNotes('');
    if (reportMarkerRef.current && mapRef.current) { mapRef.current.removeLayer(reportMarkerRef.current); reportMarkerRef.current = null; }
  };

  const toggleSpecies = (sp: string) => setSpeciesFilter(prev => { const n = new Set(prev); n.has(sp) ? n.delete(sp) : n.add(sp); return n; });
  const toggleSource = (src: string) => setSourceFilter(prev => { const n = new Set(prev); n.has(src) ? n.delete(src) : n.add(src); return n; });

  const nearby = userLL ? filtered.filter(s => distKm(userLL.lat, userLL.lng, s.latitude, s.longitude) < 20) : [];
  const nearbyCount = nearby.length;
  const sortedList = [...filtered].sort((a, b) => {
    if (listSort === 'dist' && userLL) return distKm(userLL.lat, userLL.lng, a.latitude, a.longitude) - distKm(userLL.lat, userLL.lng, b.latitude, b.longitude);
    return new Date(b.sighted_at).getTime() - new Date(a.sighted_at).getTime();
  }).slice(0, 50);
  const speciesCounts = Object.fromEntries(Object.keys(SPECIES).map(k => [k, filtered.filter(s => s.predator_type === k).length]));
  const count24h = sightings.filter(s => new Date(s.sighted_at).getTime() > Date.now() - 86400000).length;

  const geoLocate = () => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => {
      const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLL(ll); mapRef.current?.setView([ll.lat, ll.lng], 10);
      if (userMarkerRef.current && mapRef.current) mapRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = L.circleMarker([ll.lat, ll.lng], { radius: 7, fillColor: '#4ade80', fillOpacity: 0.9, color: '#fff', weight: 2 }).addTo(mapRef.current!);
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── FILTER PANEL ──────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const filterPanelJsx = (
    <div className="overflow-y-auto flex-1 min-h-0">
      <div className="p-3 border-b border-white/[.07]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666]">{t.reportSpecies}</span>
          <button onClick={() => setSpeciesFilter(speciesFilter.size === 5 ? new Set() : new Set(['wolf','lynx','bear','eagle','wolverine']))} className="text-[.6rem] text-[#D4A843] bg-transparent border-none cursor-pointer">{t.allNone}</button>
        </div>
        {Object.entries(SPECIES).map(([key, sp]) => (
          <label key={key} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-white/[.04] text-[.75rem] text-[#999]">
            <input type="checkbox" checked={speciesFilter.has(key)} onChange={() => toggleSpecies(key)} className="hidden" />
            <span className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center text-[8px] transition-all ${speciesFilter.has(key) ? 'border-[#D4A843] bg-[rgba(212,168,67,.15)] text-[#D4A843]' : 'border-white/[.12] text-transparent'}`}>✓</span>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sp.color }} />
            <span className="flex-1">{speciesName(key)}</span>
            <span className="text-[.6rem] text-[#666] tabular-nums">{speciesCounts[key] || 0}</span>
          </label>
        ))}
      </div>
      <div className="p-3 border-b border-white/[.07]">
        <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">{t.reportObsType}</span>
        <div className="flex flex-wrap gap-1">
          {['all', ...Object.keys(OBS_TYPES)].map(key => (
            <button key={key} onClick={() => setObsFilter(key)} className={`px-2 py-1 rounded text-[.6rem] font-semibold border transition-all ${obsFilter === key ? 'border-[#D4A843] text-[#D4A843] bg-[rgba(212,168,67,.06)]' : 'border-white/[.12] text-[#666]'}`}>
              {key === 'all' ? t.all : (t as any)[key] || OBS_TYPES[key as keyof typeof OBS_TYPES]}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 border-b border-white/[.07]">
        <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">{t.timePeriod}</span>
        <div className="flex flex-wrap gap-1">
          {[{h:24,l:'24h'},{h:72,l:'3d'},{h:168,l:'7d'},{h:720,l:'30d'},{h:2160,l:'90d'}].map(({h,l}) => (
            <button key={h} onClick={() => { setHoursFilter(h); setCustomDates(false); }} className={`px-2 py-1 rounded text-[.6rem] font-medium transition-all ${!customDates && hoursFilter === h ? 'bg-[#2D5016] text-white' : 'bg-white/[.04] text-[#666]'}`}>{l}</button>
          ))}
          <button onClick={() => setCustomDates(true)} className={`px-2 py-1 rounded text-[.6rem] font-medium transition-all ${customDates ? 'bg-[#2D5016] text-white' : 'bg-white/[.04] text-[#666]'}`}>{t.customDate}</button>
        </div>
        {customDates && (
          <div className="flex gap-1.5 mt-1.5">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 px-1.5 py-1 rounded border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.65rem]" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 px-1.5 py-1 rounded border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.65rem]" />
          </div>
        )}
      </div>
      <div className="p-3 border-b border-white/[.07]">
        <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">{t.county}</span>
        <select value={countyFilter} onChange={e => { setCountyFilter(e.target.value); if (e.target.value !== 'all' && (COUNTIES as any)[e.target.value]) { const ct = (COUNTIES as any)[e.target.value]; mapRef.current?.fitBounds([[ct.bounds[0],ct.bounds[1]],[ct.bounds[2],ct.bounds[3]]]); }}} className="w-full px-2 py-1.5 rounded border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.72rem]">
          <option value="all">{t.allCounties}</option>
          {Object.entries(COUNTIES).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
      </div>
      <div className="p-3 border-b border-white/[.07]">
        <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">{t.sourceLabel}</span>
        {Object.entries(SOURCES).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-white/[.04] text-[.75rem] text-[#999]">
            <input type="checkbox" checked={sourceFilter.has(key)} onChange={() => toggleSource(key)} className="hidden" />
            <span className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center text-[8px] transition-all ${sourceFilter.has(key) ? 'border-[#D4A843] bg-[rgba(212,168,67,.15)] text-[#D4A843]' : 'border-white/[.12] text-transparent'}`}>✓</span>
            <span className="flex-1">{(t as any)[key] || label}</span>
          </label>
        ))}
      </div>
      <div className="p-3 border-b border-white/[.07]">
        <span className="text-[.55rem] font-bold tracking-[2px] uppercase text-[#666] block mb-2">{t.mapLayers}</span>
        <div className="grid grid-cols-5 gap-1">
          {(Object.entries(TILE_LAYERS) as [keyof typeof TILE_LAYERS, typeof TILE_LAYERS[keyof typeof TILE_LAYERS]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => setTileKey(key)} className={`rounded-md overflow-hidden border-[1.5px] transition-all ${tileKey === key ? 'border-[#D4A843]' : 'border-transparent'}`}>
              <div className="h-7" style={{ background: key === 'voyager' ? '#e8e0d0' : key === 'positron' ? '#e6e6e6' : key === 'dark' ? '#1a1a2e' : key === 'topo' ? '#ddd8c4' : '#2a3a2a' }}></div>
              <div className={`px-1 py-0.5 text-[.5rem] font-semibold bg-[#1e1e1e] text-center ${tileKey === key ? 'text-[#D4A843]' : 'text-[#666]'}`}>{cfg.name}</div>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between py-2 mt-1">
          <span className="text-[.72rem] text-[#999]">{t.heatmap}</span>
          <button onClick={() => setHeatOn(!heatOn)} className={`w-8 h-[18px] rounded-full relative transition-colors border ${heatOn ? 'bg-[#2D5016] border-[#2D5016]' : 'bg-[#282828] border-white/[.12]'}`}>
            <span className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white transition-transform ${heatOn ? 'translate-x-[14px]' : ''}`} />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="text-[.58rem] text-[#666] leading-relaxed">
          {t.footerText} <span className="text-[#D4A843]">rovdjursradar.se</span> · v2.0
          <div className="flex gap-3 mt-2">
            <a href="/partners" className="text-[#666] hover:text-[#D4A843]" style={{textDecoration:'none'}}>{t.partners}</a>
            <a href="/integritetspolicy" className="text-[#666] hover:text-[#D4A843]" style={{textDecoration:'none'}}>{t.privacy}</a>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── LIST PANEL ────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const listPanelJsx = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[.07] flex-shrink-0">
        <span className="text-[.78rem] font-bold">{t.listTitle}</span>
        <span className="text-[.6rem] text-[#666] bg-[#282828] px-1.5 py-0.5 rounded">{filtered.length}</span>
        <div className="ml-auto flex gap-0.5">
          <button onClick={() => setListSort('time')} className={`px-2 py-0.5 rounded text-[.58rem] font-semibold ${listSort === 'time' ? 'bg-[#282828] text-white' : 'text-[#666]'}`}>{t.listLatest}</button>
          <button onClick={() => setListSort('dist')} className={`px-2 py-0.5 rounded text-[.58rem] font-semibold ${listSort === 'dist' ? 'bg-[#282828] text-white' : 'text-[#666]'}`}>{t.listNearest}</button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 px-2 pb-2">
        {sortedList.map(s => {
          const sp = (SPECIES as any)[s.predator_type];
          const d = userLL ? Math.round(distKm(userLL.lat, userLL.lng, s.latitude, s.longitude)) : null;
          return (
            <div key={s.id} onClick={() => { mapRef.current?.setView([s.latitude, s.longitude], 12); setMobileTab('map'); }} className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-white/[.03] border-b border-white/[.07] last:border-b-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2" style={{ background: sp.color + '22', borderColor: sp.color }}>{sp.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[.75rem] font-semibold flex items-center gap-1.5">
                  {speciesName(s.predator_type)}
                  {s.verified && <span className="text-[.5rem] font-bold px-1 py-px rounded bg-[rgba(45,80,22,.2)] text-[#4a9c2e]">{t.verified}</span>}
                  <span className="text-[.5rem] font-bold px-1 py-px rounded bg-[rgba(212,168,67,.1)] text-[#D4A843]">{(t as any)[s.observation_type] || OBS_TYPES[s.observation_type as keyof typeof OBS_TYPES]}</span>
                </div>
                <div className="text-[.6rem] text-[#666] flex gap-2 mt-0.5">
                  <span>{timeAgo(s.sighted_at, lang)}</span>
                  <span>{s.county ? ((COUNTIES as any)[s.county]?.name || '') : ''}</span>
                </div>
              </div>
              {d !== null && <div className="text-[.6rem] text-[#666] flex-shrink-0">{d} {t.kmAway}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── REPORT FORM ───────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const reportFormJsx = (
    <div className="p-3.5 pt-2 overflow-y-auto">
      <div className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg mb-2.5 text-[.65rem] border ${reportLL ? 'border-green-500/30 bg-green-500/[.04]' : 'border-white/[.12] bg-[#1e1e1e]'}`}>
        <span className={`w-2 h-2 rounded-full ${reportLL ? 'bg-green-400' : 'bg-[#666]'}`} />
        <span>{reportLL ? `${t.reportLocationSet}: ${reportLL.lat.toFixed(3)}, ${reportLL.lng.toFixed(3)}` : t.reportInstruction}</span>
      </div>
      <div className="mb-3">
        <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">{t.reportSpecies}</label>
        <div className="grid grid-cols-5 gap-1">
          {Object.entries(SPECIES).map(([key, sp]) => (
            <button key={key} onClick={() => setRptSpecies(key)} className={`py-2 rounded-lg border text-center text-[.55rem] font-semibold transition-all ${rptSpecies === key ? 'border-[#D4A843] text-white bg-[rgba(212,168,67,.06)]' : 'border-white/[.12] text-[#666]'}`}>
              <span className="text-lg block mb-0.5">{sp.emoji}</span>{speciesName(key)}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">{t.reportObsType}</label>
        <div className="flex flex-wrap gap-1">
          {Object.entries(OBS_TYPES).map(([key, label]) => (
            <button key={key} onClick={() => setRptObs(key)} className={`px-2 py-1 rounded text-[.6rem] font-semibold border transition-all ${rptObs === key ? 'border-[#D4A843] text-[#D4A843] bg-[rgba(212,168,67,.06)]' : 'border-white/[.12] text-[#666]'}`}>{(t as any)[key] || label}</button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">{t.sourceLabel}</label>
        <select value={rptSource} onChange={e => setRptSource(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.75rem]">
          <option value="crowd">{t.reportSourceOwn}</option>
          <option value="club">{t.reportSourceClub}</option>
          <option value="official">{t.reportSourceOfficial}</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">{t.reportCount}</label>
          <input type="number" min={1} max={50} value={rptCount} onChange={e => setRptCount(Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.75rem]" />
        </div>
        <div>
          <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">{t.reportTime}</label>
          <input type="datetime-local" value={rptTime} onChange={e => setRptTime(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.65rem]" />
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-[.6rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">{t.reportNote}</label>
        <textarea value={rptNotes} onChange={e => setRptNotes(e.target.value)} placeholder={t.reportNotePlaceholder} className="w-full px-2 py-1.5 rounded-lg border border-white/[.12] bg-[#1e1e1e] text-[#e8e8e8] text-[.75rem] resize-y min-h-[48px]" />
      </div>
      <TrustScorePanel geo={geo} reportLat={reportLL?.lat ?? null} reportLng={reportLL?.lng ?? null} />
      <button onClick={submitReport} className="w-full py-2.5 rounded-lg bg-[#2D5016] text-white font-bold text-[.82rem] hover:bg-[#3a6b1e]">{t.reportSubmit}</button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── RENDER ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full overflow-hidden">

      {/* ═══ TOP NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-[rgba(15,15,15,.95)] backdrop-blur-2xl border-b border-white/[.07] h-12 flex items-center px-3 gap-2">
        <div className="flex items-center gap-1.5">
          <PawLogo />
          <span className="font-extrabold text-[.7rem] tracking-[2px] text-white">ROVDJURSRADAR</span>
        </div>
        <div className="flex-1" />
        <div className="hidden lg:flex items-center gap-1.5">
          <button onClick={openAbout} className="px-3 py-1 rounded-md text-[.65rem] font-semibold border border-white/[.12] text-[#999] hover:bg-white/[.04]">{t.about}</button>
          <a href="/partners" className="px-3 py-1 rounded-md text-[.65rem] font-semibold border border-white/[.12] text-[#999] hover:bg-white/[.04]" style={{textDecoration:'none'}}>{t.partners}</a>
          <button onClick={() => showToast('Swish: 123-456 78 90')} className="px-3 py-1 rounded-md text-[.65rem] font-semibold border border-[rgba(212,168,67,.25)] text-[#D4A843]">{t.support}</button>
        </div>
        <button onClick={() => setFeedbackOpen(true)} className="px-2.5 py-1 rounded-md text-[.58rem] font-bold border border-[rgba(91,154,58,.35)] bg-[rgba(91,154,58,.08)] text-[#8bc76a] hover:bg-[rgba(91,154,58,.15)] transition-colors" style={{whiteSpace:'nowrap'}}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8bc76a] mr-1.5 animate-pulse" style={{verticalAlign:'middle'}} />
          BETA — {lang === 'sv' ? 'ge feedback' : 'give feedback'}
        </button>
        <button onClick={toggleLang} className="px-2 py-1 rounded-md text-[.6rem] font-bold border border-white/[.12] text-[#999] hover:bg-white/[.04]">{lang === 'sv' ? 'EN' : 'SV'}</button>
      </nav>

      {/* ═══ REPORT BANNER ═══ */}
      {reporting && (
        <div className="fixed top-12 left-0 right-0 z-[955] bg-[rgba(212,168,67,.12)] border-b border-[rgba(212,168,67,.25)] px-4 py-1.5 flex items-center gap-2 text-[.7rem] text-[#D4A843] backdrop-blur-lg">
          <span className="w-2 h-2 rounded-full bg-[#D4A843] animate-pulse" />
          <span>{t.reportInstruction}</span>
          <button onClick={closeReport} className="ml-auto px-2.5 py-0.5 rounded bg-white/[.08] border border-white/[.12] text-[#999] text-[.6rem] font-semibold">{t.reportCancel}</button>
        </div>
      )}

      {/* ═══ MAP (single element, CSS-positioned for both layouts) ═══ */}
      <div ref={mapEl}
        id="rr-map"
        className="fixed z-[1]"
        style={{
          top: reporting ? 80 : 48,
          left: 0, right: 0, bottom: 0,
          cursor: reporting ? 'crosshair' : undefined,
        }} />


      {/* ═══ DESKTOP: Left sidebar (filters, always visible) ═══ */}
      <aside className="hidden lg:flex fixed top-12 left-0 bottom-0 w-[300px] z-[5] bg-[#161616] border-r border-white/[.07] flex-col overflow-hidden">
        {filterPanelJsx}
      </aside>

      {/* ═══ DESKTOP: Right sidebar (list, always visible) ═══ */}
      <aside className="hidden lg:flex fixed top-12 right-0 bottom-0 w-[320px] z-[5] bg-[#161616] border-l border-white/[.07] flex-col overflow-hidden">
        {listPanelJsx}
      </aside>

      {/* ═══ DESKTOP: Report drawer (slides over right panel) ═══ */}
      <div className={`hidden lg:block fixed top-12 right-0 bottom-0 w-[340px] z-[960] bg-[#161616] border-l border-white/[.07] transition-transform overflow-y-auto ${reporting ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-3.5 pt-3">
          <h2 className="text-[.9rem] font-bold">{t.reportTitle}</h2>
          <button onClick={closeReport} className="w-6 h-6 rounded-full bg-white/[.06] text-white flex items-center justify-center text-sm">×</button>
        </div>
        {reportFormJsx}
      </div>

      {/* ═══ MAP OVERLAYS ═══ */}
      {/* Nearby */}
      {userLL && mobileTab === 'map' && (
        <div className="fixed z-[900] bg-[rgba(15,15,15,.92)] backdrop-blur-xl border border-white/[.12] rounded-lg px-3 py-1.5 flex items-center gap-2 left-2 lg:left-[308px]"
          style={{ top: reporting ? 88 : 56 }}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${nearbyCount === 0 ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,.4)]' : nearbyCount <= 2 ? 'bg-[#D4A843] shadow-[0_0_6px_rgba(212,168,67,.4)]' : 'bg-[#B83230] shadow-[0_0_6px_rgba(184,50,48,.4)]'}`} />
          <span className="text-[.65rem] text-[#e8e8e8]">{nearbyCount === 0 ? t.noNearby : `${nearbyCount} ${t.nearbyCount}`}</span>
        </div>
      )}

      {/* Neutrality pill */}
      {mobileTab === 'map' && (
        <div className="fixed z-[890] bg-[rgba(15,15,15,.82)] backdrop-blur-md border border-[rgba(212,168,67,.1)] rounded-lg px-3.5 py-2 left-2 lg:left-[308px] max-w-[320px]"
          style={{ top: userLL ? (reporting ? 118 : 86) : (reporting ? 88 : 56) }}>
          <div className="flex items-start gap-2">
            <span className="text-[13px] mt-px">🌲</span>
            <span className="text-[.6rem] leading-[1.5] text-[#b0b0a8]" style={{fontStyle:'italic'}}>{lang === 'sv' ? 'För alla som delar skogen — vi delar information, inte åsikter' : 'For everyone who shares the forest — we share information, not opinions'}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      {mobileTab === 'map' && (
        <div className="fixed z-[900] flex gap-1.5 left-2 lg:left-[308px] bottom-[130px] lg:bottom-3">
          <div className="bg-[rgba(15,15,15,.9)] backdrop-blur border border-white/[.07] rounded-lg px-2.5 py-1 text-[.55rem] text-[#666]">
            <strong className="text-[#D4A843] text-[.75rem] font-bold block">{filtered.length}</strong>obs
          </div>
          <div className="bg-[rgba(15,15,15,.9)] backdrop-blur border border-white/[.07] rounded-lg px-2.5 py-1 text-[.55rem] text-[#666]">
            <strong className="text-[#D4A843] text-[.75rem] font-bold block">{count24h}</strong>24h
          </div>
        </div>
      )}

      {/* Locate button */}
      {mobileTab === 'map' && (
        <button onClick={geoLocate} className="fixed z-[900] w-9 h-9 rounded-full bg-[#161616] border border-white/[.12] text-white flex items-center justify-center hover:bg-[#1e1e1e] right-2 lg:right-[328px] bottom-[130px] lg:bottom-[72px]">
          <IconCrosshair />
        </button>
      )}

      {/* ═══ REPORT BUTTON ═══ */}
      {!reporting && mobileTab === 'map' && (
        <>
          {/* Desktop */}
          <button onClick={openReport} className="hidden lg:flex fixed z-[950] h-11 px-6 rounded-full bg-[#2D5016] text-white font-bold text-[.8rem] items-center gap-2 shadow-[0_4px_20px_rgba(45,80,22,.4)] hover:bg-[#3a6b1e] hover:scale-[1.02] transition-all tracking-wide"
            style={{ bottom: 16, left: 'calc(300px + (100% - 300px - 320px) / 2)', transform: 'translateX(-50%)' }}>
            <IconCrosshair size={16} />{t.reportCtaLong}
          </button>
          {/* Mobile */}
          <button onClick={openReport} className="lg:hidden fixed z-[950] h-12 px-7 rounded-full bg-[#2D5016] text-white font-bold text-[.85rem] flex items-center gap-2.5 shadow-[0_4px_20px_rgba(45,80,22,.5)] active:scale-95 transition-all tracking-wide"
            style={{ bottom: 64, left: '50%', transform: 'translateX(-50%)' }}>
            <IconCrosshair size={18} />{t.reportCta}
          </button>
        </>
      )}

      {/* ═══ MOBILE: Overlaying panels ═══ */}
      {mobileTab === 'list' && (
        <div className="lg:hidden fixed top-12 left-0 right-0 bottom-[52px] z-[10] bg-[#161616]">
          {listPanelJsx}
        </div>
      )}
      {mobileTab === 'filter' && (
        <div className="lg:hidden fixed top-12 left-0 right-0 bottom-[52px] z-[10] bg-[#161616] flex flex-col">
          {filterPanelJsx}
        </div>
      )}

      {/* ═══ MOBILE: Report bottom sheet ═══ */}
      <div className={`lg:hidden fixed left-0 right-0 bottom-0 z-[960] bg-[#161616] border-t border-white/[.07] rounded-t-xl max-h-[60vh] transition-transform overflow-y-auto ${reporting ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between px-3.5 pt-3">
          <h2 className="text-[.9rem] font-bold">{t.reportTitle}</h2>
          <button onClick={closeReport} className="w-6 h-6 rounded-full bg-white/[.06] text-white flex items-center justify-center text-sm">×</button>
        </div>
        {reportFormJsx}
      </div>

      {/* ═══ MOBILE: Bottom tab bar ═══ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[940] bg-[rgba(15,15,15,.97)] border-t border-white/[.1] flex items-center px-2 py-1.5 backdrop-blur-2xl">
        {([
          { id: 'map', icon: <IconMap />, label: t.tabMap },
          { id: 'list', icon: <IconList />, label: t.tabList },
          { id: 'filter', icon: <IconFilter />, label: t.tabFilter },
          { id: 'about', icon: <IconInfo />, label: t.tabAbout },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => {
            if (tab.id === 'about') { openAbout(); } else { setMobileTab(tab.id as MobileTab); setAboutOpen(false); }
          }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors ${(tab.id === 'about' ? aboutOpen : mobileTab === tab.id) ? 'text-[#D4A843]' : 'text-[#666]'}`}>
            {tab.icon}
            <span className="text-[.55rem] font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ ABOUT MODAL ═══ */}
      {aboutOpen && (
        <div className="about-overlay" onClick={() => setAboutOpen(false)}>
          <div className="about-card" onClick={e => e.stopPropagation()}>
            <div className="about-card-header">
              <button onClick={() => setAboutOpen(false)} style={{position:'absolute',top:12,right:12,width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,.1)',border:0,color:'#fff',fontSize:'1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
              <h1 style={{fontSize:'1.6rem',fontWeight:800,color:'#fff',letterSpacing:2}}>ROVDJURSRADAR</h1>
              <p style={{color:'#D4A843',fontSize:'.85rem',marginTop:4}}>{t.aboutTagline}</p>
            </div>
            <div className="about-card-body" style={{fontSize:'.82rem',color:'#999',lineHeight:1.7}}>
              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'0 0 8px',letterSpacing:1}}>{t.aboutSectionProblem}</h2>
              {(c('about_problem', t.aboutLoading)).split('\n').filter(Boolean).map((p, i) => <p key={i} style={{marginBottom:10}}>{p}</p>)}
              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'20px 0 8px',letterSpacing:1}}>{t.aboutSectionSolution}</h2>
              {(c('about_solution', t.aboutLoading)).split('\n').filter(Boolean).map((p, i) => (
                <p key={i} style={{marginBottom:8}}>{p.startsWith('•') ? <span style={{display:'flex',gap:8,alignItems:'flex-start'}}><span style={{width:6,height:6,borderRadius:'50%',background:'#D4A843',marginTop:8,flexShrink:0}} /><span>{p.slice(2)}</span></span> : p}</p>
              ))}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,margin:'20px 0'}}>
                <div style={{background:'#1e1e1e',borderRadius:8,padding:'14px 12px',textAlign:'center'}}><strong style={{display:'block',fontSize:'1.3rem',fontWeight:800,color:'#D4A843'}}>{cms.about_stats_wolf || '~460'}</strong><span style={{fontSize:'.55rem',color:'#666',textTransform:'uppercase',letterSpacing:1}}>{c('about_stats_wolf_label', 'Vargar')}</span></div>
                <div style={{background:'#1e1e1e',borderRadius:8,padding:'14px 12px',textAlign:'center'}}><strong style={{display:'block',fontSize:'1.3rem',fontWeight:800,color:'#D4A843'}}>{cms.about_stats_bear || '~2 450'}</strong><span style={{fontSize:'.55rem',color:'#666',textTransform:'uppercase',letterSpacing:1}}>{c('about_stats_bear_label', 'Björnar')}</span></div>
                <div style={{background:'#1e1e1e',borderRadius:8,padding:'14px 12px',textAlign:'center'}}><strong style={{display:'block',fontSize:'1.3rem',fontWeight:800,color:'#D4A843'}}>{cms.about_stats_lynx || '~1 400'}</strong><span style={{fontSize:'.55rem',color:'#666',textTransform:'uppercase',letterSpacing:1}}>{c('about_stats_lynx_label', 'Lodjur')}</span></div>
              </div>
              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'20px 0 8px',letterSpacing:1}}>{t.aboutObsTypesTitle}</h2>
              <p style={{marginBottom:8}}>{t.aboutObsTypesIntro}</p>
              {Object.entries(OBS_TYPES).map(([k]) => (
                <div key={k} style={{display:'flex',gap:8,alignItems:'flex-start',borderBottom:'1px solid rgba(255,255,255,.07)',padding:'6px 0'}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:'#D4A843',marginTop:8,flexShrink:0}} />
                  <span><strong style={{color:'#e8e8e8'}}>{(t as any)[k]}</strong> — {(t as any)[`aboutObs${k.charAt(0).toUpperCase() + k.slice(1)}`] || ''}</span>
                </div>
              ))}
              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'20px 0 8px',letterSpacing:1}}>{t.aboutSectionWhyNow}</h2>
              {(c('about_why_now')).split('\n').filter(Boolean).map((line, i) => (
                <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:4}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:'#D4A843',marginTop:8,flexShrink:0}} />
                  <span>{line.replace(/^[•\-]\s*/, '')}</span>
                </div>
              ))}
              <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'20px 0 8px',letterSpacing:1}}>{t.aboutSectionPartners}</h2>
              <p style={{marginBottom:10}}>{c('about_partners')}</p>
              {(cms.about_vision || cms.about_vision_en) && <>
                <h2 style={{fontSize:'1rem',fontWeight:700,color:'#D4A843',margin:'20px 0 8px',letterSpacing:1}}>{t.aboutSectionVision}</h2>
                <p style={{marginBottom:10}}>{c('about_vision')}</p>
              </>}
            </div>
            <div className="about-card-footer" style={{fontSize:'.6rem',color:'#666',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Rovdjursradar · Mars 2026</span>
              <span style={{display:'flex',gap:12,alignItems:'center'}}><a href="/integritetspolicy" style={{color:'#666',textDecoration:'none'}}>{t.privacy}</a><span style={{color:'#D4A843'}}>rovdjursradar.se</span></span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FEEDBACK MODAL ═══ */}
      {feedbackOpen && (
        <div className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFeedbackOpen(false)}>
          <div className="bg-[#161616] border border-white/[.1] rounded-2xl w-full max-w-[420px] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#8bc76a] animate-pulse" />
                  <span className="text-[.65rem] font-bold tracking-[2px] uppercase text-[#8bc76a]">Beta feedback</span>
                </div>
                <button onClick={() => setFeedbackOpen(false)} className="w-7 h-7 rounded-full bg-white/[.06] text-white flex items-center justify-center text-sm hover:bg-white/[.1]">×</button>
              </div>
              <h2 className="text-[1.05rem] font-bold text-white mt-2">{lang === 'sv' ? 'Hjälp oss bli bättre' : 'Help us improve'}</h2>
              <p className="text-[.72rem] text-[#888] mt-1 leading-relaxed">{lang === 'sv' ? 'Berätta vad du tycker — vad funkar, vad fattas, vad kan bli bättre?' : 'Tell us what you think — what works, what\'s missing, what could be better?'}</p>
            </div>

            {/* Form */}
            <div className="px-5 pb-5 flex flex-col gap-3">
              <div>
                <label className="block text-[.58rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">{lang === 'sv' ? 'Ditt namn' : 'Your name'}</label>
                <input type="text" value={fbName} onChange={e => setFbName(e.target.value)} placeholder={lang === 'sv' ? 'Valfritt' : 'Optional'}
                  className="w-full px-3 py-2 rounded-lg border border-white/[.1] bg-[#1e1e1e] text-[#e8e8e8] text-[.8rem] outline-none focus:border-[rgba(91,154,58,.4)] transition-colors" />
              </div>
              <div>
                <label className="block text-[.58rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">{lang === 'sv' ? 'E-post' : 'Email'}</label>
                <input type="email" value={fbEmail} onChange={e => setFbEmail(e.target.value)} placeholder={lang === 'sv' ? 'Valfritt — om du vill ha svar' : 'Optional — if you want a reply'}
                  className="w-full px-3 py-2 rounded-lg border border-white/[.1] bg-[#1e1e1e] text-[#e8e8e8] text-[.8rem] outline-none focus:border-[rgba(91,154,58,.4)] transition-colors" />
              </div>
              <div>
                <label className="block text-[.58rem] font-semibold text-[#666] mb-1 uppercase tracking-widest">{lang === 'sv' ? 'Din feedback' : 'Your feedback'} *</label>
                <textarea value={fbMessage} onChange={e => setFbMessage(e.target.value)} rows={4}
                  placeholder={lang === 'sv' ? 'Skriv fritt — allt hjälper!' : 'Write freely — everything helps!'}
                  className="w-full px-3 py-2 rounded-lg border border-white/[.1] bg-[#1e1e1e] text-[#e8e8e8] text-[.8rem] outline-none focus:border-[rgba(91,154,58,.4)] transition-colors resize-none" />
              </div>
              <button
                disabled={!fbMessage.trim() || fbSending}
                onClick={async () => {
                  setFbSending(true);
                  try {
                    // Try API first, fall back to mailto
                    const res = await fetch('/api/feedback', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: fbName, email: fbEmail, message: fbMessage }),
                    });
                    if (res.ok) {
                      showToast(lang === 'sv' ? '🙏 Tack för din feedback!' : '🙏 Thanks for your feedback!');
                      setFeedbackOpen(false); setFbName(''); setFbEmail(''); setFbMessage('');
                    } else {
                      // Fallback: open mailto
                      window.location.href = `mailto:info@rovdjursradar.se?subject=${encodeURIComponent('Rovdjursradar Beta Feedback')}&body=${encodeURIComponent(`Namn: ${fbName || 'Anonym'}\nE-post: ${fbEmail || '-'}\n\n${fbMessage}`)}`;
                      setFeedbackOpen(false);
                    }
                  } catch {
                    window.location.href = `mailto:info@rovdjursradar.se?subject=${encodeURIComponent('Rovdjursradar Beta Feedback')}&body=${encodeURIComponent(`Namn: ${fbName || 'Anonym'}\nE-post: ${fbEmail || '-'}\n\n${fbMessage}`)}`;
                    setFeedbackOpen(false);
                  }
                  setFbSending(false);
                }}
                className={`w-full py-2.5 rounded-lg font-bold text-[.82rem] transition-all ${fbMessage.trim() ? 'bg-[#2D5016] text-white hover:bg-[#3a6b1e] cursor-pointer' : 'bg-white/[.04] text-[#444] cursor-not-allowed'}`}>
                {fbSending ? (lang === 'sv' ? 'Skickar...' : 'Sending...') : (lang === 'sv' ? 'Skicka feedback' : 'Send feedback')}
              </button>
              <p className="text-[.58rem] text-[#555] text-center">{lang === 'sv' ? 'Skickas till' : 'Sent to'} info@rovdjursradar.se</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOAST ═══ */}
      {toast && <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[3000] bg-[#2D5016] text-white px-4 py-2 rounded-lg text-[.72rem] font-semibold animate-[fadeIn_.2s_ease]">{toast}</div>}

      {/* ═══ LOADING ═══ */}
      {loading && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <PawLogo size={48} />
            <div className="text-[#D4A843] text-sm font-bold tracking-widest mt-3">ROVDJURSRADAR</div>
            <div className="text-[#666] text-xs mt-1">{t.loading}</div>
          </div>
        </div>
      )}

      {/* ═══ PASSWORD GATE ═══ */}
      {!unlocked && (
        <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.85)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:'40px 32px',width:'100%',maxWidth:400,border:'1px solid rgba(255,255,255,.07)',textAlign:'center'}}>
            <PawLogo size={48} />
            <h1 style={{fontSize:'1.1rem',fontWeight:800,letterSpacing:3,color:'#fff',marginBottom:4,marginTop:16}}>ROVDJURSRADAR</h1>
            <p style={{fontSize:'.75rem',color:'#D4A843',marginBottom:24}}>{lang === 'sv' ? 'Kolla innan du går ut' : 'Know before you go'}</p>
            <p style={{fontSize:'.72rem',color:'#999',marginBottom:16,lineHeight:1.6}}>{t.gateTitle}</p>
            <input type="password" placeholder={t.gatePassword} value={gatePassword}
              onChange={e => { setGatePassword(e.target.value); setGateError(false); }}
              onKeyDown={e => e.key === 'Enter' && tryUnlock()}
              style={{width:'100%',padding:'11px 14px',borderRadius:8,border:gateError?'1.5px solid #B83230':'1px solid rgba(255,255,255,.12)',background:'#1e1e1e',color:'#e8e8e8',fontFamily:'inherit',fontSize:'.85rem',marginBottom:12,outline:'none'}} />
            {gateError && <p style={{fontSize:'.7rem',color:'#B83230',marginBottom:8}}>{t.gateWrong}</p>}
            <button onClick={tryUnlock} style={{width:'100%',padding:'11px',borderRadius:8,border:0,background:'#2D5016',color:'#fff',fontFamily:'inherit',fontSize:'.85rem',fontWeight:700,cursor:'pointer'}}>{t.gateOpen}</button>
            <p style={{fontSize:'.6rem',color:'#444',marginTop:16}}>{t.gateContact}</p>
          </div>
        </div>
      )}
    </div>
  );
}
