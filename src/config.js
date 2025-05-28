// 📁 config.js

export const SUPABASE_PROJECT_URL = typeof window !== 'undefined' && window?.ENV?.VITE_SUPABASE_PROJECT_URL
  ? window.ENV.VITE_SUPABASE_PROJECT_URL
  : "https://edzvwddbrdokwutmxfdx.supabase.co";
export const SUPABASE_API_KEY = typeof process !== 'undefined' ? process.env.REACT_APP_SUPABASE_API_KEY || "" : "";
export const SUPABASE_BUCKET = "plannerdata";

export const SUPABASE_STORAGE_URL = `${SUPABASE_PROJECT_URL}/storage/v1/object`;
export const SUPABASE_PUBLIC_BASE = `${SUPABASE_STORAGE_URL}/public/${SUPABASE_BUCKET}`;
