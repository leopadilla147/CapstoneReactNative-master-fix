import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://uavahrbpauntxkngqzza.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhdmFocmJwYXVudHhrbmdxenphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDYwMTYsImV4cCI6MjA3Mjk4MjAxNn0.D2RXM3_06PE2exCjZBp3zhglqX0Kv38FmP_-RsM98wk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});