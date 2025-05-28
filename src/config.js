export const SUPABASE_PROJECT_URL = "https://edzvwddbrdokwutmxfdx.supabase.co";
export const SUPABASE_API_KEY = process.env.REACT_APP_SUPABASE_API_KEY;
export const SUPABASE_BUCKET = "plannerdata";

export const SUPABASE_STORAGE_URL = `${SUPABASE_PROJECT_URL}/storage/v1/object`;

export const SUPABASE_PUBLIC_BASE = `${SUPABASE_STORAGE_URL}/${SUPABASE_BUCKET}`;
export const SUPABASE_OVERRIDE_UPLOAD_KEY = process.env.REACT_APP_SUPABASE_SERVICE_ROLE;
export const SUPABASE_SERVICE_KEY = process.env.REACT_APP_SUPABASE_SERVICE_ROLE || "";
