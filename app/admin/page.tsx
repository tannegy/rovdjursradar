'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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
  id: string; predator_type: string; observation_type: string; source: string;
  latitude: number; longitude: number; county: string; sighted_at: string;
  count: number; notes: string | null; verified: boolean; flagged: boolean;
  trust_score: number; flag_count: number; created_at: string;
};

const CONTENT_FIELDS = [
  { key: 'about_problem', label: '🇸🇪 Problemet', rows: 5 },
  { key: 'about_problem_en', label: '🇬🇧 The Problem', rows: 5 },
  { key: 'about_solution', label: '🇸🇪 Lösningen', rows: 8 },
  { key: 'about_solution_en', label: '🇬🇧 The Solution', rows: 8 },
  { key: 'about_stats_wolf', label: 'Statistik: Varg (siffra)', rows: 1 },
  { key: 'about_stats_wolf_label', label: '🇸🇪 Statistik: Varg (etikett)', rows: 1 },
  { key: 'about_stats_wolf_label_en', label: '🇬🇧 Stats: Wolf (label)', rows: 1 },
  { key: 'about_stats_bear', label: 'Statistik: Björn (siffra)', rows: 1 },
  { key: 'about_stats_bear_label', label: '🇸🇪 Statistik: Björn (etikett)', rows: 1 },
  { key: 'about_stats_bear_label_en', label: '🇬🇧 Stats: Bear (label)', rows: 1 },
  { key: 'about_stats_lynx', label: 'Statistik: Lodjur (siffra)', rows: 1 },
  { key: 'about_stats_lynx_label', label: '🇸🇪 Statistik: Lodjur (etikett)', rows: 1 },
  { key: 'about_stats_lynx_label_en', label: '🇬🇧 Stats: Lynx (label)', rows: 1 },
  { key: 'about_why_now', label: '🇸🇪 Varför nu?', rows: 6 },
  { key: 'about_why_now_en', label: '🇬🇧 Why Now?', rows: 6 },
  { key: 'about_partners', label: '🇸🇪 Samarbeta med oss', rows: 4 },
  { key: 'about_partners_en', label: '🇬🇧 Partner With Us', rows: 4 },
  { key: 'about_vision', label: '🇸🇪 Vår vision', rows: 4 },
  { key: 'about_vision_en', label: '🇬🇧 Our Vision', rows: 4 },
  { key: 'partners_hero_text', label: '🇸🇪 Partnersida: Intro-text', rows: 3 },
  { key: 'partners_hero_text_en', label: '🇬🇧 Partners page: Intro text', rows: 3 },
  { key: 'partners_cta_title', label: '🇸🇪 Partnersida: CTA rubrik', rows: 1 },
  { key: 'partners_cta_title_en', label: '🇬🇧 Partners page: CTA title', rows: 1 },
  { key: 'partners_cta_text', label: '🇸🇪 Partnersida: CTA text', rows: 4 },
  { key: 'partners_cta_text_en', label: '🇬🇧 Partners page: CTA text', rows: 4 },
  { key: 'partners_cta_button', label: '🇸🇪 Partnersida: Knapp-text', rows: 1 },
  { key: 'partners_cta_button_en', label: '🇬🇧 Partners page: Button text', rows: 1 },
  { key: 'partners_cta_email', label: 'Partnersida: Kontakt-email', rows: 1 },
];

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState<'sightings' | 'content' | 'partners'>('sightings');
  const [content, setContent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Partners state
  const [partners, setPartners] = useState<{id:string;name:string;description:string;logo_url:string|null;website_url:string|null;partner_type:string;sort_order:number;visible:boolean}[]>([]);
  const [editPartner, setEditPartner] = useState<{id?:string;name:string;description:string;logo_url:string;website_url:string;partner_type:string;sort_order:number;visible:boolean}|null>(null);

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
      fetchContent();
      fetchPartners();
    } else {
      showMsg(data.error || 'Fel lösenord');
    }
    setLoading(false);
  }, [secret]);

  const fetchContent = async () => {
    const { data, error } = await supabase.from('page_content').select('key, value');
    if (!error && data) {
      const c: Record<string, string> = {};
      data.forEach((row: { key: string; value: string }) => { c[row.key] = row.value; });
      setContent(c);
    }
  };

  const fetchPartners = async () => {
    const { data } = await supabase.from('partners').select('*').order('sort_order');
    if (data) setPartners(data);
  };

  const savePartner = async () => {
    if (!editPartner) return;
    setSaving('partner');
    if (editPartner.id) {
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_partner', secret, ...editPartner }) });
      const d = await res.json();
      if (d.success) { showMsg('✓ Partner uppdaterad'); fetchPartners(); setEditPartner(null); }
      else showMsg('Kunde inte spara');
    } else {
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_partner', secret, ...editPartner }) });
      const d = await res.json();
      if (d.success) { showMsg('✓ Partner tillagd'); fetchPartners(); setEditPartner(null); }
      else showMsg('Kunde inte lägga till');
    }
    setSaving(null);
  };

  const deletePartner = async (id: string, name: string) => {
    if (!confirm('Radera partner: ' + name + '?')) return;
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_partner', secret, partner_id: id }) });
    const d = await res.json();
    if (d.success) { showMsg('✓ Partner raderad'); fetchPartners(); }
    else showMsg('Misslyckades');
  };

  const saveContent = async (key: string, value: string) => {
    setSaving(key);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_content', secret, content_key: key, content_value: value }),
    });
    const data = await res.json();
    if (data.success) {
      showMsg('✓ Sparat: ' + key);
      fetchContent();
    } else {
      showMsg('Kunde inte spara');
    }
    setSaving(null);
  };

  const doAction = async (action: string, id: string, label: string) => {
    if (!confirm('Är du säker? ' + label)) return;
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, secret, sighting_id: id }),
    });
    const data = await res.json();
    if (data.success) { showMsg('✓ ' + label + ' klar'); fetchSightings(); }
    else showMsg('Misslyckades');
  };

  const filtered = filter === 'all' ? sightings
    : filter === 'flagged' ? sightings.filter(s => s.flagged)
    : filter === 'unverified' ? sightings.filter(s => !s.verified && !s.flagged)
    : sightings.filter(s => s.predator_type === filter);

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 24) return h + 'h sedan';
    return Math.floor(h / 24) + 'd sedan';
  };

  // Styles
  const S = {
    page: { background: '#0f0f0f', color: '#e8e8e8', minHeight: '100vh', height: '100vh', overflow: 'auto', fontFamily: 'Inter, system-ui, sans-serif' } as const,
    input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: '#1e1e1e', color: '#e8e8e8', fontFamily: 'inherit', fontSize: '.85rem' } as const,
    btn: { padding: '10px', borderRadius: 8, border: 0, background: '#2D5016', color: '#fff', fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer', width: '100%' } as const,
    textarea: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: '#1e1e1e', color: '#e8e8e8', fontFamily: 'inherit', fontSize: '.8rem', resize: 'vertical' as const, lineHeight: 1.6 },
    saveBtn: { padding: '6px 14px', borderRadius: 6, border: 0, background: '#2D5016', color: '#fff', fontFamily: 'inherit', fontSize: '.7rem', fontWeight: 600, cursor: 'pointer' } as const,
  };

  if (!loggedIn) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#161616', borderRadius: 12, padding: 32, width: '100%', maxWidth: 360, border: '1px solid rgba(255,255,255,.07)' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4, letterSpacing: 1 }}>🐾 ADMIN</h1>
          <p style={{ fontSize: '.75rem', color: '#666', marginBottom: 20 }}>Rovdjursradar — Modereringspanel</p>
          <input type="password" placeholder="Admin-lösenord" value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchSightings()}
            style={{ ...S.input, marginBottom: 12 }} />
          <button onClick={fetchSightings} disabled={loading} style={S.btn}>
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
          {msg && <p style={{ marginTop: 12, fontSize: '.75rem', color: '#B83230' }}>{msg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background: '#161616', borderBottom: '1px solid rgba(255,255,255,.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontWeight: 800, fontSize: '.8rem', letterSpacing: 1 }}>🐾 ADMIN</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
          <button onClick={() => setTab('sightings')} style={{
            padding: '5px 12px', borderRadius: 5, fontSize: '.65rem', fontWeight: 600, cursor: 'pointer',
            border: tab === 'sightings' ? '1px solid #D4A843' : '1px solid rgba(255,255,255,.12)',
            background: tab === 'sightings' ? 'rgba(212,168,67,.06)' : 'transparent',
            color: tab === 'sightings' ? '#D4A843' : '#666', fontFamily: 'inherit'
          }}>Observationer ({sightings.length})</button>
          <button onClick={() => setTab('content')} style={{
            padding: '5px 12px', borderRadius: 5, fontSize: '.65rem', fontWeight: 600, cursor: 'pointer',
            border: tab === 'content' ? '1px solid #D4A843' : '1px solid rgba(255,255,255,.12)',
            background: tab === 'content' ? 'rgba(212,168,67,.06)' : 'transparent',
            color: tab === 'content' ? '#D4A843' : '#666', fontFamily: 'inherit'
          }}>Om-sidan (Innehåll)</button>
          <button onClick={() => setTab('partners')} style={{
            padding: '5px 12px', borderRadius: 5, fontSize: '.65rem', fontWeight: 600, cursor: 'pointer',
            border: tab === 'partners' ? '1px solid #D4A843' : '1px solid rgba(255,255,255,.12)',
            background: tab === 'partners' ? 'rgba(212,168,67,.06)' : 'transparent',
            color: tab === 'partners' ? '#D4A843' : '#666', fontFamily: 'inherit'
          }}>Partners ({partners.length})</button>
        </div>
        <a href="/" style={{ marginLeft: 'auto', fontSize: '.65rem', color: '#D4A843', textDecoration: 'none' }}>← Kartan</a>
      </div>

      {/* Toast */}
      {msg && <div style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', background: '#2D5016', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: '.75rem', fontWeight: 600, zIndex: 20 }}>{msg}</div>}

      {/* CONTENT EDITOR TAB */}
      {tab === 'content' && (
        <div style={{ padding: '20px', maxWidth: 700 }}>
          <p style={{ fontSize: '.75rem', color: '#666', marginBottom: 20 }}>
            Redigera texterna på Om-sidan. Ändringarna syns direkt efter att du sparar.
          </p>
          {CONTENT_FIELDS.map(field => (
            <div key={field.key} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: '.7rem', fontWeight: 700, color: '#D4A843', textTransform: 'uppercase', letterSpacing: 1 }}>{field.label}</label>
                <button
                  onClick={() => saveContent(field.key, content[field.key] || '')}
                  disabled={saving === field.key}
                  style={{ ...S.saveBtn, opacity: saving === field.key ? 0.5 : 1 }}>
                  {saving === field.key ? 'Sparar...' : 'Spara'}
                </button>
              </div>
              <textarea
                value={content[field.key] || ''}
                onChange={e => setContent({ ...content, [field.key]: e.target.value })}
                rows={field.rows}
                style={{ ...S.textarea, minHeight: field.rows === 1 ? 36 : undefined }}
              />
              <div style={{ fontSize: '.55rem', color: '#444', marginTop: 2 }}>Nyckel: {field.key}</div>
            </div>
          ))}
        </div>
      )}

      {/* SIGHTINGS TAB */}
      {tab === 'sightings' && (
        <>
          {/* Filters */}
          <div style={{ padding: '12px 20px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
            {['all', 'flagged', 'unverified', ...Object.keys(SPECIES)].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 10px', borderRadius: 5, fontSize: '.6rem', fontWeight: 600, cursor: 'pointer',
                border: filter === f ? '1px solid #D4A843' : '1px solid rgba(255,255,255,.12)',
                background: filter === f ? 'rgba(212,168,67,.06)' : 'transparent',
                color: filter === f ? '#D4A843' : '#666', fontFamily: 'inherit',
              }}>
                {f === 'all' ? 'Alla (' + sightings.length + ')' : f === 'flagged' ? 'Flaggade (' + sightings.filter(s => s.flagged).length + ')' : f === 'unverified' ? 'Overifierade (' + sightings.filter(s => !s.verified && !s.flagged).length + ')' : (SPECIES[f]?.emoji || '') + ' ' + (SPECIES[f]?.name || f)}
              </button>
            ))}
            <button onClick={fetchSightings} style={{ padding: '4px 10px', borderRadius: 5, fontSize: '.6rem', fontWeight: 600, border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: '#999', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>🔄 Uppdatera</button>
          </div>

          {/* Sightings list */}
          <div style={{ padding: '0 20px 40px' }}>
            {filtered.map(s => {
              const sp = SPECIES[s.predator_type] || { name: s.predator_type, emoji: '?', color: '#666' };
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.05)', opacity: s.flagged ? 0.4 : 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: sp.color + '22', border: '2px solid ' + sp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{sp.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '.8rem' }}>{sp.name}</span>
                      <span style={{ fontSize: '.5rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: s.verified ? 'rgba(45,80,22,.2)' : 'rgba(255,255,255,.06)', color: s.verified ? '#2D5016' : '#666' }}>{s.verified ? 'VERIFIERAD' : 'OVERIFIERAD'}</span>
                      {s.flagged && <span style={{ fontSize: '.5rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(184,50,48,.15)', color: '#B83230' }}>FLAGGAD</span>}
                      <span style={{ fontSize: '.5rem', fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(212,168,67,.1)', color: '#D4A843' }}>{OBS[s.observation_type] || s.observation_type}</span>
                      <span style={{ fontSize: '.5rem', color: '#666' }}>{SRC[s.source] || s.source}</span>
                    </div>
                    <div style={{ fontSize: '.65rem', color: '#666', marginTop: 3 }}>{s.count} djur · {s.county} · {timeAgo(s.sighted_at)} · trust: {s.trust_score} · flags: {s.flag_count}</div>
                    {s.notes && <div style={{ fontSize: '.65rem', color: '#999', marginTop: 3, fontStyle: 'italic' }}>"{s.notes}"</div>}
                    <div style={{ fontSize: '.55rem', color: '#444', marginTop: 2 }}>ID: {s.id.slice(0, 8)}... · Pos: {s.latitude}, {s.longitude}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!s.verified && <button onClick={() => doAction('verify', s.id, 'Verifiera')} style={{ padding: '4px 8px', borderRadius: 4, fontSize: '.55rem', fontWeight: 600, border: '1px solid rgba(45,80,22,.3)', background: 'transparent', color: '#2D5016', cursor: 'pointer', fontFamily: 'inherit' }}>✓ Verifiera</button>}
                    {!s.flagged && <button onClick={() => doAction('hide', s.id, 'Dölj')} style={{ padding: '4px 8px', borderRadius: 4, fontSize: '.55rem', fontWeight: 600, border: '1px solid rgba(212,168,67,.3)', background: 'transparent', color: '#D4A843', cursor: 'pointer', fontFamily: 'inherit' }}>👁 Dölj</button>}
                    <button onClick={() => doAction('delete', s.id, 'RADERA')} style={{ padding: '4px 8px', borderRadius: 4, fontSize: '.55rem', fontWeight: 600, border: '1px solid rgba(184,50,48,.3)', background: 'transparent', color: '#B83230', cursor: 'pointer', fontFamily: 'inherit' }}>🗑 Radera</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* PARTNERS TAB */}
      {tab === 'partners' && (
        <div style={{ padding: '20px', maxWidth: 700 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: '.75rem', color: '#666', margin: 0 }}>Hantera partners som visas på partnersidan.</p>
            <button onClick={() => setEditPartner({ name: '', description: '', logo_url: '', website_url: '', partner_type: 'partner', sort_order: partners.length, visible: true })}
              style={{ ...S.saveBtn, background: '#2D5016' }}>+ Lägg till</button>
          </div>

          {/* Edit form */}
          {editPartner && (
            <div style={{ background: '#1e1e1e', borderRadius: 10, padding: 20, border: '1px solid rgba(255,255,255,.1)', marginBottom: 20 }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#D4A843', marginBottom: 12 }}>{editPartner.id ? 'Redigera partner' : 'Ny partner'}</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <input placeholder="Namn" value={editPartner.name} onChange={e => setEditPartner({ ...editPartner, name: e.target.value })} style={S.input} />
                <textarea placeholder="Beskrivning" value={editPartner.description} onChange={e => setEditPartner({ ...editPartner, description: e.target.value })} rows={3} style={S.textarea} />
                <input placeholder="Logo URL (valfritt)" value={editPartner.logo_url} onChange={e => setEditPartner({ ...editPartner, logo_url: e.target.value })} style={S.input} />
                <input placeholder="Webbplats URL (valfritt)" value={editPartner.website_url} onChange={e => setEditPartner({ ...editPartner, website_url: e.target.value })} style={S.input} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={editPartner.partner_type} onChange={e => setEditPartner({ ...editPartner, partner_type: e.target.value })} style={{ ...S.input, flex: 1 }}>
                    <option value="partner">Partner</option>
                    <option value="data">Datapartner</option>
                    <option value="knowledge">Kunskapspartner</option>
                    <option value="institutional">Myndighet</option>
                  </select>
                  <input type="number" placeholder="Ordning" value={editPartner.sort_order} onChange={e => setEditPartner({ ...editPartner, sort_order: parseInt(e.target.value) || 0 })} style={{ ...S.input, width: 80 }} />
                </div>
                <label style={{ fontSize: '.7rem', color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={editPartner.visible} onChange={e => setEditPartner({ ...editPartner, visible: e.target.checked })} /> Synlig på partnersidan
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={savePartner} disabled={saving === 'partner' || !editPartner.name} style={{ ...S.saveBtn, opacity: saving === 'partner' ? 0.5 : 1 }}>
                    {saving === 'partner' ? 'Sparar...' : editPartner.id ? 'Uppdatera' : 'Lägg till'}
                  </button>
                  <button onClick={() => setEditPartner(null)} style={{ ...S.saveBtn, background: '#333' }}>Avbryt</button>
                </div>
              </div>
            </div>
          )}

          {/* Partner list */}
          {partners.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.05)', opacity: p.visible ? 1 : 0.4 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#282828', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 700, color: '#D4A843', flexShrink: 0, overflow: 'hidden' }}>
                {p.logo_url ? <img src={p.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '.8rem' }}>{p.name}</span>
                  <span style={{ fontSize: '.5rem', fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(212,168,67,.1)', color: '#D4A843' }}>{p.partner_type}</span>
                  {!p.visible && <span style={{ fontSize: '.5rem', fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(184,50,48,.1)', color: '#B83230' }}>DOLD</span>}
                </div>
                <div style={{ fontSize: '.6rem', color: '#666', marginTop: 2 }}>{p.description.slice(0, 80)}...</div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => setEditPartner({ id: p.id, name: p.name, description: p.description, logo_url: p.logo_url || '', website_url: p.website_url || '', partner_type: p.partner_type, sort_order: p.sort_order, visible: p.visible })}
                  style={{ padding: '4px 8px', borderRadius: 4, fontSize: '.55rem', fontWeight: 600, border: '1px solid rgba(212,168,67,.3)', background: 'transparent', color: '#D4A843', cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Redigera</button>
                <button onClick={() => deletePartner(p.id, p.name)}
                  style={{ padding: '4px 8px', borderRadius: 4, fontSize: '.55rem', fontWeight: 600, border: '1px solid rgba(184,50,48,.3)', background: 'transparent', color: '#B83230', cursor: 'pointer', fontFamily: 'inherit' }}>🗑 Radera</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
