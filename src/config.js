// 📁 config.js
export const SUPABASE_PROJECT_URL = "https://edzvwddbrdokwutmxfdx.supabase.co";
export const SUPABASE_API_KEY = "YOUR_REAL_ANON_KEY_HERE"; // <-- vervang dit veilig in .env of Vercel
export const SUPABASE_BUCKET = "plannerdata";

export const SUPABASE_STORAGE_URL = `${SUPABASE_PROJECT_URL}/storage/v1/object`;
export const SUPABASE_PUBLIC_BASE = `${SUPABASE_STORAGE_URL}/public/${SUPABASE_BUCKET}`;
