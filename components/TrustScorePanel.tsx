'use client';

import { useMemo } from 'react';
import type { GeoState } from '@/hooks/useGeolocation';

interface Props {
  geo: GeoState;
  reportLat: number | null;
  reportLng: number | null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TrustScorePanel({ geo, reportLat, reportLng }: Props) {
  const { score, distKm } = useMemo(() => {
    let s = 1.0;
    if (geo.deviceType === 'desktop') s -= 0.3;
    else if (geo.deviceType === 'unknown') s -= 0.2;

    if (geo.accuracy === null) s -= 0.3;
    else if (geo.accuracy > 5000) s -= 0.25;
    else if (geo.accuracy > 500) s -= 0.15;
    else if (geo.accuracy > 50) s -= 0.05;

    let d: number | null = null;
    if (geo.lat && geo.lng && reportLat && reportLng) {
      d = haversineKm(geo.lat, geo.lng, reportLat, reportLng);
      if (d > 100) s -= 0.4;
      else if (d > 20) s -= 0.25;
      else if (d > 5) s -= 0.1;
      else if (d > 1) s -= 0.05;
    } else {
      s -= 0.15;
    }

    if (geo.status === 'denied') s -= 0.1;

    return { score: Math.max(0.1, Math.min(1.0, Math.round(s * 100) / 100)), distKm: d };
  }, [geo, reportLat, reportLng]);

  const color = score >= 0.8 ? '#8bc76a' : score >= 0.5 ? '#e8c96e' : '#e87070';
  const barPct = `${score * 100}%`;

  return (
    <div className="bg-white/[.03] border border-white/[.08] rounded-[10px] p-3.5 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[.65rem] font-semibold tracking-wider uppercase text-white/40">
          Trust Score
        </span>
        <span className="text-[1.3rem] font-bold" style={{ color }}>
          {score.toFixed(1)}
        </span>
      </div>

      {/* Bar */}
      <div className="w-full h-[5px] bg-white/[.06] rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: barPct, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>

      {/* Factors */}
      <div className="flex flex-col gap-1.5">
        <Row
          icon="📍" label="Plats"
          value={
            geo.status === 'found' ? `±${Math.round(geo.accuracy!)}m ✓` :
            geo.status === 'desktop' ? `±${Math.round(geo.accuracy || 0)}m ~` :
            geo.status === 'denied' ? 'Nekad ✗' : 'Väntar...'
          }
          color={
            geo.status === 'found' ? '#8bc76a' :
            geo.status === 'desktop' ? '#e8c96e' :
            geo.status === 'denied' ? '#e87070' : 'rgba(255,255,255,.25)'
          }
        />
        <Row
          icon={geo.deviceType === 'mobile' ? '📱' : '💻'}
          label="Enhet"
          value={geo.deviceType === 'mobile' ? 'Mobil ✓' : geo.deviceType === 'desktop' ? 'Desktop (−0.3)' : 'Okänd'}
          color={geo.deviceType === 'mobile' ? '#8bc76a' : '#e8c96e'}
        />
        <Row
          icon="📏" label="Avstånd"
          value={
            distKm !== null
              ? (distKm < 1 ? `${Math.round(distKm * 1000)}m ✓` : `${distKm.toFixed(1)}km`)
              : '—'
          }
          color={
            distKm === null ? 'rgba(255,255,255,.25)' :
            distKm < 5 ? '#8bc76a' :
            distKm < 50 ? '#e8c96e' : '#e87070'
          }
        />
      </div>

      {/* Distance warning */}
      {distKm !== null && distKm > 20 && (
        <div className={`mt-2.5 px-2.5 py-2 rounded-lg text-[.68rem] leading-relaxed border ${
          distKm > 100
            ? 'bg-[rgba(184,50,48,.1)] border-[rgba(184,50,48,.2)] text-[#e8a0a0]'
            : 'bg-[rgba(212,168,67,.1)] border-[rgba(212,168,67,.2)] text-[#e8c96e]'
        }`}>
          ⚠️ Rapporten är {distKm.toFixed(0)} km från din plats.
          {distKm > 100 ? ' Mycket låg trovärdighet.' : ' Trust score reducerad.'}
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-[.65rem]">
      <span className="text-white/45 flex items-center gap-1.5">{icon} {label}</span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}
