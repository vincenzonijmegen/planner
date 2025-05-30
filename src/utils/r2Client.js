const R2_BASE_URL = "https://pub-65122688c07f4edb9f2388c313f85a02.r2.dev";

export async function fetchJSONBestand(naam) {
  const url = `${R2_BASE_URL}/${naam}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bestand ${naam} niet gevonden`);
  return await res.json();
}

export async function uploadJSONBestand(naam, inhoud) {
  const url = `${R2_BASE_URL}/${naam}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(inhoud, null, 2)
  });
  if (!res.ok) throw new Error(`Upload van ${naam} mislukt`);
}
