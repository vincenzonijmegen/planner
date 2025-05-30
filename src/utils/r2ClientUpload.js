// src/utils/r2ClientUpload.js

export async function uploadJSONBestandS3(naam, inhoud) {
  const url = `https://planner-upload.herman-48b.workers.dev/upload/${naam}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(inhoud, null, 2)
  });

  if (!response.ok) {
    const tekst = await response.text();
    console.error(`❌ Upload van ${naam} mislukt:`, tekst);
    throw new Error(`Upload mislukt (${response.status}): ${tekst}`);
  }

  console.log(`✅ Upload van ${naam} via Worker succesvol`);
}

export async function fetchJSONBestandS3(naam) {
  const url = `https://pub-65122688c07f4edb9f2388c313f85a02.r2.dev/${naam}?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fout bij ophalen van ${naam}: ${res.statusText}`);
  return res.json();
}
