// src/utils/r2Client.js

const R2_BASE_URL = "https://pub-65122688c07f4edb9f2388c313f85a02.r2.dev";

// ✅ Voor ophalen van JSON-bestanden via fetch (GET)
export async function fetchJSONBestand(naam) {
  const url = `${R2_BASE_URL}/${naam}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bestand ${naam} niet gevonden`);
  return await res.json();
}
