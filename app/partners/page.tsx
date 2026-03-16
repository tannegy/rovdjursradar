'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Partner = {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  website_url: string | null;
  partner_type: string;
  sort_order: number;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  partner: { label: 'Partner', color: '#2D5016' },
  data: { label: 'Datapartner', color: '#D4760A' },
  knowledge: { label: 'Kunskapspartner', color: '#C9A800' },
  institutional: { label: 'Myndighet', color: '#7A4B1E' },
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabase
        .from('partners')
        .select('*')
        .order('sort_order', { ascending: true });
      if (data) setPartners(data);
      setLoading(false);
    };
    fetchPartners();
  }, []);

  return (
    <div style={{ background: '#0f0f0f', color: '#e8e8e8', minHeight: '100vh', overflow: 'auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(15,15,15,.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,.07)', height: 48, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg viewBox="0 0 40 40" fill="#D4A843" style={{ width: 18, height: 18 }}><ellipse cx="12" cy="10" rx="4" ry="4.5"/><ellipse cx="24" cy="8" rx="3.5" ry="4"/><ellipse cx="33" cy="13" rx="3" ry="3.5"/><ellipse cx="5" cy="17" rx="3" ry="3.5"/><path d="M7 25 Q10 35 20 37 Q30 35 33 25 Q30 20 20 19 Q10 20 7 25Z"/></svg>
          <span style={{ fontWeight: 800, fontSize: '.7rem', letterSpacing: 2, color: '#fff' }}>ROVDJURSRADAR</span>
        </a>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ padding: '5px 11px', borderRadius: 6, fontSize: '.63rem', fontWeight: 600, color: '#D4A843', textDecoration: 'none' }}>← Kartan</a>
      </nav>

      {/* Hero */}
      <div style={{ background: '#1B3A0C', padding: '48px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: 2, marginBottom: 8 }}>Partners</h1>
        <p style={{ fontSize: '.9rem', color: '#D4A843', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          Rovdjursradar byggs i samarbete med jaktföreningar, myndigheter, friluftsorganisationer och forskare. Tillsammans gör vi Sveriges rovdjursinformation tillgänglig för alla.
        </p>
      </div>

      {/* Partners grid */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Laddar partners...</div>
        ) : partners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Inga partners ännu.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {partners.map(p => {
              const typeInfo = TYPE_LABELS[p.partner_type] || TYPE_LABELS.partner;
              return (
                <div key={p.id} style={{
                  background: '#161616',
                  border: '1px solid rgba(255,255,255,.07)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color .15s',
                }}>
                  {/* Logo area */}
                  <div style={{
                    height: 140,
                    background: '#1e1e1e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid rgba(255,255,255,.05)',
                  }}>
                    {p.logo_url ? (
                      <img
                        src={p.logo_url}
                        alt={p.name}
                        style={{ maxWidth: '70%', maxHeight: 100, objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{
                        fontSize: '2rem',
                        fontWeight: 800,
                        color: 'rgba(212,168,67,.3)',
                        letterSpacing: 2,
                      }}>
                        {p.name.split(' ').map(w => w[0]).join('').slice(0, 3)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: '#fff', margin: 0, flex: 1 }}>{p.name}</h3>
                      <span style={{
                        fontSize: '.5rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: typeInfo.color + '22',
                        color: typeInfo.color,
                        textTransform: 'uppercase',
                        letterSpacing: .5,
                        flexShrink: 0,
                      }}>{typeInfo.label}</span>
                    </div>
                    <p style={{ fontSize: '.78rem', color: '#999', lineHeight: 1.65, margin: 0, flex: 1 }}>
                      {p.description}
                    </p>
                    {p.website_url && (
                      <a
                        href={p.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 14,
                          fontSize: '.7rem',
                          fontWeight: 600,
                          color: '#D4A843',
                          textDecoration: 'none',
                        }}
                      >
                        Besök webbplats →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div style={{
          marginTop: 48,
          padding: '32px 28px',
          background: '#161616',
          border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#D4A843', marginBottom: 8 }}>Bli partner</h2>
          <p style={{ fontSize: '.8rem', color: '#999', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 16px' }}>
            Vi söker samarbeten med jaktföreningar, kommuner, friluftsorganisationer och lantbruksgrupper.
            Vi ber inte om pengar — vi ber om signal, distribution och data. Tidiga partners får inflytande över plattformens riktning.
          </p>
          <a href="mailto:info@rovdjursradar.se" style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 8,
            background: '#2D5016',
            color: '#fff',
            fontSize: '.82rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}>Kontakta oss</a>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.07)', fontSize: '.6rem', color: '#444', display: 'flex', justifyContent: 'space-between' }}>
          <span>Rovdjursradar · Mars 2026</span>
          <a href="/integritetspolicy" style={{ color: '#444', textDecoration: 'none' }}>Integritetspolicy</a>
        </div>
      </div>
    </div>
  );
}
