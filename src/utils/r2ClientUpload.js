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


export async function uploadJSONBestandS3(naam, inhoud) {
  console.log("📤 Upload naar R2:", naam, inhoud); // ✅ zie wat je verstuurt

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
