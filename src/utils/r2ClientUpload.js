// src/utils/r2ClientUpload.js

export async function uploadJSONBestandS3(naam, inhoud) {
  const response = await fetch(`https://planner-upload.herman-48b.workers.dev/upload/${naam}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(inhoud, null, 2)
  });

  if (!response.ok) {
    const tekst = await response.text();
    throw new Error(`Upload mislukt (${response.status}): ${tekst}`);
  }

  console.log(`✅ Upload van ${naam} via Worker succesvol`);
}


export async function fetchJSONBestandS3(naam) {
  const url = `https://planner-upload.herman-48b.workers.dev/upload/${naam}?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fout bij ophalen van ${naam}: ${res.statusText}`);
  return res.json();
}