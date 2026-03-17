/**
 * Rovdjursradar — Trust Layer Auto-Patcher
 * 
 * HOW TO USE:
 * 1. Put this file in the ROOT of your rovdjursradar project
 * 2. Open Terminal / Command Prompt
 * 3. cd into your project folder
 * 4. Run: node patch-trust-layer.js
 * 5. Done! Open GitHub Desktop, commit, push.
 * 
 * This script makes exactly 4 changes to components/MapApp.tsx:
 *   - Adds 2 import lines
 *   - Adds the useGeolocation() hook
 *   - Adds 4 trust fields to the POST body
 *   - Adds TrustScorePanel to the report drawer
 */

const fs = require('fs');
const path = require('path');

const MAPAPP_PATH = path.join(__dirname, 'components', 'MapApp.tsx');

// Check file exists
if (!fs.existsSync(MAPAPP_PATH)) {
  console.error('❌ Could not find components/MapApp.tsx');
  console.error('   Make sure you run this script from your project root folder.');
  process.exit(1);
}

let code = fs.readFileSync(MAPAPP_PATH, 'utf-8');
const original = code;
let changes = 0;

// ─── EDIT 1: Add imports ───
const importTarget = `import { SPECIES, OBS_TYPES, SOURCES, COUNTIES, TILE_LAYERS, timeAgo, distKm } from '@/lib/config';`;
const importReplacement = `import { SPECIES, OBS_TYPES, SOURCES, COUNTIES, TILE_LAYERS, timeAgo, distKm } from '@/lib/config';
import { useGeolocation } from '@/hooks/useGeolocation';
import TrustScorePanel from '@/components/TrustScorePanel';`;

if (code.includes(`import { useGeolocation }`)) {
  console.log('⏭  Edit 1 (imports): Already applied, skipping');
} else if (code.includes(importTarget)) {
  code = code.replace(importTarget, importReplacement);
  changes++;
  console.log('✅ Edit 1: Added useGeolocation + TrustScorePanel imports');
} else {
  console.error('❌ Edit 1: Could not find import line to patch. Check MapApp.tsx manually.');
}

// ─── EDIT 2: Add geo hook ───
const hookTarget = `  const mapRef = useRef<L.Map | null>(null);`;
const hookReplacement = `  const geo = useGeolocation();
  const mapRef = useRef<L.Map | null>(null);`;

if (code.includes(`const geo = useGeolocation()`)) {
  console.log('⏭  Edit 2 (geo hook): Already applied, skipping');
} else if (code.includes(hookTarget)) {
  code = code.replace(hookTarget, hookReplacement);
  changes++;
  console.log('✅ Edit 2: Added useGeolocation() hook');
} else {
  console.error('❌ Edit 2: Could not find mapRef line to patch.');
}

// ─── EDIT 3: Add trust data to POST body ───
const trustFields = ', device_type: geo.deviceType, gps_accuracy: geo.accuracy, user_lat: geo.lat, user_lng: geo.lng';

if (code.includes('device_type: geo.deviceType')) {
  console.log('⏭  Edit 3 (POST body): Already applied, skipping');
} else {
  // Find "notes: rptNotes || null" and add trust fields after it
  // This works regardless of formatting (single line, multi line, any indentation)
  const notesPattern = /notes:\s*rptNotes\s*\|\|\s*null/;
  const match = code.match(notesPattern);
  if (match) {
    const idx = code.indexOf(match[0]);
    const insertAt = idx + match[0].length;
    // Check what comes next: comma, whitespace, closing brace, etc.
    const after = code.substring(insertAt, insertAt + 5).trimStart();
    if (after.startsWith(',')) {
      // Already has comma: notes: rptNotes || null, ...
      // Insert after the comma
      const commaIdx = code.indexOf(',', insertAt);
      code = code.substring(0, commaIdx + 1) + trustFields + code.substring(commaIdx + 1);
    } else {
      // No comma yet: notes: rptNotes || null })
      code = code.substring(0, insertAt) + trustFields + code.substring(insertAt);
    }
    changes++;
    console.log('✅ Edit 3: Added trust data to POST body');
  } else {
    console.error('❌ Edit 3: Could not find "notes: rptNotes || null" in submitReport.');
    console.error('   Manually add these fields to your POST body:');
    console.error('   device_type: geo.deviceType, gps_accuracy: geo.accuracy, user_lat: geo.lat, user_lng: geo.lng');
  }
}

// ─── EDIT 4: Add TrustScorePanel to report drawer JSX ───
// Look for the submit button in the report form
const panelLine = `<TrustScorePanel geo={geo} reportLat={reportLL?.lat ?? null} reportLng={reportLL?.lng ?? null} />`;

if (code.includes('<TrustScorePanel')) {
  console.log('⏭  Edit 4 (TrustScorePanel JSX): Already applied, skipping');
} else {
  // Try multiple patterns for the submit button
  const buttonPatterns = [
    `<button onClick={submitReport} className="w-full py-2.5 rounded-lg bg-[#2D5016]`,
    `<button onClick={submitReport} className="w-full py-2.5`,
    `<button onClick={submitReport}`,
  ];

  let found = false;
  for (const pattern of buttonPatterns) {
    if (code.includes(pattern)) {
      code = code.replace(pattern, `          ${panelLine}\n          ${pattern}`);
      changes++;
      found = true;
      console.log('✅ Edit 4: Added TrustScorePanel above submit button');
      break;
    }
  }

  if (!found) {
    // Try finding "Skicka rapport" button text
    const skickaIdx = code.indexOf('Skicka rapport');
    if (skickaIdx !== -1) {
      // Find the <button before it
      const before = code.lastIndexOf('<button', skickaIdx);
      if (before !== -1) {
        // Find the start of this line
        const lineStart = code.lastIndexOf('\n', before) + 1;
        const indent = code.substring(lineStart, before);
        code = code.substring(0, lineStart) + indent + panelLine + '\n' + code.substring(lineStart);
        changes++;
        found = true;
        console.log('✅ Edit 4: Added TrustScorePanel above submit button (found via "Skicka rapport")');
      }
    }
  }

  if (!found) {
    console.error('❌ Edit 4: Could not find submit button to insert TrustScorePanel.');
    console.error('   Manually add this line above your submit button in the report drawer:');
    console.error(`   ${panelLine}`);
  }
}

// ─── Save ───
if (changes > 0) {
  // Backup
  const backupPath = MAPAPP_PATH + '.backup';
  fs.writeFileSync(backupPath, original, 'utf-8');
  console.log(`\n💾 Backup saved: ${backupPath}`);

  // Write patched file
  fs.writeFileSync(MAPAPP_PATH, code, 'utf-8');
  console.log(`✅ Patched MapApp.tsx (${changes} edit${changes > 1 ? 's' : ''} applied)`);
  console.log('\n🎉 Done! Open GitHub Desktop, commit all changes, and push.');
} else {
  console.log('\nNo changes made — trust layer may already be installed.');
}
