// src/utils/r2ClientUpload.js

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: "https://48b3ca960ac98a5b99df6b74d8cf4b3e.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "06b21b255faeafccee2aaae9d42fa93e",
    secretAccessKey: "c4475ecaa6399f32ba8814bbdf8d46e91cc0e8fc7828d48688212cfb9905a67c"
  }
});

export async function uploadJSONBestandS3(naam, inhoud) {
  const params = {
    Bucket: "vincenzo-uploads",
    Key: naam,
    Body: JSON.stringify(inhoud, null, 2),
    ContentType: "application/json"
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
    console.log(`✅ Upload van ${naam} naar R2 succesvol`);
  } catch (err) {
    console.error(`❌ Upload van ${naam} mislukt:`, err);
    throw err;
  }
}
