/**
 * Supabase client. Single-user auth + database + file storage.
 *
 * Created from Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 * Returns null when unconfigured so the app still boots in a bare dev
 * environment; the repo layer (Phase 1) chooses Supabase vs the local dev
 * store based on this.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;

export const isSupabaseConfigured = (): boolean => supabase !== null;
