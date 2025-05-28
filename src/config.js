// 📁 config.js

export const SUPABASE_PROJECT_URL = typeof import !== 'undefined' && import.meta?.env?.VITE_SUPABASE_PROJECT_URL
  ? import.meta.env.VITE_SUPABASE_PROJECT_URL
  : "https://edzvwddbrdokwutmxfdx.supabase.co";
export const SUPABASE_API_KEY = import.meta.env.VITE_SUPABASE_API_KEY || import.meta.env.REACT_APP_SUPABASE_API_KEY || "";
export const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "plannerdata";

export const SUPABASE_STORAGE_URL = `${SUPABASE_PROJECT_URL}/storage/v1/object`;
export const SUPABASE_PUBLIC_BASE = `${SUPABASE_STORAGE_URL}/public/${SUPABASE_BUCKET}`;
