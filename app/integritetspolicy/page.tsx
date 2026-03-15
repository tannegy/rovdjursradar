import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integritetspolicy',
  description: 'Rovdjursradars integritetspolicy och hantering av personuppgifter enligt GDPR.',
};

export default function Integritetspolicy() {
  const h2 = { color: '#D4A843', fontSize: '1rem', fontWeight: 700, margin: '28px 0 8px' } as const;
  const h3 = { color: '#e8e8e8', fontSize: '.9rem', fontWeight: 600, margin: '16px 0 6px' } as const;
  const p = { marginBottom: '12px' } as const;
  const strong = { color: '#e8e8e8' } as const;

  return (
    <div style={{ background: '#0f0f0f', color: '#e8e8e8', minHeight: '100vh', height: '100vh', overflow: 'auto' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        <a href="/" style={{ color: '#D4A843', textDecoration: 'none', fontSize: '.8rem' }}>&larr; Tillbaka till kartan</a>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '24px 0 4px', letterSpacing: '1px' }}>Integritetspolicy</h1>
        <p style={{ color: '#666', fontSize: '.8rem', marginBottom: '32px' }}>Senast uppdaterad: mars 2026</p>

        <div style={{ fontSize: '.85rem', color: '#999', lineHeight: 1.8 }}>

          <h2 style={h2}>1. Personuppgiftsansvarig</h2>
          <p style={p}>Rovdjursradar (rovdjursradar.se) är personuppgiftsansvarig för behandlingen av personuppgifter som beskrivs i denna policy. Rovdjursradar drivs som ett enskilt projekt.</p>
          <p style={p}>Kontakt: info@rovdjursradar.se</p>

          <h2 style={h2}>2. Vilka personuppgifter vi behandlar</h2>

          <h3 style={h3}>2.1 Observationsrapporter</h3>
          <p style={p}>När du rapporterar en rovdjursobservation samlar vi in: art, observationstyp (synobs, spår, kamera etc.), ungefärlig plats (avrundad till cirka 1 km precision), tidpunkt, antal djur, samt valfri textanteckning. Ingen inloggning eller registrering krävs. Vi samlar inte in ditt namn, din e-postadress eller andra direkt identifierande uppgifter i samband med rapportering.</p>

          <h3 style={h3}>2.2 IP-adress (hashad)</h3>
          <p style={p}>Vid rapportering hashar vi din IP-adress med en envägskryptering (SHA-256 med salt). Den hashade IP-adressen används enbart för att förhindra spam genom ratebegränsning (max 5 rapporter per timme). Hashningen innebär att vi inte kan återskapa din faktiska IP-adress. Hashade IP-adresser raderas automatiskt efter 30 dagar.</p>

          <h3 style={h3}>2.3 Platsdata (geolokalisering)</h3>
          <p style={p}>Om du godkänner webbläsarens begäran om platsåtkomst används din position enbart lokalt i din webbläsare för att centrera kartan och visa observationer i din närhet. Din position skickas aldrig till våra servrar och sparas inte.</p>

          <h3 style={h3}>2.4 Sessiondata</h3>
          <p style={p}>Vi använder sessionStorage i din webbläsare för att komma ihåg att du har loggat in med lösenord under pågående session. Denna data lagras enbart lokalt i din webbläsare och raderas när du stänger webbläsarfönstret.</p>

          <h3 style={h3}>2.5 Analysdata</h3>
          <p style={p}>Vi avser att använda Plausible Analytics, ett EU-baserat, cookiefritt och integritetsbevarande analysverktyg. Plausible samlar inte in personuppgifter, använder inga cookies och överför ingen data till tredje part. All data lagras inom EU.</p>

          <h2 style={h2}>3. Rättslig grund för behandling</h2>
          <p style={p}>Vi behandlar personuppgifter baserat på följande rättsliga grunder enligt GDPR:</p>
          <p style={p}><strong style={strong}>Berättigat intresse (artikel 6.1.f):</strong> Behandling av hashade IP-adresser för ratebegränsning baseras på vårt berättigade intresse att upprätthålla tjänstens kvalitet, förhindra missbruk och skydda tjänsten mot spam. Vi har bedömt att detta intresse väger tyngre än den minimala påverkan på den registrerades integritet, givet att IP-adressen hashas med envägskryptering och att hashen raderas automatiskt efter 30 dagar.</p>
          <p style={p}><strong style={strong}>Allmänt intresse (artikel 6.1.e):</strong> Publicering av anonymiserad observationsdata om rovdjur tjänar ett allmänt intresse genom att bidra till allmänhetens säkerhet och kunskap om rovdjursförekomst i Sverige.</p>

          <h2 style={h2}>4. Cookies och spårning</h2>
          <p style={p}>Rovdjursradar använder <strong style={strong}>inga cookies</strong>. Vi sätter inga förstapartscookies och inga tredjepartscookies. Vi använder inga spårningstekniker som pixlar, fingerprinting eller liknande. Plausible Analytics, som vi avser att använda, är cookiefritt och GDPR-konformt utan samtycke.</p>

          <h2 style={h2}>5. Datakällor</h2>
          <p style={p}>Rovdjursradar visar observationsdata från flera källor:</p>
          <p style={p}><strong style={strong}>Officiella data:</strong> Offentligt tillgänglig information från Rovbase (Naturvårdsverket) och länsstyrelserna, publicerad som öppen offentlig data. Vi anger alltid källan.</p>
          <p style={p}><strong style={strong}>Jaktlagsrapporter:</strong> Observationer rapporterade av organiserade jaktlag.</p>
          <p style={p}><strong style={strong}>Crowdsourcade observationer:</strong> Anonymt rapporterade observationer från allmänheten.</p>
          <p style={p}>Alla positioner avrundas till cirka 1 km precision för att skydda både djur och rapportörers integritet.</p>

          <h2 style={h2}>6. Delning av data</h2>
          <p style={p}>Vi delar <strong style={strong}>aldrig personuppgifter</strong> med tredje part.</p>
          <p style={p}>Anonymiserad och aggregerad observationsdata (utan koppling till personuppgifter) kan delas med:</p>
          <p style={p}>— Forskare och universitet för vetenskapliga studier om rovdjursförekomst</p>
          <p style={p}>— Naturvårdsverket, länsstyrelser och andra myndigheter för rovdjursförvaltning</p>
          <p style={p}>— Partnerorganisationer (jaktföreningar, friluftsorganisationer) enligt överenskomna villkor</p>

          <h2 style={h2}>7. Underleverantörer (personuppgiftsbiträden)</h2>
          <p style={p}>Vi använder följande tjänsteleverantörer som kan behandla data på våra vägnar:</p>
          <p style={p}><strong style={strong}>Supabase Inc.</strong> — Databashantering. Data lagras på servrar i EU (Stockholm, eu-north-1). Supabase agerar som personuppgiftsbiträde och har ingått standardavtalsklausuler (SCC) för internationell dataöverföring.</p>
          <p style={p}><strong style={strong}>Vercel Inc.</strong> — Webbhotell och CDN. Vercel levererar webbsidan från sin edge-infrastruktur. Vercel omfattas av EU-US Data Privacy Framework.</p>
          <p style={p}><strong style={strong}>Plausible Insights OÜ</strong> — Webbanalys (planerad). EU-baserat bolag (Estland). Ingen persondata behandlas.</p>

          <h2 style={h2}>8. Internationell dataöverföring</h2>
          <p style={p}>Vår primära databas finns i EU (Stockholm). Vercel kan leverera statiskt innehåll från servrar utanför EU, men ingen persondata överförs i dessa anrop. Hashade IP-adresser lagras enbart i vår EU-baserade databas.</p>

          <h2 style={h2}>9. Lagringstider</h2>
          <p style={p}><strong style={strong}>Observationsdata</strong> (art, plats, tid, typ): Lagras tills vidare, då det utgör en del av en publik kunskapsbas om rovdjursförekomst.</p>
          <p style={p}><strong style={strong}>Hashade IP-adresser:</strong> Raderas automatiskt 30 dagar efter rapporteringstillfället.</p>
          <p style={p}><strong style={strong}>Sessiondata:</strong> Raderas automatiskt när webbläsarfönstret stängs.</p>

          <h2 style={h2}>10. Dina rättigheter enligt GDPR</h2>
          <p style={p}>Som registrerad har du följande rättigheter:</p>
          <p style={p}><strong style={strong}>Rätt till tillgång (artikel 15):</strong> Du har rätt att begära information om vilka personuppgifter vi behandlar om dig. Observera att vi som regel inte kan identifiera enskilda användare, eftersom rapportering är anonym.</p>
          <p style={p}><strong style={strong}>Rätt till rättelse (artikel 16):</strong> Du har rätt att begära rättelse av felaktiga uppgifter.</p>
          <p style={p}><strong style={strong}>Rätt till radering (artikel 17):</strong> Du har rätt att begära radering av dina personuppgifter. Hashade IP-adresser raderas automatiskt efter 30 dagar.</p>
          <p style={p}><strong style={strong}>Rätt till begränsning (artikel 18):</strong> Du har rätt att begära begränsning av behandlingen under vissa omständigheter.</p>
          <p style={p}><strong style={strong}>Rätt att invända (artikel 21):</strong> Du har rätt att invända mot behandling som grundas på berättigat intresse.</p>
          <p style={p}><strong style={strong}>Rätt till dataportabilitet (artikel 20):</strong> Du har rätt att få ut dina uppgifter i ett maskinläsbart format.</p>
          <p style={p}><strong style={strong}>Rätt att klaga:</strong> Du har rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY), Box 8114, 104 20 Stockholm, imy.se.</p>
          <p style={p}>För att utöva dina rättigheter, kontakta oss på <strong style={strong}>info@rovdjursradar.se</strong>.</p>

          <h2 style={h2}>11. Säkerhetsåtgärder</h2>
          <p style={p}>Vi vidtar lämpliga tekniska och organisatoriska åtgärder för att skydda personuppgifter:</p>
          <p style={p}>— All kommunikation sker via HTTPS (TLS-kryptering)</p>
          <p style={p}>— IP-adresser hashas med SHA-256 och kan inte återskapas</p>
          <p style={p}>— Positioner avrundas till cirka 1 km precision</p>
          <p style={p}>— Row Level Security (RLS) skyddar databasen mot obehörig åtkomst</p>
          <p style={p}>— Ratebegränsning förhindrar missbruk</p>
          <p style={p}>— Automatisk radering av hashade IP-adresser efter 30 dagar</p>

          <h2 style={h2}>12. Barn</h2>
          <p style={p}>Rovdjursradar riktar sig inte specifikt till barn under 16 år. Vi samlar inte medvetet in personuppgifter från barn. Tjänsten kräver ingen registrering eller inloggning.</p>

          <h2 style={h2}>13. Ändringar i denna policy</h2>
          <p style={p}>Vi kan uppdatera denna integritetspolicy. Vid väsentliga ändringar kommer vi att meddela detta tydligt på webbplatsen. Den senaste versionen finns alltid tillgänglig på denna sida.</p>

          <h2 style={h2}>14. Kontakt</h2>
          <p style={p}>Om du har frågor om denna integritetspolicy eller vår behandling av personuppgifter, kontakta oss:</p>
          <p style={p}><strong style={strong}>Rovdjursradar</strong></p>
          <p style={p}>E-post: info@rovdjursradar.se</p>
          <p style={p}>Webb: rovdjursradar.se</p>
        </div>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.07)', fontSize: '.65rem', color: '#444' }}>
          Rovdjursradar · Integritetspolicy · Mars 2026
        </div>
      </div>
    </div>
  );
}
