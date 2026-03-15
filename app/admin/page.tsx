'use client';

import { useState, useEffect, useCallback } from 'react';

const SPECIES: Record<string, { name: string; emoji: string; color: string }> = {
  wolf: { name: 'Varg', emoji: '🐺', color: '#B83230' },
  lynx: { name: 'Lodjur', emoji: '🐱', color: '#D4760A' },
  bear: { name: 'Björn', emoji: '🐻', color: '#7A4B1E' },
  eagle: { name: 'Kungsörn', emoji: '🦅', color: '#C9A800' },
  wolverine: { name: 'Järv', emoji: '🦡', color: '#8B2500' },
};

const OBS: Record<string, string> = { visual: 'Synobs', tracks: 'Spår', camera: 'Kamera', damage: 'Skador', dead: 'Döda', dna: 'DNA' };
const SRC: Record<string, string> = { official: 'Rovbase', club: 'Jaktlag', crowd: 'Crowd', skandobs: 'Skandobs' };

type Sighting = {
  id: string;
  predator_type: string;
  observation_type: string;
  source: string;
  latitude: number;
  longitude: number;
  county: string;
  sighted_at: string;
  count: number;
  notes: string | null;
  verified: boolean;
  flagged: boolean;
  trust_score: number;
  flag_count: number;
  created_at: string;
};

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('all');

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const fetchSightings = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', secret }),
    });
    const data = await res.json();
    if (data.sightings) {
      setSightings(data.sightings);
      setLoggedIn(true);
    } else {
      showMsg(data.error || 'Fel lösenord');
    }
    setLoading(false);
  }, [secret]);

  const doAction = async (action: string, id: string, label: string) => {
    if (!confirm(`Är du säker? ${label}`)) return;
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, secret, sighting_id: id }),
    });
    const data = await res.json();
    if (data.success) {
      showMsg(`✓ ${label} klar`);
      fetchSightings();
    } else {
      showMsg('Misslyckades');
    }
  };

  const filtered = filter === 'all' ? sightings
    : filter === 'flagged' ? sightings.filter(s => s.flagged)
    : filter === 'unverified' ? sightings.filter(s => !s.verified && !s.flagged)
    : sightings.filter(s => s.predator_type === filter);

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h sedan`;
    return `${Math.floor(h / 24)}d sedan`;
  };

  if (!loggedIn) {
    return (
      <div style={{ background: '#0f0f0f', color: '#e8e8e8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ background: '#161616', borderRadius: 12, padding: 32, width: '100%', maxWidth: 360, border: '1px solid rgba(255,255,255,.07)' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4, letterSpacing: 1 }}>🐾 ADMIN</h1>
          <p style={{ fontSize: '.75rem', color: '#666', marginBottom: 20 }}>Rovdjursradar — Modereringspanel</p>
          <input
            type="password"
            placeholder="Admin-lösenord"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchSightings()}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: '#1e1e1e', color: '#e8e8e8', fontFamily: 'inherit', fontSize: '.85rem', marginBottom: 12 }}
          />
          <button
            onClick={fetchSightings}
            disabled={loading}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: 0, background: '#2D5016', color: '#fff', fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
          {msg && <p style={{ marginTop: 12, fontSize: '.75rem', color: '#B83230' }}>{msg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f0f0f', color: '#e8e8e8', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#161616', borderBottom: '1px solid rgba(255,255,255,.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontWeight: 800, fontSize: '.8rem', letterSpacing: 1 }}>🐾 ADMIN</span>
        <span style={{ fontSize: '.65rem', color: '#666' }}>{sightings.length} totalt · {sightings.filter(s => s.flagged).length} flaggade · {sightings.filter(s => !s.verified).length} overifierade</span>
        <a href="/" style={{ marginLeft: 'auto', fontSize: '.65rem', color: '#D4A843', textDecoration: 'none' }}>← Tillbaka till kartan</a>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        {['all', 'flagged', 'unverified', ...Object.keys(SPECIES)].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 10px', borderRadius: 5, fontSize: '.6rem', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${filter === f ? '#D4A843' : 'rgba(255,255,255,.12)'}`,
              background: filter === f ? 'rgba(212,168,67,.06)' : 'transparent',
              color: filter === f ? '#D4A843' : '#666', fontFamily: 'inherit',
            }}
          >
            {f === 'all' ? `Alla (${sightings.length})` : f === 'flagged' ? `Flaggade (${sightings.filter(s => s.flagged).length})` : f === 'unverified' ? `Overifierade (${sightings.filter(s => !s.verified && !s.flagged).length})` : `${SPECIES[f]?.emoji} ${SPECIES[f]?.name}`}
          </button>
        ))}
        <button onClick={fetchSightings} style={{ padding: '4px 10px', borderRadius: 5, fontSize: '.6rem', fontWeight: 600, border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: '#999', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>🔄 Uppdatera</button>
      </div>

      {/* Toast */}
      {msg && <div style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', background: '#2D5016', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: '.75rem', fontWeight: 600, zIndex: 20 }}>{msg}</div>}

      {/* Sightings list */}
      <div style={{ padding: '0 20px 40px' }}>
        {filtered.map(s => {
          const sp = SPECIES[s.predator_type] || { name: s.predator_type, emoji: '?', color: '#666' };
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,.05)',
              opacity: s.flagged ? 0.4 : 1,
            }}>
              {/* Species icon */}
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: sp.color + '22', border: `2px solid ${sp.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{sp.emoji}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '.8rem' }}>{sp.name}</span>
                  <span style={{ fontSize: '.5rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: s.verified ? 'rgba(45,80,22,.2)' : 'rgba(255,255,255,.06)', color: s.verified ? '#2D5016' : '#666' }}>{s.verified ? 'VERIFIERAD' : 'OVERIFIERAD'}</span>
                  {s.flagged && <span style={{ fontSize: '.5rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(184,50,48,.15)', color: '#B83230' }}>FLAGGAD</span>}
                  <span style={{ fontSize: '.5rem', fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(212,168,67,.1)', color: '#D4A843' }}>{OBS[s.observation_type] || s.observation_type}</span>
                  <span style={{ fontSize: '.5rem', color: '#666' }}>{SRC[s.source] || s.source}</span>
                </div>
                <div style={{ fontSize: '.65rem', color: '#666', marginTop: 3 }}>
                  {s.count} djur · {s.county} · {timeAgo(s.sighted_at)} · trust: {s.trust_score} · flags: {s.flag_count}
                </div>
                {s.notes && <div style={{ fontSize: '.65rem', color: '#999', marginTop: 3, fontStyle: 'italic' }}>"{s.notes}"</div>}
                <div style={{ fontSize: '.55rem', color: '#444', marginTop: 2 }}>ID: {s.id.slice(0, 8)}... · Pos: {s.latitude}, {s.longitude}</div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {!s.verified && (
                  <button onClick={() => doAction('verify', s.id, 'Verifiera observation')} style={{ padding: '4px 8px', borderRadius: 4, fontSize: '.55rem', fontWeight: 600, border: '1px solid rgba(45,80,22,.3)', background: 'transparent', color: '#2D5016', cursor: 'pointer', fontFamily: 'inherit' }}>✓ Verifiera</button>
                )}
                {!s.flagged && (
                  <button onClick={() => doAction('hide', s.id, 'Dölj observation')} style={{ padding: '4px 8px', borderRadius: 4, fontSize: '.55rem', fontWeight: 600, border: '1px solid rgba(212,168,67,.3)', background: 'transparent', color: '#D4A843', cursor: 'pointer', fontFamily: 'inherit' }}>👁 Dölj</button>
                )}
                <button onClick={() => doAction('delete', s.id, 'RADERA observation permanent')} style={{ padding: '4px 8px', borderRadius: 4, fontSize: '.55rem', fontWeight: 600, border: '1px solid rgba(184,50,48,.3)', background: 'transparent', color: '#B83230', cursor: 'pointer', fontFamily: 'inherit' }}>🗑 Radera</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
