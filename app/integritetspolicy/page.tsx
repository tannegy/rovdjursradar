import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integritetspolicy',
  description: 'Rovdjursradars integritetspolicy och hantering av personuppgifter.',
};

export default function Integritetspolicy() {
  return (
    <div style={{ background: '#0f0f0f', color: '#e8e8e8', minHeight: '100vh', overflow: 'auto' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        <a href="/" style={{ color: '#D4A843', textDecoration: 'none', fontSize: '.8rem' }}>&larr; Tillbaka till kartan</a>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '24px 0 8px', letterSpacing: '1px' }}>Integritetspolicy</h1>
        <p style={{ color: '#666', fontSize: '.8rem', marginBottom: '32px' }}>Senast uppdaterad: mars 2026</p>

        <div style={{ fontSize: '.85rem', color: '#999', lineHeight: 1.8 }}>
          <h2 style={{ color: '#D4A843', fontSize: '1rem', fontWeight: 700, margin: '24px 0 8px' }}>1. Ansvarig</h2>
          <p>Rovdjursradar (rovdjursradar.se) är en tjänst som drivs som ett soloprojekt. Kontakt: info@rovdjursradar.se</p>

          <h2 style={{ color: '#D4A843', fontSize: '1rem', fontWeight: 700, margin: '24px 0 8px' }}>2. Vilka uppgifter vi samlar in</h2>
          <p><strong style={{ color: '#e8e8e8' }}>Observationsrapporter:</strong> Art, observationstyp, plats (avrundad till ~1 km), tidpunkt, antal djur, valfri anteckning. Inga personuppgifter krävs — rapportering är anonym.</p>
          <p><strong style={{ color: '#e8e8e8' }}>IP-adress:</strong> Vi hashar din IP-adress för att förhindra spam (max 5 rapporter per timme). Hashen kan inte kopplas tillbaka till din IP-adress och raderas automatiskt efter 30 dagar.</p>
          <p><strong style={{ color: '#e8e8e8' }}>Platsdata:</strong> Om du tillåter geolokalisering i webbläsaren används din position enbart lokalt för att centrera kartan och visa närliggande observationer. Vi sparar aldrig din position.</p>
          <p><strong style={{ color: '#e8e8e8' }}>Analysdata:</strong> Vi använder Plausible Analytics (privacy-first, cookiefritt) för anonym besöksstatistik. Ingen personlig data samlas in.</p>

          <h2 style={{ color: '#D4A843', fontSize: '1rem', fontWeight: 700, margin: '24px 0 8px' }}>3. Rättslig grund</h2>
          <p>Behandlingen av hasnade IP-adresser för ratebegränsning baseras på vårt berättigade intresse att upprätthålla tjänstens kvalitet och förhindra missbruk (GDPR artikel 6.1.f).</p>

          <h2 style={{ color: '#D4A843', fontSize: '1rem', fontWeight: 700, margin: '24px 0 8px' }}>4. Cookies</h2>
          <p>Rovdjursradar använder inga spårningscookies. Inga tredjepartscookies sätts. Plausible Analytics är cookiefritt.</p>

          <h2 style={{ color: '#D4A843', fontSize: '1rem', fontWeight: 700, margin: '24px 0 8px' }}>5. Delning av data</h2>
          <p>Vi delar aldrig personuppgifter med tredje part. Anonymiserad, aggregerad observationsdata kan delas med forskare och myndigheter för att stödja rovdjursförvaltning.</p>

          <h2 style={{ color: '#D4A843', fontSize: '1rem', fontWeight: 700, margin: '24px 0 8px' }}>6. Datalagring</h2>
          <p>Observationsdata lagras på Supabase-servrar inom EU. IP-hashar raderas automatiskt efter 30 dagar.</p>

          <h2 style={{ color: '#D4A843', fontSize: '1rem', fontWeight: 700, margin: '24px 0 8px' }}>7. Dina rättigheter</h2>
          <p>Enligt GDPR har du rätt att: begära tillgång till dina uppgifter, begära rättelse eller radering, invända mot behandling, och lämna klagomål till Integritetsskyddsmyndigheten (IMY). Kontakta oss på info@rovdjursradar.se.</p>

          <h2 style={{ color: '#D4A843', fontSize: '1rem', fontWeight: 700, margin: '24px 0 8px' }}>8. Ändringar</h2>
          <p>Vi kan uppdatera denna policy. Väsentliga ändringar meddelas på webbplatsen.</p>
        </div>
      </div>
    </div>
  );
}
