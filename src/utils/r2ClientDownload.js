export async function fetchJSONBestandS3(naam) {
  const url = `https://vincenzo-uploads.48b3ca960ac98a5b99df6b74d8cf4b3e.r2.cloudflarestorage.com/${naam}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fout bij ophalen van ${naam}: ${res.statusText}`);
  return res.json();
}
