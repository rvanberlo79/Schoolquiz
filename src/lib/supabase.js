import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create client with empty strings if env vars are missing (for development)
// This allows the app to load even without Supabase configured
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

/** Base URL for Supabase API (e.g. for Edge Function calls where we need to read error body). */
export const getSupabaseUrl = () => supabaseUrl?.trim() ? supabaseUrl.replace(/\/$/, '') : ''

/** Anon key for Edge Function requests (apikey header). Required by Supabase gateway with user JWT. */
export const getSupabaseAnonKey = () => supabaseAnonKey?.trim() || ''

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && 
           supabaseUrl.trim() !== '' && 
           supabaseAnonKey.trim() !== '' &&
           !supabaseUrl.includes('placeholder') &&
           !supabaseAnonKey.includes('placeholder'))
}

