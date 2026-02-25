import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn(
    "Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
  );
}

// Create the Supabase client without strict typing to avoid insert/update type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return isConfigured;
};
